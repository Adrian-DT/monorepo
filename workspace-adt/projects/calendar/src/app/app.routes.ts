import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { adminGuard } from './core/auth/admin-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page').then(
        (component) => component.LoginPage,
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password-page/forgot-password-page').then(
        (component) => component.ForgotPasswordPage,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell').then((component) => component.AppShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'calendar',
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/pages/calendar-page/calendar-page').then(
            (component) => component.CalendarPage,
          ),
      },
      {
        path: 'vacations',
        loadComponent: () =>
          import('./features/vacations/pages/my-vacation-page/my-vacation-page').then(
            (component) => component.MyVacationPage,
          ),
      },
      {
        path: 'on-call',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/on-call/pages/on-call-page/on-call-page').then(
            (component) => component.OnCallPage,
          ),
      },
      {
        path: 'interventions',
        loadComponent: () =>
          import('./features/interventions/pages/interventions-page/interventions-page').then(
            (component) => component.InterventionsPage,
          ),
      },
      {
        path: 'statistics',
        loadComponent: () =>
          import('./features/statistics/pages/statistics-page/statistics-page').then(
            (component) => component.StatisticsPage,
          ),
      },
      {
        path: 'administration',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/administration/pages/administration-page/administration-page').then(
            (component) => component.AdministrationPage,
          ),
      },
      {
        path: 'administration/vacations',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/vacations/pages/vacation-management-page/vacation-management-page').then(
            (component) => component.VacationManagementPage,
          ),
      },
      {
        path: 'administration/holidays',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/administration/holidays/pages/holiday-management-page/holiday-management-page').then(
            (component) => component.HolidayManagementPage,
          ),
      },
      {
        path: 'administration/users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/administration/users/pages/user-list-page/user-list-page').then(
            (component) => component.UserListPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
