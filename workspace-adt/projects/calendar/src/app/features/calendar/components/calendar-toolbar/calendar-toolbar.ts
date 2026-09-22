import { Component, input, output } from '@angular/core';

@Component({
  selector: 'yko-calendar-toolbar',
  standalone: true,
  template: `
    <div class="yko-calendar-toolbar">
      <div class="yko-calendar-toolbar__navigation">
        <button type="button" (click)="previous.emit()">←</button>

        <button type="button" (click)="today.emit()">Hoy</button>

        <button type="button" (click)="next.emit()">→</button>
      </div>

      <h2 class="yko-calendar-toolbar__title">
        {{ title() }}
      </h2>
    </div>
  `,
  styleUrl: './calendar-toolbar.css',
})
export class CalendarToolbar {
  readonly title = input.required<string>();

  readonly previous = output<void>();
  readonly today = output<void>();
  readonly next = output<void>();
}
