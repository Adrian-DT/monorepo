import { Component, computed, inject, signal } from '@angular/core';

import { KpiCard } from '../../components/kpi-card/kpi-card';
import { StatisticsFilters } from '../../components/statistics-filters/statistics-filters';
import { UserStatisticsTable } from '../../components/user-statistics-table/user-statistics-table';
import { StatisticsService } from '../../services/statistics.service';

@Component({
  selector: 'yko-statistics-page',
  standalone: true,
  imports: [KpiCard, StatisticsFilters, UserStatisticsTable],
  templateUrl: './statistics-page.html',
  styleUrl: './statistics-page.css',
})
export class StatisticsPage {
  private readonly statisticsService = inject(StatisticsService);

  readonly selectedYear = signal(new Date().getFullYear());
  readonly selectedUserId = signal('');

  readonly users = this.statisticsService.users;

  readonly userStatistics = computed(() =>
    this.statisticsService.getUserStatistics(this.selectedYear(), this.selectedUserId()),
  );

  readonly generalStatistics = computed(() =>
    this.statisticsService.getGeneralStatistics(this.selectedYear(), this.selectedUserId()),
  );

  changeYear(year: number): void {
    this.selectedYear.set(year);
  }

  changeUser(userId: string): void {
    this.selectedUserId.set(userId);
  }

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
