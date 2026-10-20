import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { User } from '../../../../core/auth/user.model';
import { UserService } from './user.service';

const maria: User = {
  id: 'u2',
  username: 'maria',
  displayName: 'María',
  email: 'maria@example.com',
  role: 'USER',
  active: true,
};

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => http.verify());

  it('loads active users and the admin list for administrators', () => {
    service.load(true);

    http.expectOne(`${baseUrl}/users`).flush([{ id: 'u2', username: 'maria', displayName: 'María' }]);
    http.expectOne(`${baseUrl}/admin/users`).flush([maria]);

    expect(service.activeUsers().length).toBe(1);
    expect(service.users()).toEqual([maria]);
  });

  it('loads only active users for regular users', () => {
    service.load(false);

    http.expectOne(`${baseUrl}/users`).flush([]);
    http.expectNone(`${baseUrl}/admin/users`);

    expect(service.users()).toEqual([]);
  });

  it('reloads the lists after creating a user', () => {
    service.load(true);
    http.expectOne(`${baseUrl}/users`).flush([]);
    http.expectOne(`${baseUrl}/admin/users`).flush([]);

    let invitationSent = false;

    service
      .create({
        username: 'maria',
        displayName: 'María',
        email: 'maria@example.com',
        role: 'USER',
      })
      .subscribe((result) => (invitationSent = result.invitationSent));

    http
      .expectOne({ method: 'POST', url: `${baseUrl}/admin/users` })
      .flush({ user: maria, invitationSent: true });

    http.expectOne(`${baseUrl}/users`).flush([]);
    http.expectOne({ method: 'GET', url: `${baseUrl}/admin/users` }).flush([maria]);

    expect(invitationSent).toBe(true);
    expect(service.users()).toEqual([maria]);
  });

  it('sends active changes with PATCH', () => {
    service.setActive('u2', false).subscribe();

    const request = http.expectOne({
      method: 'PATCH',
      url: `${baseUrl}/admin/users/u2/active`,
    });

    expect(request.request.body).toEqual({ active: false });

    request.flush({ ...maria, active: false });
    http.expectOne(`${baseUrl}/users`).flush([]);
  });

  it('clears both lists', () => {
    service.load(true);
    http.expectOne(`${baseUrl}/users`).flush([{ id: 'u2', username: 'maria', displayName: 'M' }]);
    http.expectOne(`${baseUrl}/admin/users`).flush([maria]);

    service.clear();

    expect(service.users()).toEqual([]);
    expect(service.activeUsers()).toEqual([]);
  });
});
