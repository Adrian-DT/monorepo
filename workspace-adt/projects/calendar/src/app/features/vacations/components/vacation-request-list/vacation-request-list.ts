import { Component, input, output } from '@angular/core';

import { VacationCancellation } from '../../models/vacation-cancellation.model';
import { VacationRequest, VacationRequestStatus } from '../../models/vacation-request.model';

@Component({
  selector: 'yko-vacation-request-list',
  standalone: true,
  templateUrl: './vacation-request-list.html',
  styleUrl: './vacation-request-list.css',
})
export class VacationRequestList {
  readonly requests = input.required<VacationRequest[]>();
  readonly cancellations = input<VacationCancellation[]>([]);

  readonly cancelRequested = output<string>();
  readonly cancellationRequested = output<VacationRequest>();
  readonly cancellationWithdrawn = output<string>();

  getStatusLabel(status: VacationRequestStatus): string {
    const labels: Record<VacationRequestStatus, string> = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobada',
      REJECTED: 'Rechazada',
      CANCELLED: 'Cancelada',
    };

    return labels[status];
  }

  canCancel(request: VacationRequest): boolean {
    return request.status === 'PENDING';
  }

  pendingCancellation(request: VacationRequest): VacationCancellation | undefined {
    return this.cancellations().find(
      (item) => item.vacationId === request.id && item.status === 'PENDING',
    );
  }

  canRequestCancellation(request: VacationRequest): boolean {
    return request.status === 'APPROVED' && !this.pendingCancellation(request);
  }

  lastResolution(request: VacationRequest): VacationCancellation | undefined {
    return this.cancellations().find(
      (item) =>
        item.vacationId === request.id &&
        (item.status === 'APPROVED' || item.status === 'REJECTED'),
    );
  }
}
