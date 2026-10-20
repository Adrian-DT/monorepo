import { Component, inject, signal } from '@angular/core';

import { User, UserRole } from '../../../../../core/auth/user.model';
import { toApiError } from '../../../../../core/http/api-error';
import { UserService } from '../../services/user.service';
import { UserForm, UserSavedEvent } from '../../components/user-form/user-form';

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

  userSaved(event: UserSavedEvent): void {
    const name = event.user.displayName;

    if (event.created) {
      this.feedbackMessage.set(
        event.invitationSent
          ? `Usuario ${name} creado. Se ha enviado la invitación por correo.`
          : `Usuario ${name} creado, pero no se pudo enviar la invitación. Puedes reenviarla.`,
      );
    } else {
      this.feedbackMessage.set(`Usuario ${name} actualizado correctamente.`);
    }

    this.errorMessage.set('');
    this.closeEditor();
  }

  toggleActive(user: User): void {
    this.userService.setActive(user.id, !user.active).subscribe({
      next: () => {
        this.feedbackMessage.set(
          user.active
            ? `${user.displayName} ha sido desactivado.`
            : `${user.displayName} ha sido activado.`,
        );
        this.errorMessage.set('');
      },
      error: (error: unknown) => {
        this.feedbackMessage.set('');
        this.errorMessage.set(
          toApiError(error).code === 'LAST_ADMINISTRATOR'
            ? 'No puedes desactivar el último administrador activo.'
            : 'No se pudo actualizar el usuario.',
        );
      },
    });
  }

  changeRole(user: User, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const role = select.value as UserRole;

    this.userService
      .update(user.id, {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role,
      })
      .subscribe({
        next: () => {
          this.feedbackMessage.set(`Rol de ${user.displayName} actualizado.`);
          this.errorMessage.set('');
        },
        error: (error: unknown) => {
          select.value = user.role;
          this.feedbackMessage.set('');
          this.errorMessage.set(
            toApiError(error).code === 'LAST_ADMINISTRATOR'
              ? 'No puedes quitar el rol del último administrador activo.'
              : 'No se pudo actualizar el rol.',
          );
        },
      });
  }

  resendInvitation(user: User): void {
    this.userService.invite(user.id).subscribe({
      next: (result) => {
        if (result.invitationSent) {
          this.feedbackMessage.set(`Invitación reenviada a ${user.email}.`);
          this.errorMessage.set('');
        } else {
          this.feedbackMessage.set('');
          this.errorMessage.set('No se pudo enviar la invitación.');
        }
      },
      error: () => {
        this.feedbackMessage.set('');
        this.errorMessage.set('No se pudo enviar la invitación.');
      },
    });
  }
}
