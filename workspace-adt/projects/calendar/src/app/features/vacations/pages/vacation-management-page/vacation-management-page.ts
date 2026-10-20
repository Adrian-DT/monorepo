import { Component, computed, inject, signal } from '@angular/core';

import {
  VacationApprovalDialog,
  VacationApprovalPayload,
} from '../../components/vacation-approval-dialog/vacation-approval-dialog';
import { VacationRequest, VacationRequestStatus } from '../../models/vacation-request.model';
import { VacationsService } from '../../services/vacations.service';
import { toApiError } from '../../../../core/http/api-error';

@Component({
  selector: 'yko-vacation-management-page',
  standalone: true,
  imports: [VacationApprovalDialog],
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
