import { Injectable, computed, signal } from '@angular/core';

import { User, UserRole } from './user.model';

interface LoginCredentials {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserState = signal<User | null>(this.loadStoredUser());

  readonly currentUser = this.currentUserState.asReadonly();

  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  readonly isAdmin = computed(() => this.currentUserState()?.role === 'ADMIN');

  login(username: string, password: string): boolean {
    const user = this.findUser({
      username: username.trim(),
      password,
    });

    if (!user) {
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

  hasRole(role: UserRole): boolean {
    return this.currentUserState()?.role === role;
  }

  private findUser(credentials: LoginCredentials): User | null {
    const users: Array<LoginCredentials & { user: User }> = [
      {
        username: 'admin',
        password: 'admin',
        user: {
          id: '1',
          username: 'admin',
          displayName: 'Adrián Delgado',
          email: 'admin@example.com',
          role: 'ADMIN',
          active: true,
        },
      },
      {
        username: 'maria',
        password: 'maria',
        user: {
          id: '2',
          username: 'maria',
          displayName: 'María García',
          email: 'maria@example.com',
          role: 'USER',
          active: true,
        },
      },
      {
        username: 'carlos',
        password: 'carlos',
        user: {
          id: '3',
          username: 'carlos',
          displayName: 'Carlos Martín',
          email: 'carlos@example.com',
          role: 'USER',
          active: true,
        },
      },
    ];

    const match = users.find(
      (item) =>
        item.username === credentials.username &&
        item.password === credentials.password &&
        item.user.active,
    );

    return match?.user ?? null;
  }

  private loadStoredUser(): User | null {
    const storedUser = sessionStorage.getItem('yko-user');

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      sessionStorage.removeItem('yko-user');
      return null;
    }
  }
}
