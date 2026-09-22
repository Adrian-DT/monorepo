import { Component, input, output } from '@angular/core';

import {
  Intervention,
  InterventionShift,
  InterventionStatus,
  InterventionType,
} from '../../models/intervention.model';

@Component({
  selector: 'yko-intervention-table',
  standalone: true,
  templateUrl: './intervention-table.html',
  styleUrl: './intervention-table.css',
})
export class InterventionTable {
  readonly interventions = input.required<Intervention[]>();

  readonly statusChanged = output<{
    id: string;
    status: InterventionStatus;
  }>();

  readonly cancelled = output<string>();

  getShiftLabel(shift: InterventionShift): string {
    const labels: Record<InterventionShift, string> = {
      DAY: 'Diurna',
      AFTERNOON: 'Tarde',
      NIGHT: 'Nocturna',
    };

    return labels[shift];
  }

  getTypeLabel(type: InterventionType): string {
    const labels: Record<InterventionType, string> = {
      REMOTE: 'Remota',
      ONSITE: 'Presencial',
    };

    return labels[type];
  }

  getStatusLabel(status: InterventionStatus): string {
    const labels: Record<InterventionStatus, string> = {
      OPEN: 'Abierta',
      IN_PROGRESS: 'En curso',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };

    return labels[status];
  }

  getDurationLabel(durationMinutes?: number): string {
    if (durationMinutes === undefined) {
      return '—';
    }

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours === 0) {
      return `${minutes} min`;
    }

    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  }

  canStart(intervention: Intervention): boolean {
    return intervention.status === 'OPEN';
  }

  canComplete(intervention: Intervention): boolean {
    return intervention.status === 'OPEN' || intervention.status === 'IN_PROGRESS';
  }

  canCancel(intervention: Intervention): boolean {
    return intervention.status !== 'CANCELLED' && intervention.status !== 'COMPLETED';
  }
}
