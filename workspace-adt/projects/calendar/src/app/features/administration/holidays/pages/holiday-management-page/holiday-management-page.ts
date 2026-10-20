import { Component, computed, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { toApiError } from '../../../../../core/http/api-error';
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
  readonly saving = signal(false);
  readonly editingHoliday = signal<Holiday | null>(null);

  readonly holidays = computed(() => this.holidaysService.getByYear(this.selectedYear()));

  readonly years = this.buildYears();

  readonly form = this.formBuilder.nonNullable.group({
    date: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    scope: ['NATIONAL' as HolidayScope, Validators.required],
    location: ['', Validators.maxLength(120)],
  });

  submit(): void {
    if (this.saving()) {
      return;
    }

    this.feedbackMessage.set('');
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const request = {
      date: value.date,
      name: value.name.trim(),
      scope: value.scope,
      location: value.location.trim() || undefined,
    };

    const editing = this.editingHoliday();

    this.saving.set(true);

    const operation = editing
      ? this.holidaysService.update(editing.id, request)
      : this.holidaysService.add(request);

    operation.subscribe({
      next: (holiday) => {
        this.saving.set(false);
        this.selectedYear.set(Number(holiday.date.slice(0, 4)));
        this.resetForm();

        this.feedbackMessage.set(
          editing
            ? `Festivo "${holiday.name}" actualizado correctamente.`
            : `Festivo "${holiday.name}" añadido correctamente.`,
        );
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.describeError(error, editing !== null));
      },
    });
  }

  startEditing(holiday: Holiday): void {
    this.feedbackMessage.set('');
    this.errorMessage.set('');

    this.editingHoliday.set(holiday);

    this.form.reset({
      date: holiday.date,
      name: holiday.name,
      scope: holiday.scope,
      location: holiday.location ?? '',
    });
  }

  cancelEditing(): void {
    this.errorMessage.set('');
    this.resetForm();
  }

  removeHoliday(holiday: Holiday): void {
    this.holidaysService.remove(holiday.id).subscribe({
      next: () => {
        if (this.editingHoliday()?.id === holiday.id) {
          this.resetForm();
        }

        this.feedbackMessage.set(`Festivo "${holiday.name}" eliminado correctamente.`);
        this.errorMessage.set('');
      },
      error: (error: unknown) => {
        this.feedbackMessage.set('');
        this.errorMessage.set(
          toApiError(error).status === 404
            ? 'El festivo ya no existe.'
            : 'No se ha podido eliminar el festivo.',
        );
      },
    });
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

  private resetForm(): void {
    this.editingHoliday.set(null);

    this.form.reset({
      date: '',
      name: '',
      scope: 'NATIONAL',
      location: '',
    });
  }

  private describeError(error: unknown, editing: boolean): string {
    const apiError = toApiError(error);

    if (apiError.status === 409) {
      return 'Ya existe un festivo configurado para esa fecha.';
    }

    if (apiError.status === 404) {
      return 'El festivo ya no existe.';
    }

    if (apiError.status === 400) {
      return 'Los datos del festivo no son válidos.';
    }

    return editing
      ? 'No se ha podido actualizar el festivo.'
      : 'No se ha podido añadir el festivo.';
  }

  private buildYears(): number[] {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);
  }
}
