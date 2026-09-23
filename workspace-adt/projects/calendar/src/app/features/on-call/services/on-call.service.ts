import { Injectable, computed, inject, signal } from '@angular/core';

import { HolidaysService } from '../../administration/holidays/services/holidays.service';
import {
  OnCallAssignment,
  OnCallCoverageDay,
  OnCallDayType,
} from '../models/on-call-assignment.model';
import { UserService } from '../../administration/users/services/user.service';

export interface OnCallUser {
  id: string;
  name: string;
}

export interface OnCallOverlap {
  assignment: OnCallAssignment;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class OnCallService {
  private readonly holidaysService = inject(HolidaysService);
  private readonly userService = inject(UserService);
  private readonly assignmentsState = signal<OnCallAssignment[]>([
    {
      id: 'on-call-1',
      userId: '2',
      userName: 'María García',
      startDate: '2026-09-18',
      endDate: '2026-09-19',
      status: 'CONFIRMED',
      notes: 'Guardia de fin de semana',
      createdAt: '2026-08-20T09:00:00',
    },
  ]);

  readonly assignments = this.assignmentsState.asReadonly();
  readonly users = computed<OnCallUser[]>(() =>
    this.userService.activeUsers().map((user) => ({
      id: user.id,
      name: user.displayName,
    })),
  );

  readonly activeAssignments = computed(() =>
    this.assignmentsState().filter((assignment) => assignment.status !== 'CANCELLED'),
  );

  readonly coverageDays = computed<OnCallCoverageDay[]>(() =>
    this.activeAssignments().flatMap((assignment) =>
      this.getDatesBetween(assignment.startDate, assignment.endDate).map((date) => ({
        assignmentId: assignment.id,
        userId: assignment.userId,
        userName: assignment.userName,
        date,
        type: this.getCoverageType(date),
        status: assignment.status,
        notes: assignment.notes,
      })),
    ),
  );

  getAssignmentById(id: string): OnCallAssignment | undefined {
    return this.assignmentsState().find((assignment) => assignment.id === id);
  }

  createAssignment(assignment: Omit<OnCallAssignment, 'id' | 'createdAt'>): OnCallAssignment {
    const newAssignment: OnCallAssignment = {
      ...assignment,
      id: `on-call-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    this.assignmentsState.update((assignments) => [...assignments, newAssignment]);

    return newAssignment;
  }

  cancelAssignment(assignmentId: string): void {
    this.assignmentsState.update((assignments) =>
      assignments.map((assignment) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              status: 'CANCELLED',
            }
          : assignment,
      ),
    );
  }

  findOverlaps(startDate: string, endDate: string, excludeId?: string): OnCallOverlap[] {
    return this.activeAssignments()
      .filter((assignment) => assignment.id !== excludeId)
      .filter((assignment) =>
        this.rangesOverlap(startDate, endDate, assignment.startDate, assignment.endDate),
      )
      .map((assignment) => ({
        assignment,
        message:
          `${assignment.userName} ya tiene una guardia ` +
          `del ${assignment.startDate} al ${assignment.endDate}.`,
      }));
  }

  getCoverageType(date: string): OnCallDayType {
    const holiday = this.holidaysService.getHoliday(date);

    if (holiday) {
      const holidayTypes: Record<'NATIONAL' | 'REGIONAL' | 'LOCAL', OnCallDayType> = {
        NATIONAL: 'NATIONAL_HOLIDAY',
        REGIONAL: 'REGIONAL_HOLIDAY',
        LOCAL: 'LOCAL_HOLIDAY',
      };

      return holidayTypes[holiday.scope];
    }

    const dayOfWeek = this.parseDate(date).getDay();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return isWeekend ? 'WEEKEND' : 'WORKDAY';
  }

  getCoverageLabel(type: OnCallDayType): string {
    const labels: Record<OnCallDayType, string> = {
      WORKDAY: 'Laborable',
      WEEKEND: 'Fin de semana',
      NATIONAL_HOLIDAY: 'Festivo nacional',
      REGIONAL_HOLIDAY: 'Festivo autonómico',
      LOCAL_HOLIDAY: 'Festivo local',
    };

    return labels[type];
  }

  private rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA <= endB && endA >= startB;
  }

  private getDatesBetween(startDate: string, endDate: string): string[] {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(this.toIsoDate(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
