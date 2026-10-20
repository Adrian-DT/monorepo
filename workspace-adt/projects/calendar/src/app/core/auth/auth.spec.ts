import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../config/api.config';
import { authInterceptor } from '../http/auth.interceptor';
import { AuthService } from './auth';
import { User } from './user.model';

const admin: User = {
  id: 'u1',
  username: 'admin',
  displayName: 'Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  active: true,
};

const regular: User = { ...admin, id: 'u2', username: 'maria', role: 'USER' };

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let baseUrl: string;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  }

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('starts unauthenticated', () => {
    setup();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
  });

  it('logs in against the backend and stores the session', () => {
    setup();

    service.login(' admin ', 'secret').subscribe();

    const request = http.expectOne(`${baseUrl}/auth/login`);
    expect(request.request.body).toEqual({ username: 'admin', password: 'secret' });

    request.flush({ accessToken: 'jwt', tokenType: 'Bearer', expiresInSeconds: 60, user: admin });

    http.expectOne(`${baseUrl}/users`).flush([]);
    http.expectOne(`${baseUrl}/admin/users`).flush([admin]);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(sessionStorage.getItem('yko-access-token')).toBe('jwt');
    expect(JSON.parse(sessionStorage.getItem('yko-user') ?? '{}').username).toBe('admin');
  });

  it('does not load the admin user list for regular users', () => {
    setup();

    service.login('maria', 'secret').subscribe();

    http
      .expectOne(`${baseUrl}/auth/login`)
      .flush({ accessToken: 'jwt', tokenType: 'Bearer', expiresInSeconds: 60, user: regular });

    http.expectOne(`${baseUrl}/users`).flush([]);
    http.expectNone(`${baseUrl}/admin/users`);

    expect(service.isAdmin()).toBe(false);
  });

  it('keeps the session cleared when login fails', () => {
    setup();

    let failed = false;
    service.login('admin', 'wrong').subscribe({ error: () => (failed = true) });

    http
      .expectOne(`${baseUrl}/auth/login`)
      .flush({ detail: 'Invalid' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('yko-access-token')).toBeNull();
  });

  it('restores a stored session through /auth/me', () => {
    sessionStorage.setItem('yko-access-token', 'jwt');
    sessionStorage.setItem('yko-user', JSON.stringify(admin));
    setup();

    service.restoreSession().subscribe();

    const request = http.expectOne(`${baseUrl}/auth/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt');
    request.flush(admin);

    http.expectOne(`${baseUrl}/users`).flush([]);
    http.expectOne(`${baseUrl}/admin/users`).flush([admin]);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('clears an invalid stored session on restore', () => {
    sessionStorage.setItem('yko-access-token', 'expired');
    sessionStorage.setItem('yko-user', JSON.stringify(admin));
    setup();

    service.restoreSession().subscribe();

    http
      .expectOne(`${baseUrl}/auth/me`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('yko-access-token')).toBeNull();
  });

  it('logs out when any authenticated request returns 401', () => {
    sessionStorage.setItem('yko-access-token', 'jwt');
    sessionStorage.setItem('yko-user', JSON.stringify(regular));
    setup();

    TestBed.inject(AuthService);
    service.login('maria', 'x').subscribe({ error: () => undefined });

    http
      .expectOne(`${baseUrl}/auth/login`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBe(false);
  });

  it('sends forgot and reset password requests', () => {
    setup();

    service.forgotPassword(' maria ').subscribe();
    const forgot = http.expectOne(`${baseUrl}/auth/forgot-password`);
    expect(forgot.request.body).toEqual({ identifier: 'maria' });
    forgot.flush(null, { status: 204, statusText: 'No Content' });

    service.resetPassword('tok', 'newSecret1').subscribe();
    const reset = http.expectOne(`${baseUrl}/auth/reset-password`);
    expect(reset.request.body).toEqual({ token: 'tok', newPassword: 'newSecret1' });
    reset.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('logout clears the session', () => {
    sessionStorage.setItem('yko-access-token', 'jwt');
    sessionStorage.setItem('yko-user', JSON.stringify(admin));
    setup();

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('yko-user')).toBeNull();
  });
});
