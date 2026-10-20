import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth';

@Component({
  selector: 'yko-forgot-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.css',
})
export class ForgotPasswordPage {
  private readonly authService = inject(AuthService);

  identifier = '';

  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    if (this.loading() || !this.identifier.trim()) {
      return;
    }

    this.errorMessage.set('');
    this.loading.set(true);

    this.authService.forgotPassword(this.identifier).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo conectar con el servidor. Inténtalo de nuevo.');
      },
    });
  }
}
