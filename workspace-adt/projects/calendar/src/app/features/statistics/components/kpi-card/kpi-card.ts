import { Component, input } from '@angular/core';

@Component({
  selector: 'yko-kpi-card',
  standalone: true,
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly description = input('');
  readonly tone = input<'blue' | 'green' | 'orange' | 'purple' | 'red'>('blue');
}
