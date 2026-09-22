import { Component, inject, signal } from '@angular/core';

import { InterventionForm } from '../../components/intervention-form/intervention-form';
import { InterventionTable } from '../../components/intervention-table/intervention-table';
import { Intervention, InterventionStatus } from '../../models/intervention.model';
import { InterventionsService } from '../../services/interventions.service';

@Component({
  selector: 'yko-interventions-page',
  standalone: true,
  imports: [InterventionForm, InterventionTable],
  templateUrl: './interventions-page.html',
  styleUrl: './interventions-page.css',
})
export class InterventionsPage {
  private readonly interventionsService = inject(InterventionsService);

  readonly interventions = this.interventionsService.interventions;
  readonly feedbackMessage = signal('');

  interventionCreated(intervention: Intervention): void {
    this.feedbackMessage.set(`Intervención "${intervention.title}" registrada correctamente.`);
  }

  changeStatus(event: { id: string; status: InterventionStatus }): void {
    this.interventionsService.updateStatus(event.id, event.status);

    const message =
      event.status === 'IN_PROGRESS'
        ? 'Intervención marcada como en curso.'
        : 'Intervención marcada como completada.';

    this.feedbackMessage.set(message);
  }

  cancelIntervention(interventionId: string): void {
    this.interventionsService.cancelIntervention(interventionId);
    this.feedbackMessage.set('Intervención cancelada.');
  }
}
