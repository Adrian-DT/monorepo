import { Component } from '@angular/core';

@Component({
  selector: 'yko-calendar-legend',
  standalone: true,
  template: `
    <div class="yko-calendar-legend">
      <span>
        <i class="yko-calendar-legend__color yko-calendar-legend__color--vacation"></i>
        Vacaciones
      </span>

      <span>
        <i class="yko-calendar-legend__color yko-calendar-legend__color--on-call"></i>
        Guardias
      </span>

      <span>
        <i class="yko-calendar-legend__color yko-calendar-legend__color--intervention"></i>
        Intervenciones
      </span>

      <span>
        <i class="yko-calendar-legend__color yko-calendar-legend__color--holiday"></i>
        Festivos
      </span>
    </div>
  `,
  styleUrl: './calendar-legend.css',
})
export class CalendarLegend {}
