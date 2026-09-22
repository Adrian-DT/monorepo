import { Component, input, output } from '@angular/core';

import { OnCallUser } from '../../services/on-call.service';

@Component({
  selector: 'yko-on-call-user-selector',
  standalone: true,
  template: `
    <div class="yko-on-call-user-selector">
      <label for="onCallUserId"> Usuario </label>

      <select
        id="onCallUserId"
        [value]="selectedUserId()"
        (change)="userChanged.emit(getValue($event))"
      >
        <option value="">Selecciona un usuario</option>

        @for (user of users(); track user.id) {
          <option [value]="user.id">
            {{ user.name }}
          </option>
        }
      </select>
    </div>
  `,
  styleUrl: './on-call-user-selector.css',
})
export class OnCallUserSelector {
  readonly users = input.required<OnCallUser[]>();
  readonly selectedUserId = input.required<string>();

  readonly userChanged = output<string>();

  getValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}
