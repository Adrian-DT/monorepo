import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable, catchError, map, of, tap } from 'rxjs';

import { LoginRequest, LoginResponse } from '../../features/auth/models/login.model';
import { UserService } from '../../features/administration/users/services/user.service';
import { ApiService } from '../http/api.service';
import { HolidaysService } from '../../features/administration/holidays/services/holidays.service';
import { VacationsService } from '../../features/vacations/services/vacations.service';
import { User } from './user.model';

const TOKEN_KEY = 'yko-access-token';
const USER_KEY = 'yko-user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly userService = inject(UserService);
  private readonly holidaysService = inject(HolidaysService);
  private readonly vacationsService = inject(VacationsService);

  readonly accessToken = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));

  private readonly currentUserState = signal<User | null>(this.loadStoredUser());

  readonly currentUser = this.currentUserState.asReadonly();

  readonly isAuthenticated = computed(
    () => this.currentUserState() !== null && this.accessToken() !== null,
  );

  readonly isAdmin = computed(() => this.currentUserState()?.role === 'ADMIN');

  login(username: string, password: string): Observable<User> {
    const request: LoginRequest = { username: username.trim(), password };

    return this.apiService.post<LoginResponse>('auth/login', request).pipe(
      tap((response) => this.startSession(response.accessToken, response.user)),
      map((response) => response.user),
    );
  }

  restoreSession(): Observable<void> {
    const token = this.accessToken();

    if (!token) {
      this.clearSession();

      return of(undefined);
    }

    return this.apiService.get<User>('auth/me').pipe(
      tap((user) => this.startSession(token, user)),
      map(() => undefined),
      catchError(() => {
        this.clearSession();

        return of(undefined);
      }),
    );
  }

  logout(): void {
    this.clearSession();
  }

  forgotPassword(identifier: string): Observable<void> {
    return this.apiService.post<void>('auth/forgot-password', {
      identifier: identifier.trim(),
    });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.apiService.post<void>('auth/reset-password', { token, newPassword });
  }

  hasRole(role: 'USER' | 'ADMIN'): boolean {
    return this.currentUserState()?.role === role;
  }

  private startSession(token: string, user: User): void {
    this.accessToken.set(token);
    sessionStorage.setItem(TOKEN_KEY, token);

    this.currentUserState.set(user);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));

    this.userService.load(user.role === 'ADMIN');
    this.holidaysService.load();
    this.vacationsService.load();
  }

  private clearSession(): void {
    this.accessToken.set(null);
    sessionStorage.removeItem(TOKEN_KEY);

    this.currentUserState.set(null);
    sessionStorage.removeItem(USER_KEY);

    this.userService.clear();
    this.holidaysService.clear();
    this.vacationsService.clear();
  }

  private loadStoredUser(): User | null {
    const storedUser = sessionStorage.getItem(USER_KEY);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      sessionStorage.removeItem(USER_KEY);

      return null;
    }
  }
}
