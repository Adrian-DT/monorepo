import { Component, computed, inject, signal } from '@angular/core';

import {
  VacationApprovalDialog,
  VacationApprovalPayload,
} from '../../components/vacation-approval-dialog/vacation-approval-dialog';
import { VacationRequest, VacationRequestStatus } from '../../models/vacation-request.model';
import { VacationsService } from '../../services/vacations.service';

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
    this.selectedRequest.set(request);
  }

  closeDialog(): void {
    this.selectedRequest.set(null);
  }

  confirmDecision(payload: VacationApprovalPayload): void {
    this.vacationsService.updateStatus(payload.requestId, payload.decision, payload.adminComment);

    const message =
      payload.decision === 'APPROVED'
        ? 'Solicitud aprobada correctamente.'
        : 'Solicitud rechazada correctamente.';

    this.feedbackMessage.set(message);
    this.closeDialog();
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
}
