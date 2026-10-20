import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree, provideRouter } from '@angular/router';

import { adminGuard } from './admin-guard';
import { AuthService } from './auth';

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  function setup(isAdmin: boolean): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { hasRole: () => isAdmin } },
      ],
    });
  }

  it('allows administrators', () => {
    setup(true);

    expect(executeGuard({} as never, {} as never)).toBe(true);
  });

  it('redirects regular users to the calendar', () => {
    setup(false);

    const result = executeGuard({} as never, {} as never) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/calendar');
  });
});
