import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable, tap } from 'rxjs';

import {
  CreateUserResult,
  InvitationResult,
  User,
  UserRequest,
  UserSummary,
} from '../../../../core/auth/user.model';
import { ApiService } from '../../../../core/http/api.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiService = inject(ApiService);

  private readonly usersState = signal<User[]>([]);
  private readonly activeUsersState = signal<UserSummary[]>([]);

  private adminMode = false;

  readonly users = this.usersState.asReadonly();

  readonly activeUsers = this.activeUsersState.asReadonly();

  readonly administrators = computed(() =>
    this.usersState().filter((user) => user.role === 'ADMIN' && user.active),
  );

  load(isAdmin: boolean): void {
    this.adminMode = isAdmin;

    this.apiService.get<UserSummary[]>('users').subscribe({
      next: (users) => this.activeUsersState.set(users),
      error: () => this.activeUsersState.set([]),
    });

    if (isAdmin) {
      this.apiService.get<User[]>('admin/users').subscribe({
        next: (users) => this.usersState.set(users),
        error: () => this.usersState.set([]),
      });
    } else {
      this.usersState.set([]);
    }
  }

  clear(): void {
    this.adminMode = false;
    this.usersState.set([]);
    this.activeUsersState.set([]);
  }

  create(request: UserRequest): Observable<CreateUserResult> {
    return this.apiService
      .post<CreateUserResult>('admin/users', request)
      .pipe(tap(() => this.load(this.adminMode)));
  }

  update(userId: string, request: UserRequest): Observable<User> {
    return this.apiService
      .put<User>(`admin/users/${userId}`, request)
      .pipe(tap(() => this.load(this.adminMode)));
  }

  setActive(userId: string, active: boolean): Observable<User> {
    return this.apiService
      .patch<User>(`admin/users/${userId}/active`, { active })
      .pipe(tap(() => this.load(this.adminMode)));
  }

  invite(userId: string): Observable<InvitationResult> {
    return this.apiService.post<InvitationResult>(`admin/users/${userId}/invite`, {});
  }

  getById(userId: string): User | undefined {
    return this.usersState().find((user) => user.id === userId);
  }
}
