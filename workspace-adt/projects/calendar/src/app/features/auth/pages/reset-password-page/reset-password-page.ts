import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth';
import { toApiError } from '../../../../core/http/api-error';

@Component({
  selector: 'yko-reset-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.css',
})
export class ResetPasswordPage {
  private readonly authService = inject(AuthService);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  readonly hasToken = this.token.length > 0;

  newPassword = '';
  confirmPassword = '';

  readonly loading = signal(false);
  readonly done = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    if (this.loading()) {
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.errorMessage.set('');
    this.loading.set(true);

    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (error: unknown) => {
        this.loading.set(false);

        this.errorMessage.set(
          toApiError(error).status === 400
            ? 'El enlace no es válido o ha caducado. Solicita uno nuevo.'
            : 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
        );
      },
    });
  }
}
