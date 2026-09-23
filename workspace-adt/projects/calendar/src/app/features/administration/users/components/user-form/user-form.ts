import { Component, effect, inject, input, output } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { User, UserRole } from '../../../../../core/auth/user.model';
import { UserService } from '../../services/user.service';

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

  readonly saved = output<User>();
  readonly cancelled = output<void>();

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
    });
  }

  get editing(): boolean {
    return this.user() !== null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const currentUser = this.user();

    if (!this.userService.isUsernameAvailable(value.username, currentUser?.id)) {
      this.form.controls.username.setErrors({
        duplicate: true,
      });

      return;
    }

    if (!this.userService.isEmailAvailable(value.email, currentUser?.id)) {
      this.form.controls.email.setErrors({
        duplicate: true,
      });

      return;
    }

    if (currentUser) {
      const updated = this.userService.updateUser(currentUser.id, {
        username: value.username.trim(),
        displayName: value.displayName.trim(),
        email: value.email.trim(),
        role: value.role,
      });

      if (!updated) {
        return;
      }

      const savedUser = this.userService.getById(currentUser.id);

      if (savedUser) {
        this.saved.emit(savedUser);
      }

      return;
    }

    try {
      const createdUser = this.userService.addUser({
        username: value.username.trim(),
        displayName: value.displayName.trim(),
        email: value.email.trim(),
        role: value.role,
        active: true,
      });

      this.saved.emit(createdUser);

      this.form.reset({
        username: '',
        displayName: '',
        email: '',
        role: 'USER',
      });
    } catch (error) {
      this.form.controls.username.setErrors({
        duplicate: true,
        error: error,
      });
    }
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);

    return Boolean(control?.touched && control.hasError(errorName));
  }
}
