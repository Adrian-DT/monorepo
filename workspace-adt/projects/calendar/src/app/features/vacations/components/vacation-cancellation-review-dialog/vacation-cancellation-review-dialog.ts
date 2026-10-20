import { Component, input, output, signal } from '@angular/core';

import { VacationCancellation } from '../../models/vacation-cancellation.model';

export type CancellationDecision = 'APPROVED' | 'REJECTED';

export interface CancellationReviewPayload {
  cancellationId: string;
  decision: CancellationDecision;
  comment: string;
}

@Component({
  selector: 'yko-vacation-cancellation-review-dialog',
  standalone: true,
  templateUrl: './vacation-cancellation-review-dialog.html',
  styleUrl: './vacation-cancellation-review-dialog.css',
})
export class VacationCancellationReviewDialog {
  readonly cancellation = input.required<VacationCancellation>();
  readonly saving = input(false);
  readonly errorMessage = input('');

  readonly confirmed = output<CancellationReviewPayload>();
  readonly cancelled = output<void>();

  readonly comment = signal('');

  changeComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  approve(): void {
    this.confirm('APPROVED');
  }

  reject(): void {
    this.confirm('REJECTED');
  }

  private confirm(decision: CancellationDecision): void {
    this.confirmed.emit({
      cancellationId: this.cancellation().id,
      decision,
      comment: this.comment(),
    });
  }
}
