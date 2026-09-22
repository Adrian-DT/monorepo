import { Component, computed, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Holiday, HolidayScope } from '../../models/holiday.model';
import { HolidaysService } from '../../services/holidays.service';

@Component({
  selector: 'yko-holiday-management-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './holiday-management-page.html',
  styleUrl: './holiday-management-page.css',
})
export class HolidayManagementPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly holidaysService = inject(HolidaysService);

  readonly selectedYear = signal(new Date().getFullYear());
  readonly feedbackMessage = signal('');
  readonly errorMessage = signal('');

  readonly holidays = computed(() => this.holidaysService.getByYear(this.selectedYear()));

  readonly years = this.buildYears();

  readonly form = this.formBuilder.nonNullable.group({
    date: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    scope: ['NATIONAL' as HolidayScope, Validators.required],
    location: ['', Validators.maxLength(120)],
  });

  addHoliday(): void {
    this.feedbackMessage.set('');
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    try {
      const holiday = this.holidaysService.addHoliday({
        date: value.date,
        name: value.name.trim(),
        scope: value.scope,
        location: value.location.trim() || undefined,
      });

      this.selectedYear.set(Number(holiday.date.slice(0, 4)));

      this.form.reset({
        date: '',
        name: '',
        scope: 'NATIONAL',
        location: '',
      });

      this.feedbackMessage.set(`Festivo "${holiday.name}" añadido correctamente.`);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se ha podido añadir el festivo.',
      );
    }
  }

  removeHoliday(holiday: Holiday): void {
    this.holidaysService.removeHoliday(holiday.id);

    this.feedbackMessage.set(`Festivo "${holiday.name}" eliminado correctamente.`);

    this.errorMessage.set('');
  }

  changeYear(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    this.selectedYear.set(Number(value));
  }

  getScopeLabel(scope: HolidayScope): string {
    return this.holidaysService.getScopeLabel(scope);
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);

    return Boolean(control?.touched && control.hasError(errorName));
  }

  private buildYears(): number[] {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);
  }
}
