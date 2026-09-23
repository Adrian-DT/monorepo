import { Injectable, computed, inject, signal } from '@angular/core';

import { UserService } from '../../features/administration/users/services/user.service';
import { User } from './user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
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

    return true;
  }

  logout(): void {
    this.currentUserState.set(null);
    sessionStorage.removeItem('yko-user');
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
