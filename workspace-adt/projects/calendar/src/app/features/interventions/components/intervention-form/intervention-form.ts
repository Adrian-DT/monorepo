import { Component, inject, output, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Intervention, InterventionShift, InterventionType } from '../../models/intervention.model';
import { InterventionsService } from '../../services/interventions.service';

@Component({
  selector: 'yko-intervention-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './intervention-form.html',
  styleUrl: './intervention-form.css',
})
export class InterventionForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly interventionsService = inject(InterventionsService);

  readonly created = output<Intervention>();
  readonly users = this.interventionsService.users;
  readonly durationPreview = signal<number | undefined>(undefined);

  readonly form = this.formBuilder.nonNullable.group({
    userId: ['', Validators.required],
    date: ['', Validators.required],
    shift: ['DAY' as InterventionShift, Validators.required],
    type: ['REMOTE' as InterventionType, Validators.required],
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
    startTime: [''],
    endTime: [''],
  });

  constructor() {
    this.form.controls.startTime.valueChanges.subscribe(() => this.updateDurationPreview());

    this.form.controls.endTime.valueChanges.subscribe(() => this.updateDurationPreview());
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const user = this.users().find((item) => item.id === value.userId);

    if (!user) {
      return;
    }

    const durationMinutes = this.interventionsService.calculateDuration(
      value.startTime,
      value.endTime,
    );

    const intervention = this.interventionsService.createIntervention({
      userId: user.id,
      userName: user.username,
      date: value.date,
      shift: value.shift,
      type: value.type,
      status: 'OPEN',
      title: value.title.trim(),
      description: value.description.trim() || undefined,
      startTime: value.startTime || undefined,
      endTime: value.endTime || undefined,
      durationMinutes,
    });

    this.form.reset({
      userId: '',
      date: '',
      shift: 'DAY',
      type: 'REMOTE',
      title: '',
      description: '',
      startTime: '',
      endTime: '',
    });

    this.durationPreview.set(undefined);
    this.created.emit(intervention);
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);

    return Boolean(control?.touched && control.hasError(errorName));
  }

  getDurationLabel(): string {
    const minutes = this.durationPreview();

    if (minutes === undefined) {
      return '';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} h`;
    }

    return `${hours} h ${remainingMinutes} min`;
  }

  private updateDurationPreview(): void {
    const { startTime, endTime } = this.form.getRawValue();

    this.durationPreview.set(this.interventionsService.calculateDuration(startTime, endTime));
  }
}
