import { Component, computed, inject, signal } from '@angular/core';

import {
  VacationCancelDialog,
  VacationCancelPayload,
} from '../../components/vacation-cancel-dialog/vacation-cancel-dialog';
import { VacationRequestForm } from '../../components/vacation-request-form/vacation-request-form';
import { VacationRequestList } from '../../components/vacation-request-list/vacation-request-list';
import { VacationRequest } from '../../models/vacation-request.model';
import { describeVacationError } from '../../services/vacation-error-messages';
import { VacationsService } from '../../services/vacations.service';
import { AuthService } from '../../../../core/auth/auth';
import { toApiError } from '../../../../core/http/api-error';

@Component({
  selector: 'yko-my-vacation-page',
  standalone: true,
  imports: [VacationRequestForm, VacationRequestList, VacationCancelDialog],
  templateUrl: './my-vacation-page.html',
  styleUrl: './my-vacation-page.css',
})
export class MyVacationPage {
  private readonly vacationsService = inject(VacationsService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  readonly requests = computed(() => {
    const userId = this.currentUser()?.id;

    return userId ? this.vacationsService.getRequestsByUser(userId) : [];
  });

  readonly cancellations = this.vacationsService.cancellations;

  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly cancellationTarget = signal<VacationRequest | null>(null);
  readonly dialogSaving = signal(false);
  readonly dialogError = signal('');

  requestCreated(request: VacationRequest): void {
    this.errorMessage.set('');
    this.successMessage.set(
      `Solicitud creada correctamente para ${request.workingDays} día(s) laborable(s).`,
    );
  }

  cancelRequest(requestId: string): void {
    this.vacationsService.cancel(requestId).subscribe({
      next: () => {
        this.errorMessage.set('');
        this.successMessage.set('Solicitud cancelada correctamente.');
      },
      error: (error: unknown) => {
        this.successMessage.set('');

        if (toApiError(error).code === 'INVALID_STATUS') {
          this.errorMessage.set('La solicitud ya no se puede cancelar porque ha sido resuelta.');
          this.vacationsService.load();

          return;
        }

        this.errorMessage.set('No se pudo cancelar la solicitud. Inténtalo de nuevo.');
      },
    });
  }

  openCancellationDialog(request: VacationRequest): void {
    this.dialogError.set('');
    this.cancellationTarget.set(request);
  }

  closeCancellationDialog(): void {
    this.dialogError.set('');
    this.cancellationTarget.set(null);
  }

  submitCancellation(payload: VacationCancelPayload): void {
    const target = this.cancellationTarget();

    if (!target || this.dialogSaving()) {
      return;
    }

    this.dialogSaving.set(true);
    this.dialogError.set('');

    this.vacationsService
      .requestCancellation(target.id, {
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        reason: payload.text,
      })
      .subscribe({
        next: () => {
          this.dialogSaving.set(false);
          this.closeCancellationDialog();
          this.errorMessage.set('');
          this.successMessage.set(
            'Solicitud de cancelación enviada. Un administrador la revisará.',
          );
        },
        error: (error: unknown) => {
          this.dialogSaving.set(false);
          this.dialogError.set(
            describeVacationError(error, 'No se pudo enviar la solicitud. Inténtalo de nuevo.'),
          );
        },
      });
  }

  withdrawCancellation(cancellationId: string): void {
    this.vacationsService.withdrawCancellation(cancellationId).subscribe({
      next: () => {
        this.errorMessage.set('');
        this.successMessage.set('Solicitud de cancelación retirada.');
      },
      error: (error: unknown) => {
        this.successMessage.set('');
        this.errorMessage.set(
          describeVacationError(error, 'No se pudo retirar la solicitud. Inténtalo de nuevo.'),
        );
        this.vacationsService.load();
      },
    });
  }
}
