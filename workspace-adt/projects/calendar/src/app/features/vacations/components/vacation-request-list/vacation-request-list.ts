import { Component, input, output } from '@angular/core';

import { VacationRequest, VacationRequestStatus } from '../../models/vacation-request.model';

@Component({
  selector: 'yko-vacation-request-list',
  standalone: true,
  templateUrl: './vacation-request-list.html',
  styleUrl: './vacation-request-list.css',
})
export class VacationRequestList {
  readonly requests = input.required<VacationRequest[]>();

  readonly cancel = output<string>();

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
}
