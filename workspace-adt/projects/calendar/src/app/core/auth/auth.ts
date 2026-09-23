import { Injectable, computed, inject, signal } from '@angular/core';

import { UserService } from '../../features/administration/users/services/user.service';
import { User } from './user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly accessToken = signal<string | null>(sessionStorage.getItem('yko-access-token'));
  private readonly userService = inject(UserService);

  private readonly currentUserState = signal<User | null>(this.loadStoredUser());

  readonly currentUser = this.currentUserState.asReadonly();

  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  readonly isAdmin = computed(() => this.currentUserState()?.role === 'ADMIN');

  login(username: string, password: string): boolean {
    const user = this.userService.getByUsername(username.trim());

    const validPassword = password === user?.username;

    if (!user || !validPassword || !user.active) {
      this.currentUserState.set(null);
      sessionStorage.removeItem('yko-user');

      return false;
    }

    this.currentUserState.set(user);

    sessionStorage.setItem('yko-user', JSON.stringify(user));

    const temporaryToken = `dev-token-${user.id}`;

    this.accessToken.set(temporaryToken);

    sessionStorage.setItem('yko-access-token', temporaryToken);

    return true;
  }

  logout(): void {
    this.currentUserState.set(null);
    sessionStorage.removeItem('yko-user');

    this.accessToken.set(null);
    sessionStorage.removeItem('yko-access-token');
  }

  hasRole(role: 'USER' | 'ADMIN'): boolean {
    return this.currentUserState()?.role === role;
  }

  private loadStoredUser(): User | null {
    const storedUser = sessionStorage.getItem('yko-user');

    if (!storedUser) {
      return null;
    }

    try {
      const user = JSON.parse(storedUser) as User;

      const currentUser = this.userService.getById(user.id);

      return currentUser?.active ? currentUser : null;
    } catch {
      sessionStorage.removeItem('yko-user');
      return null;
    }
  }
}
