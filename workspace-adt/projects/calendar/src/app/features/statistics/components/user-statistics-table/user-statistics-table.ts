import { Component, input } from '@angular/core';

import { UserStatistics } from '../../models/statistics.model';

@Component({
  selector: 'yko-user-statistics-table',
  standalone: true,
  templateUrl: './user-statistics-table.html',
  styleUrl: './user-statistics-table.css',
})
export class UserStatisticsTable {
  readonly statistics = input.required<UserStatistics[]>();

  formatDuration(minutes: number): string {
    if (minutes === 0) {
      return '0 min';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    return remainingMinutes === 0 ? `${hours} h` : `${hours} h ${remainingMinutes} min`;
  }
}
