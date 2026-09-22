import { Component, input, output } from '@angular/core';

import { CalendarEventType } from '../../models/calendar-event-model';

export interface CalendarUser {
  id: string;
  name: string;
}

@Component({
  selector: 'yko-calendar-filters',
  standalone: true,
  template: `
    <section class="yko-calendar-filters">
      <div class="yko-calendar-filters__field">
        <label for="calendar-user-filter"> Usuario </label>

        <select
          id="calendar-user-filter"
          [value]="selectedUserId()"
          (change)="userChanged.emit(getSelectValue($event))"
        >
          <option value="">Todos los usuarios</option>

          @for (user of users(); track user.id) {
            <option [value]="user.id">
              {{ user.name }}
            </option>
          }
        </select>
      </div>

      <fieldset class="yko-calendar-filters__types">
        <legend>Tipos de evento</legend>

        @for (type of availableTypes(); track type) {
          <label>
            <input
              type="checkbox"
              [checked]="selectedTypes().includes(type)"
              (change)="toggleType(type)"
            />
            {{ getTypeLabel(type) }}
          </label>
        }
      </fieldset>

      <button type="button" class="yko-calendar-filters__clear" (click)="clear.emit()">
        Limpiar filtros
      </button>
    </section>
  `,
  styleUrl: './calendar-filters.css',
})
export class CalendarFilters {
  readonly users = input.required<CalendarUser[]>();
  readonly selectedUserId = input.required<string>();
  readonly selectedTypes = input.required<CalendarEventType[]>();
  readonly availableTypes = input.required<CalendarEventType[]>();

  readonly userChanged = output<string>();
  readonly typesChanged = output<CalendarEventType[]>();
  readonly clear = output<void>();

  toggleType(type: CalendarEventType): void {
    const currentTypes = this.selectedTypes();

    const nextTypes = currentTypes.includes(type)
      ? currentTypes.filter((item) => item !== type)
      : [...currentTypes, type];

    this.typesChanged.emit(nextTypes);
  }

  getTypeLabel(type: CalendarEventType): string {
    const labels: Record<CalendarEventType, string> = {
      VACATION: 'Vacaciones',
      ON_CALL: 'Guardias',
      INTERVENTION: 'Intervenciones',
      HOLIDAY: 'Festivos',
    };

    return labels[type];
  }

  getSelectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}
