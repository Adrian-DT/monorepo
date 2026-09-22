import { Component, inject, output, signal } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { OnCallAssignment } from '../../models/on-call-assignment.model';
import { OnCallService } from '../../services/on-call.service';
import { OnCallUserSelector } from '../on-call-user-selector/on-call-user-selector';

@Component({
  selector: 'yko-on-call-assignment-form',
  standalone: true,
  imports: [ReactiveFormsModule, OnCallUserSelector],
  templateUrl: './on-call-assignment-form.html',
  styleUrl: './on-call-assignment-form.css',
})
export class OnCallAssignmentForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly onCallService = inject(OnCallService);

  readonly onCallAssignmentCreated = output<OnCallAssignment>();
  readonly users = this.onCallService.users;
  readonly overlapMessage = signal('');

  readonly form = this.formBuilder.nonNullable.group(
    {
      userId: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      notes: ['', Validators.maxLength(250)],
    },
    {
      validators: [this.dateRangeValidator],
    },
  );

  submit(): void {
    this.overlapMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const overlaps = this.onCallService.findOverlaps(value.startDate, value.endDate);

    if (overlaps.length > 0) {
      this.overlapMessage.set(overlaps.map((overlap) => overlap.message).join(' '));

      return;
    }

    const selectedUser = this.users().find((user) => user.id === value.userId);

    if (!selectedUser) {
      this.overlapMessage.set('Debes seleccionar un usuario válido.');

      return;
    }

    const assignment = this.onCallService.createAssignment({
      userId: selectedUser.id,
      userName: selectedUser.name,
      startDate: value.startDate,
      endDate: value.endDate,
      status: 'CONFIRMED',
      notes: value.notes.trim() || undefined,
    });

    this.form.reset({
      userId: '',
      startDate: '',
      endDate: '',
      notes: '',
    });

    this.onCallAssignmentCreated.emit(assignment);
  }

  changeUser(userId: string): void {
    this.form.controls.userId.setValue(userId);
    this.form.controls.userId.markAsTouched();
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
}
