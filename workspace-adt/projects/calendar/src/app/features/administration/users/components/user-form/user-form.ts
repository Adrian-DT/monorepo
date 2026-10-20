import { Component, effect, inject, input, output, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { User, UserRole } from '../../../../../core/auth/user.model';
import { toApiError } from '../../../../../core/http/api-error';
import { UserService } from '../../services/user.service';

export interface UserSavedEvent {
  user: User;
  created: boolean;
  invitationSent: boolean;
}

@Component({
  selector: 'yko-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly user = input<User | null>(null);

  readonly saved = output<UserSavedEvent>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(40),
        Validators.pattern(/^[a-zA-Z0-9._-]+$/),
      ],
    ],
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    role: ['USER' as UserRole, Validators.required],
  });

  constructor() {
    effect(() => {
      const user = this.user();

      this.form.reset({
        username: user?.username ?? '',
        displayName: user?.displayName ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'USER',
      });

      this.errorMessage.set('');
    });
  }

  get editing(): boolean {
    return this.user() !== null;
  }

  submit(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const currentUser = this.user();

    const request = {
      username: value.username.trim(),
      displayName: value.displayName.trim(),
      email: value.email.trim(),
      role: value.role,
    };

    this.saving.set(true);
    this.errorMessage.set('');

    if (currentUser) {
      this.userService.update(currentUser.id, request).subscribe({
        next: (user) => {
          this.saving.set(false);
          this.saved.emit({ user, created: false, invitationSent: false });
        },
        error: (error: unknown) => this.handleError(error),
      });

      return;
    }

    this.userService.create(request).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.saved.emit({
          user: result.user,
          created: true,
          invitationSent: result.invitationSent,
        });
      },
      error: (error: unknown) => this.handleError(error),
    });
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);

    return Boolean(control?.touched && control.hasError(errorName));
  }

  private handleError(error: unknown): void {
    this.saving.set(false);

    const apiError = toApiError(error);

    if (apiError.status === 409 && apiError.code === 'DUPLICATE_FIELD' && apiError.field) {
      const control = this.form.get(apiError.field);

      if (control) {
        control.setErrors({ duplicate: true });
        control.markAsTouched();

        return;
      }
    }

    if (apiError.status === 409 && apiError.code === 'LAST_ADMINISTRATOR') {
      this.errorMessage.set('No puedes quitar el rol del último administrador activo.');

      return;
    }

    this.errorMessage.set(
      apiError.status === 400
        ? 'Los datos introducidos no son válidos.'
        : 'No se pudo guardar el usuario. Inténtalo de nuevo.',
    );
  }
}
