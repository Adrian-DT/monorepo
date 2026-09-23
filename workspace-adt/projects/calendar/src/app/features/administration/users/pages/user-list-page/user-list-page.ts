import { Component, inject, signal } from '@angular/core';

import { User, UserRole } from '../../../../../core/auth/user.model';
import { UserService } from '../../services/user.service';
import { UserForm } from '../../components/user-form/user-form';

@Component({
  selector: 'yko-user-list-page',
  standalone: true,
  imports: [UserForm],
  templateUrl: './user-list-page.html',
  styleUrl: './user-list-page.css',
})
export class UserListPage {
  private readonly userService = inject(UserService);

  readonly users = this.userService.users;
  readonly feedbackMessage = signal('');
  readonly errorMessage = signal('');

  readonly selectedUser = signal<User | null>(null);
  readonly creatingUser = signal(false);

  createUser(): void {
    this.selectedUser.set(null);
    this.creatingUser.set(true);
  }

  editUser(user: User): void {
    this.selectedUser.set(user);
    this.creatingUser.set(false);
  }

  closeEditor(): void {
    this.selectedUser.set(null);
    this.creatingUser.set(false);
  }

  userSaved(user: User): void {
    this.feedbackMessage.set(
      this.creatingUser()
        ? `Usuario ${user.displayName} creado correctamente.`
        : `Usuario ${user.displayName} actualizado correctamente.`,
    );

    this.closeEditor();
  }

  toggleActive(user: User): void {
    const updated = this.userService.setActive(user.id, !user.active);

    if (!updated) {
      this.errorMessage.set('No puedes desactivar el último administrador activo.');

      return;
    }

    this.feedbackMessage.set(
      user.active
        ? `${user.displayName} ha sido desactivado.`
        : `${user.displayName} ha sido activado.`,
    );

    this.errorMessage.set('');
  }

  changeRole(user: User, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;

    const updated = this.userService.updateUser(user.id, { role });

    if (!updated) {
      this.errorMessage.set('No puedes quitar el rol del último administrador activo.');

      return;
    }

    this.feedbackMessage.set(`Rol de ${user.displayName} actualizado.`);

    this.errorMessage.set('');
  }
}
