import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth';

@Component({
  selector: 'yko-login-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  errorMessage = '';

  login(): void {
    this.errorMessage = '';

    const authenticated = this.authService.login(this.username, this.password);

    if (!authenticated) {
      this.errorMessage = 'Usuario o contraseña incorrectos.';
      return;
    }

    this.router.navigate(['/calendar']);
  }
}
