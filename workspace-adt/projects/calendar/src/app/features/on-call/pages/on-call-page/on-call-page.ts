import { Component, inject, signal } from '@angular/core';

import { OnCallAssignmentForm } from '../../components/on-call-assignment-form/on-call-assignment-form';
import { OnCallAssignmentList } from '../../components/on-call-assignment-list/on-call-assignment-list';
import { OnCallAssignment } from '../../models/on-call-assignment.model';
import { OnCallService } from '../../services/on-call.service';

@Component({
  selector: 'yko-on-call-page',
  standalone: true,
  imports: [OnCallAssignmentForm, OnCallAssignmentList],
  templateUrl: './on-call-page.html',
  styleUrl: './on-call-page.css',
})
export class OnCallPage {
  private readonly onCallService = inject(OnCallService);

  readonly assignments = this.onCallService.assignments;
  readonly feedbackMessage = signal('');

  assignmentCreated(assignment: OnCallAssignment): void {
    this.feedbackMessage.set(`Guardia asignada correctamente a ${assignment.userName}.`);
  }

  cancelAssignment(assignmentId: string): void {
    this.onCallService.cancelAssignment(assignmentId);

    this.feedbackMessage.set('Guardia cancelada correctamente.');
  }
}
