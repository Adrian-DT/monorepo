import { Component, input, output } from '@angular/core';

import { CalendarEvent } from '../../models/calendar-event-model';

export interface CalendarDay {
  date: Date;
  isoDate: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'yko-work-calendar',
  standalone: true,
  template: `
    <div class="yko-calendar">
      <div class="yko-calendar__weekdays">
        <span>Lun</span>
        <span>Mar</span>
        <span>Mié</span>
        <span>Jue</span>
        <span>Vie</span>
        <span>Sáb</span>
        <span>Dom</span>
      </div>

      <div class="yko-calendar__grid">
        @for (day of days(); track day.isoDate) {
          <button
            type="button"
            class="yko-calendar-day"
            [class.yko-calendar-day--outside]="!day.isCurrentMonth"
            [class.yko-calendar-day--today]="day.isToday"
            (click)="daySelected.emit(day.isoDate)"
          >
            <span class="yko-calendar-day__number">
              {{ day.dayNumber }}
            </span>

            <span class="yko-calendar-day__events">
              @for (event of day.events; track event.id) {
                <span
                  class="yko-calendar-event"
                  [class]="'yko-calendar-event--' + event.type.toLowerCase()"
                >
                  {{ event.title }}
                </span>
              }
            </span>
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './work-calendar.css',
})
export class WorkCalendar {
  readonly days = input.required<CalendarDay[]>();
  readonly daySelected = output<string>();
}
