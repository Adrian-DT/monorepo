import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';

import { AuthService } from '../../auth/auth';

@Component({
  selector: 'yko-user-menu',
  standalone: true,
  imports: [],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.css',
})
export class UserMenu {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
