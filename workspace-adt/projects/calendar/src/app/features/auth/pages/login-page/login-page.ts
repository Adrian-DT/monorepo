import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth';
import { toApiError } from '../../../../core/http/api-error';

@Component({
  selector: 'yko-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';

  readonly errorMessage = signal('');
  readonly loading = signal(false);

  login(): void {
    if (this.loading()) {
      return;
    }

    this.errorMessage.set('');
    this.loading.set(true);

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/calendar']);
      },
      error: (error: unknown) => {
        this.loading.set(false);

        this.errorMessage.set(
          toApiError(error).status === 401
            ? 'Usuario o contraseña incorrectos.'
            : 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
        );
      },
    });
  }
}
