import { Component, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { VacationRequest } from '../../models/vacation-request.model';

export type VacationDecision = 'APPROVED' | 'REJECTED';

export interface VacationApprovalPayload {
  requestId: string;
  decision: VacationDecision;
  adminComment: string;
}

@Component({
  selector: 'yko-vacation-approval-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './vacation-approval-dialog.html',
  styleUrl: './vacation-approval-dialog.css',
})
export class VacationApprovalDialog {
  readonly request = input.required<VacationRequest>();

  readonly confirmed = output<VacationApprovalPayload>();
  readonly cancelled = output<void>();

  adminComment = '';

  approve(): void {
    this.confirm('APPROVED');
  }

  reject(): void {
    this.confirm('REJECTED');
  }

  private confirm(decision: VacationDecision): void {
    this.confirmed.emit({
      requestId: this.request().id,
      decision,
      adminComment: this.adminComment,
    });
  }
}
