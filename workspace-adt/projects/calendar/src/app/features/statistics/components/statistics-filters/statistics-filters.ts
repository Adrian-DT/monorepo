import { Component, input, output } from '@angular/core';

import { StatisticsUser } from '../../models/statistics.model';

@Component({
  selector: 'yko-statistics-filters',
  standalone: true,
  templateUrl: './statistics-filters.html',
  styleUrl: './statistics-filters.css',
})
export class StatisticsFilters {
  readonly year = input.required<number>();
  readonly userId = input.required<string>();
  readonly users = input.required<StatisticsUser[]>();

  readonly yearChanged = output<number>();
  readonly userChanged = output<string>();

  readonly years = this.buildYears();

  onYearChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    this.yearChanged.emit(Number(value));
  }

  onUserChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    this.userChanged.emit(value);
  }

  private buildYears(): number[] {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
  }
}
