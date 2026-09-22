import { Component, inject, input, output } from '@angular/core';

import {
  OnCallAssignment,
  OnCallAssignmentStatus,
  OnCallCoverageDay,
} from '../../models/on-call-assignment.model';
import { OnCallService } from '../../services/on-call.service';

@Component({
  selector: 'yko-on-call-assignment-list',
  standalone: true,
  templateUrl: './on-call-assignment-list.html',
  styleUrl: './on-call-assignment-list.css',
})
export class OnCallAssignmentList {
  private readonly onCallService = inject(OnCallService);

  readonly assignments = input.required<OnCallAssignment[]>();
  readonly cancel = output<string>();

  readonly coverageDays = this.onCallService.coverageDays;

  getStatusLabel(status: OnCallAssignmentStatus): string {
    const labels: Record<OnCallAssignmentStatus, string> = {
      PLANNED: 'Planificada',
      CONFIRMED: 'Confirmada',
      CANCELLED: 'Cancelada',
    };

    return labels[status];
  }

  getWorkdayCount(assignmentId: string): number {
    return this.countByType(assignmentId, 'WORKDAY');
  }

  getWeekendCount(assignmentId: string): number {
    return this.countByType(assignmentId, 'WEEKEND');
  }

  getNationalHolidayCount(assignmentId: string): number {
    return this.countByType(assignmentId, 'NATIONAL_HOLIDAY');
  }

  getRegionalHolidayCount(assignmentId: string): number {
    return this.countByType(assignmentId, 'REGIONAL_HOLIDAY');
  }

  getLocalHolidayCount(assignmentId: string): number {
    return this.countByType(assignmentId, 'LOCAL_HOLIDAY');
  }

  canCancel(assignment: OnCallAssignment): boolean {
    return assignment.status !== 'CANCELLED';
  }

  private countByType(assignmentId: string, type: OnCallCoverageDay['type']): number {
    return this.getCoverageDays(assignmentId).filter((day) => day.type === type).length;
  }

  private getCoverageDays(assignmentId: string): OnCallCoverageDay[] {
    return this.coverageDays().filter((day) => day.assignmentId === assignmentId);
  }
}
