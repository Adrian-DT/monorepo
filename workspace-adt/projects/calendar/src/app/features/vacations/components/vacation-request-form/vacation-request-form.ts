import { Component, inject, output } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { VacationRequest } from '../../models/vacation-request.model';
import { VacationsService } from '../../services/vacations';
import { HolidaysService } from '../../../administration/holidays/services/holidays.service';

@Component({
  selector: 'yko-vacation-request-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './vacation-request-form.html',
  styleUrl: './vacation-request-form.css',
})
export class VacationRequestForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly vacationsService = inject(VacationsService);
  private readonly holidaysService = inject(HolidaysService);

  readonly submitted = output<VacationRequest>();

  readonly form = this.formBuilder.nonNullable.group(
    {
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      reason: ['', [Validators.required, Validators.maxLength(250)]],
    },
    {
      validators: [this.dateRangeValidator],
    },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    const request = this.vacationsService.createRequest({
      userId: '1',
      userName: 'Adrián Delgado',
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      workingDays: this.calculateWorkingDays(formValue.startDate, formValue.endDate),
      reason: formValue.reason,
    });

    this.form.reset();

    this.submitted.emit(request);
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);

    return Boolean(control?.touched && control.hasError(errorName));
  }

  hasDateRangeError(): boolean {
    return Boolean(this.form.touched && this.form.hasError('invalidDateRange'));
  }

  private dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    if (!startDate || !endDate) {
      return null;
    }

    return endDate >= startDate ? null : { invalidDateRange: true };
  }

  private calculateWorkingDays(startDate: string, endDate: string): number {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);

    let workingDays = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const isoDate = this.toIsoDate(current);

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const isHoliday = this.holidaysService.isHoliday(isoDate);

      if (!isWeekend && !isHoliday) {
        workingDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return workingDays;
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
