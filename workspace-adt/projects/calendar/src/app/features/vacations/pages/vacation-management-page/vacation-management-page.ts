import { Component, computed, inject, signal } from '@angular/core';

import {
  VacationApprovalDialog,
  VacationApprovalPayload,
} from '../../components/vacation-approval-dialog/vacation-approval-dialog';
import {
  VacationCancelDialog,
  VacationCancelPayload,
} from '../../components/vacation-cancel-dialog/vacation-cancel-dialog';
import {
  CancellationReviewPayload,
  VacationCancellationReviewDialog,
} from '../../components/vacation-cancellation-review-dialog/vacation-cancellation-review-dialog';
import { VacationCancellation } from '../../models/vacation-cancellation.model';
import { VacationRequest, VacationRequestStatus } from '../../models/vacation-request.model';
import { describeVacationError } from '../../services/vacation-error-messages';
import { VacationsService } from '../../services/vacations.service';
import { toApiError } from '../../../../core/http/api-error';

@Component({
  selector: 'yko-vacation-management-page',
  standalone: true,
  imports: [VacationApprovalDialog, VacationCancelDialog, VacationCancellationReviewDialog],
  templateUrl: './vacation-management-page.html',
  styleUrl: './vacation-management-page.css',
})
export class VacationManagementPage {
  private readonly vacationsService = inject(VacationsService);

  readonly selectedUserId = signal('');
  readonly selectedStatus = signal<VacationRequestStatus | ''>('PENDING');
  readonly selectedRequest = signal<VacationRequest | null>(null);
  readonly feedbackMessage = signal('');
  readonly errorMessage = signal('');
  readonly dialogError = signal('');
  readonly saving = signal(false);

  readonly cancelTarget = signal<VacationRequest | null>(null);
  readonly cancelSaving = signal(false);
  readonly cancelError = signal('');

  readonly reviewTarget = signal<VacationCancellation | null>(null);
  readonly reviewSaving = signal(false);
  readonly reviewError = signal('');

  readonly pendingCancellations = this.vacationsService.pendingCancellations;

  readonly users = this.vacationsService.users;

  readonly requests = computed(() =>
    this.vacationsService.filterRequests(this.selectedUserId(), this.selectedStatus()),
  );

  changeUser(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedUserId.set(select.value);
  }

  changeStatus(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedStatus.set(select.value as VacationRequestStatus | '');
  }

  reviewRequest(request: VacationRequest): void {
    this.dialogError.set('');
    this.selectedRequest.set(request);
  }

  closeDialog(): void {
    this.dialogError.set('');
    this.selectedRequest.set(null);
  }

  confirmDecision(payload: VacationApprovalPayload): void {
    if (this.saving()) {
      return;
    }

    const previousDays = this.selectedRequest()?.workingDays ?? 0;

    this.saving.set(true);
    this.dialogError.set('');

    this.vacationsService
      .decide(payload.requestId, payload.decision, payload.adminComment)
      .subscribe({
        next: (request) => {
          this.saving.set(false);
          this.errorMessage.set('');
          this.feedbackMessage.set(this.describeDecision(request, previousDays));
          this.closeDialog();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.handleDecisionError(error);
        },
      });
  }

  clearFilters(): void {
    this.selectedUserId.set('');
    this.selectedStatus.set('PENDING');
  }

  getStatusLabel(status: VacationRequestStatus): string {
    const labels: Record<VacationRequestStatus, string> = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobada',
      REJECTED: 'Rechazada',
      CANCELLED: 'Cancelada',
    };

    return labels[status];
  }

  hasPendingCancellation(request: VacationRequest): boolean {
    return this.pendingCancellations().some((item) => item.vacationId === request.id);
  }

  openCancelDialog(request: VacationRequest): void {
    this.cancelError.set('');
    this.cancelTarget.set(request);
  }

  closeCancelDialog(): void {
    this.cancelError.set('');
    this.cancelTarget.set(null);
  }

  confirmCancel(payload: VacationCancelPayload): void {
    const target = this.cancelTarget();

    if (!target || this.cancelSaving()) {
      return;
    }

    this.cancelSaving.set(true);
    this.cancelError.set('');

    this.vacationsService
      .cancelApproved(target.id, {
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        comment: payload.text,
      })
      .subscribe({
        next: (result) => {
          this.cancelSaving.set(false);
          this.errorMessage.set('');
          this.feedbackMessage.set(
            `Cancelación aplicada a ${target.userName}: ${result.cancellation.releasedWorkingDays ?? 0} día(s) laborable(s) liberado(s).`,
          );
          this.closeCancelDialog();
        },
        error: (error: unknown) => {
          this.cancelSaving.set(false);
          this.cancelError.set(
            describeVacationError(error, 'No se pudo cancelar. Inténtalo de nuevo.'),
          );
        },
      });
  }

  openReviewDialog(cancellation: VacationCancellation): void {
    this.reviewError.set('');
    this.reviewTarget.set(cancellation);
  }

  closeReviewDialog(): void {
    this.reviewError.set('');
    this.reviewTarget.set(null);
  }

  confirmReview(payload: CancellationReviewPayload): void {
    const target = this.reviewTarget();

    if (!target || this.reviewSaving()) {
      return;
    }

    this.reviewSaving.set(true);
    this.reviewError.set('');

    this.vacationsService
      .decideCancellation(payload.cancellationId, payload.decision, payload.comment)
      .subscribe({
        next: (result) => {
          this.reviewSaving.set(false);
          this.errorMessage.set('');
          this.feedbackMessage.set(
            payload.decision === 'APPROVED'
              ? `Cancelación aprobada para ${target.userName}: ${result.cancellation.releasedWorkingDays ?? 0} día(s) laborable(s) liberado(s).`
              : 'Solicitud de cancelación rechazada.',
          );
          this.closeReviewDialog();
        },
        error: (error: unknown) => {
          this.reviewSaving.set(false);

          const code = toApiError(error).code;

          if (code === 'INVALID_STATUS' || code === 'CANCELLATION_NOT_FOUND') {
            this.closeReviewDialog();
            this.feedbackMessage.set('');
            this.errorMessage.set(describeVacationError(error, ''));
            this.vacationsService.load();

            return;
          }

          this.reviewError.set(
            code === 'NO_WORKING_DAYS'
              ? 'No se puede aprobar: el tramo ya no incluye días laborables. Recházala en su lugar.'
              : describeVacationError(error, 'No se pudo guardar la decisión. Inténtalo de nuevo.'),
          );
        },
      });
  }

  private describeDecision(request: VacationRequest, previousDays: number): string {
    if (request.status !== 'APPROVED') {
      return 'Solicitud rechazada correctamente.';
    }

    return request.workingDays === previousDays
      ? `Solicitud aprobada correctamente (${request.workingDays} días laborables).`
      : `Solicitud aprobada con ${request.workingDays} días laborables (recalculados con los festivos vigentes; antes ${previousDays}).`;
  }

  private handleDecisionError(error: unknown): void {
    const apiError = toApiError(error);

    if (apiError.code === 'NO_WORKING_DAYS') {
      this.dialogError.set(
        'No se puede aprobar: el periodo ya no incluye días laborables. Recházala en su lugar.',
      );

      return;
    }

    if (apiError.code === 'INVALID_STATUS' || apiError.status === 404) {
      this.closeDialog();
      this.feedbackMessage.set('');
      this.errorMessage.set('La solicitud ya no está pendiente. Se ha actualizado la lista.');
      this.vacationsService.load();

      return;
    }

    this.dialogError.set('No se pudo guardar la decisión. Inténtalo de nuevo.');
  }
}
