import { Injectable, computed, inject, signal } from '@angular/core';

import { Intervention, InterventionStatus } from '../models/intervention.model';

import { UserService } from '../../administration/users/services/user.service';

export interface InterventionUser {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class InterventionsService {
  private readonly userService = inject(UserService);
  private readonly interventionsState = signal<Intervention[]>([
    {
      id: 'intervention-1',
      userId: '1',
      userName: 'Adrián Delgado',
      date: '2026-09-21',
      shift: 'NIGHT',
      type: 'REMOTE',
      status: 'COMPLETED',
      title: 'Mantenimiento programado del servidor HIS',
      description: 'Actualización de componentes y comprobaciones posteriores.',
      startTime: '22:00',
      endTime: '23:30',
      durationMinutes: 90,
      createdAt: '2026-09-20T12:00:00',
    },
  ]);

  private readonly usersState = signal<InterventionUser[]>([
    {
      id: '1',
      name: 'Adrián Delgado',
    },
    {
      id: '2',
      name: 'María García',
    },
    {
      id: '3',
      name: 'Carlos Martín',
    },
  ]);

  readonly interventions = this.interventionsState.asReadonly();
  readonly users = computed(() => this.userService.activeUsers());

  readonly activeInterventions = computed(() =>
    this.interventionsState().filter((intervention) => intervention.status !== 'CANCELLED'),
  );

  createIntervention(intervention: Omit<Intervention, 'id' | 'createdAt'>): Intervention {
    const newIntervention: Intervention = {
      ...intervention,
      id: `intervention-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    this.interventionsState.update((interventions) => [...interventions, newIntervention]);

    return newIntervention;
  }

  updateStatus(interventionId: string, status: InterventionStatus): void {
    this.interventionsState.update((interventions) =>
      interventions.map((intervention) =>
        intervention.id === interventionId
          ? {
              ...intervention,
              status,
            }
          : intervention,
      ),
    );
  }

  cancelIntervention(interventionId: string): void {
    this.updateStatus(interventionId, 'CANCELLED');
  }

  calculateDuration(startTime: string, endTime: string): number | undefined {
    if (!startTime || !endTime) {
      return undefined;
    }

    const start = this.toMinutes(startTime);
    let end = this.toMinutes(endTime);

    if (end < start) {
      end += 24 * 60;
    }

    return end - start;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
  }
}
