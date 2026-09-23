import { Injectable, computed, signal, inject } from '@angular/core';

import { User, UserRole } from '../../../../core/auth/user.model';

import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/http/api.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiService = inject(ApiService);
  private readonly usersState = signal<User[]>([
    {
      id: '1',
      username: 'admin',
      displayName: 'Adrián Delgado',
      email: 'admin@example.com',
      role: 'ADMIN',
      active: true,
    },
    {
      id: '2',
      username: 'maria',
      displayName: 'María García',
      email: 'maria@example.com',
      role: 'USER',
      active: true,
    },
    {
      id: '3',
      username: 'carlos',
      displayName: 'Carlos Martín',
      email: 'carlos@example.com',
      role: 'USER',
      active: true,
    },
  ]);

  readonly users = this.usersState.asReadonly();

  readonly activeUsers = computed(() => this.usersState().filter((user) => user.active));

  readonly administrators = computed(() =>
    this.usersState().filter((user) => user.role === 'ADMIN' && user.active),
  );

  loadFromApi(): Observable<User[]> {
    return this.apiService.get<User[]>('users');
  }

  createInApi(user: Omit<User, 'id'>): Observable<User> {
    return this.apiService.post<User>('users', user);
  }

  updateInApi(userId: string, changes: Partial<Omit<User, 'id'>>): Observable<User> {
    return this.apiService.put<User>(`users/${userId}`, changes);
  }

  deleteFromApi(userId: string): Observable<void> {
    return this.apiService.delete<void>(`users/${userId}`);
  }

  getById(userId: string): User | undefined {
    return this.usersState().find((user) => user.id === userId);
  }

  getByUsername(username: string): User | undefined {
    return this.usersState().find((user) => user.username.toLowerCase() === username.toLowerCase());
  }

  getUsersByRole(role: UserRole): User[] {
    return this.usersState().filter((user) => user.role === role);
  }

  addUser(user: Omit<User, 'id'>): User {
    const usernameExists = this.usersState().some(
      (item) => item.username.toLowerCase() === user.username.toLowerCase(),
    );

    if (usernameExists) {
      throw new Error('Ya existe un usuario con ese nombre de usuario.');
    }

    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
    };

    this.usersState.update((users) => [...users, newUser]);

    return newUser;
  }

  updateUser(userId: string, changes: Partial<Omit<User, 'id'>>): boolean {
    const currentUser = this.getById(userId);

    if (!currentUser) {
      return false;
    }

    if (changes.username && !this.isUsernameAvailable(changes.username, userId)) {
      return false;
    }

    if (changes.email && !this.isEmailAvailable(changes.email, userId)) {
      return false;
    }

    if (changes.role && !this.canChangeRole(userId, changes.role)) {
      return false;
    }

    this.usersState.update((users) =>
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...changes,
            }
          : user,
      ),
    );

    return true;
  }

  setActive(userId: string, active: boolean): boolean {
    if (!active && !this.canDeactivateUser(userId)) {
      return false;
    }

    this.updateUser(userId, { active });

    return true;
  }

  deleteUser(userId: string): void {
    this.usersState.update((users) => users.filter((user) => user.id !== userId));
  }

  getRoleLabel(role: UserRole): string {
    return role === 'ADMIN' ? 'Administrador' : 'Usuario';
  }

  isUsernameAvailable(username: string, excludeUserId?: string): boolean {
    const normalizedUsername = username.trim().toLowerCase();

    return !this.usersState().some(
      (user) => user.username.toLowerCase() === normalizedUsername && user.id !== excludeUserId,
    );
  }

  isEmailAvailable(email: string, excludeUserId?: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();

    return !this.usersState().some(
      (user) => user.email.toLowerCase() === normalizedEmail && user.id !== excludeUserId,
    );
  }

  canDeactivateUser(userId: string): boolean {
    const user = this.getById(userId);

    if (!user || !user.active) {
      return false;
    }

    const activeAdministrators = this.usersState().filter(
      (item) => item.active && item.role === 'ADMIN',
    );

    return !(user.role === 'ADMIN' && activeAdministrators.length === 1);
  }

  canChangeRole(userId: string, newRole: UserRole): boolean {
    const user = this.getById(userId);

    if (!user || user.role !== 'ADMIN') {
      return true;
    }

    if (newRole === 'ADMIN') {
      return true;
    }

    const activeAdministrators = this.usersState().filter(
      (item) => item.active && item.role === 'ADMIN',
    );

    return activeAdministrators.length > 1;
  }
}
