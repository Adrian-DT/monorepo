import { Component, computed, input, output, signal } from '@angular/core';

import { VacationRequest } from '../../models/vacation-request.model';
import {
  CancellationScope,
  laterDate,
  todayIso,
  validateCancellationRange,
} from './cancellation-range';

export type VacationCancelMode = 'ADMIN' | 'USER';

export interface VacationCancelPayload {
  fromDate?: string;
  toDate?: string;
  text: string;
}

@Component({
  selector: 'yko-vacation-cancel-dialog',
  standalone: true,
  templateUrl: './vacation-cancel-dialog.html',
  styleUrl: './vacation-cancel-dialog.css',
})
export class VacationCancelDialog {
  readonly vacation = input.required<VacationRequest>();
  readonly mode = input<VacationCancelMode>('ADMIN');
  readonly saving = input(false);
  readonly errorMessage = input('');

  readonly confirmed = output<VacationCancelPayload>();
  readonly cancelled = output<void>();

  readonly scope = signal<CancellationScope>('ALL');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly text = signal('');
  readonly validationError = signal('');

  readonly minDate = computed(() =>
    this.mode() === 'USER'
      ? laterDate(this.vacation().startDate, todayIso())
      : this.vacation().startDate,
  );

  readonly isUser = computed(() => this.mode() === 'USER');

  setScope(scope: CancellationScope): void {
    this.scope.set(scope);
    this.validationError.set('');
  }

  changeFrom(event: Event): void {
    this.fromDate.set((event.target as HTMLInputElement).value);
  }

  changeTo(event: Event): void {
    this.toDate.set((event.target as HTMLInputElement).value);
  }

  changeText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  confirm(): void {
    const vacation = this.vacation();

    const error = validateCancellationRange({
      scope: this.scope(),
      fromDate: this.fromDate(),
      toDate: this.toDate(),
      periodStart: vacation.startDate,
      periodEnd: vacation.endDate,
      minDate: this.minDate(),
    });

    if (error) {
      this.validationError.set(error);
      return;
    }

    if (this.isUser() && !this.text().trim()) {
      this.validationError.set('Indica el motivo de la cancelación.');
      return;
    }

    this.validationError.set('');

    this.confirmed.emit({
      fromDate: this.scope() === 'PARTIAL' ? this.fromDate() : undefined,
      toDate: this.scope() === 'PARTIAL' ? this.toDate() : undefined,
      text: this.text(),
    });
  }
}
