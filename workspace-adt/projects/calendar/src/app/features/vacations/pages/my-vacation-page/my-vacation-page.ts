import { Component, computed, inject, signal } from '@angular/core';

import { VacationRequestForm } from '../../components/vacation-request-form/vacation-request-form';
import { VacationRequestList } from '../../components/vacation-request-list/vacation-request-list';
import { VacationRequest } from '../../models/vacation-request.model';
import { VacationsService } from '../../services/vacations.service';
import { AuthService } from '../../../../core/auth/auth';

@Component({
  selector: 'yko-my-vacation-page',
  standalone: true,
  imports: [VacationRequestForm, VacationRequestList],
  templateUrl: './my-vacation-page.html',
  styleUrl: './my-vacation-page.css',
})
export class MyVacationPage {
  private readonly vacationsService = inject(VacationsService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  readonly requests = computed(() => {
    const userId = this.currentUser()?.id;

    return userId ? this.vacationsService.getRequestsByUser(userId) : [];
  });

  readonly successMessage = signal('');

  requestCreated(request: VacationRequest): void {
    this.successMessage.set(
      `Solicitud creada correctamente para ${request.workingDays} día(s) laborable(s).`,
    );
  }

  cancelRequest(requestId: string): void {
    this.vacationsService.cancelRequest(requestId);
    this.successMessage.set('Solicitud cancelada correctamente.');
  }
}
