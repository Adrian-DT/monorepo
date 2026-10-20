import { Component, inject, output, signal } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { toApiError } from '../../../../core/http/api-error';
import { VacationRequest } from '../../models/vacation-request.model';
import { VacationsService } from '../../services/vacations.service';

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

  readonly submitted = output<VacationRequest>();

  readonly saving = signal(false);
  readonly errorMessage = signal('');

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
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    this.saving.set(true);
    this.errorMessage.set('');

    this.vacationsService
      .create({
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        reason: formValue.reason.trim(),
      })
      .subscribe({
        next: (request) => {
          this.saving.set(false);
          this.form.reset();
          this.submitted.emit(request);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(this.describeError(error));
        },
      });
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);

    return Boolean(control?.touched && control.hasError(errorName));
  }

  hasDateRangeError(): boolean {
    return Boolean(this.form.touched && this.form.hasError('invalidDateRange'));
  }

  private describeError(error: unknown): string {
    const apiError = toApiError(error);

    if (apiError.code === 'OVERLAP') {
      return 'Ya tienes una solicitud pendiente o aprobada que incluye alguna de esas fechas.';
    }

    if (apiError.code === 'NO_WORKING_DAYS') {
      return 'El periodo seleccionado no incluye ningún día laborable.';
    }

    if (apiError.status === 400) {
      return 'Los datos de la solicitud no son válidos.';
    }

    return 'No se pudo enviar la solicitud. Inténtalo de nuevo.';
  }

  private dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    if (!startDate || !endDate) {
      return null;
    }

    return endDate >= startDate ? null : { invalidDateRange: true };
  }
}
