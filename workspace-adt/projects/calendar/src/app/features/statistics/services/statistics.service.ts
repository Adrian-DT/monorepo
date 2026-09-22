import { Injectable, computed, inject } from '@angular/core';

import { InterventionsService } from '../../interventions/services/interventions.service';
import { OnCallService } from '../../on-call/services/on-call.service';
import { VacationsService } from '../../vacations/services/vacations';
import { GeneralStatistics, StatisticsUser, UserStatistics } from '../models/statistics.model';
import { HolidaysService } from '../../administration/holidays/services/holidays.service';

@Injectable({
  providedIn: 'root',
})
export class StatisticsService {
  private readonly vacationsService = inject(VacationsService);
  private readonly onCallService = inject(OnCallService);
  private readonly interventionsService = inject(InterventionsService);
  private readonly holidaysService = inject(HolidaysService);

  readonly users = computed<StatisticsUser[]>(() => {
    const users = new Map<string, string>();

    for (const user of this.onCallService.users()) {
      users.set(user.id, user.name);
    }

    for (const user of this.interventionsService.users()) {
      users.set(user.id, user.name);
    }

    for (const user of this.vacationsService.users()) {
      users.set(user.id, user.name);
    }

    return Array.from(users, ([id, name]) => ({
      id,
      name,
    })).sort((first, second) => first.name.localeCompare(second.name, 'es'));
  });

  getUserStatistics(year: number, userId: string): UserStatistics[] {
    const selectedUsers = userId ? this.users().filter((user) => user.id === userId) : this.users();

    return selectedUsers
      .map((user) => this.buildUserStatistics(user, year))
      .sort((first, second) => first.userName.localeCompare(second.userName, 'es'));
  }

  getGeneralStatistics(year: number, userId: string): GeneralStatistics {
    const userStatistics = this.getUserStatistics(year, userId);

    return {
      totalOnCallDays: userStatistics.reduce((total, user) => total + user.onCallDays, 0),
      totalInterventions: userStatistics.reduce((total, user) => total + user.interventionCount, 0),
      totalInterventionMinutes: userStatistics.reduce(
        (total, user) => total + user.interventionMinutes,
        0,
      ),
      totalVacationDays: userStatistics.reduce((total, user) => total + user.vacationDays, 0),
      pendingVacationRequests: this.getPendingVacationRequests(year, userId),
    };
  }

  private buildUserStatistics(user: StatisticsUser, year: number): UserStatistics {
    const onCallCoverage = this.getOnCallCoverage(user.id, year);

    const interventions = this.interventionsService
      .interventions()
      .filter(
        (intervention) =>
          intervention.userId === user.id &&
          intervention.status !== 'CANCELLED' &&
          this.belongsToYear(intervention.date, year),
      );

    const vacations = this.vacationsService
      .requests()
      .filter((request) => request.userId === user.id && request.status === 'APPROVED');

    return {
      userId: user.id,
      userName: user.name,
      onCallDays:
        onCallCoverage.workday +
        onCallCoverage.weekend +
        onCallCoverage.nationalHoliday +
        onCallCoverage.regionalHoliday +
        onCallCoverage.localHoliday,

      workdayOnCallDays: onCallCoverage.workday,
      weekendOnCallDays: onCallCoverage.weekend,
      nationalHolidayOnCallDays: onCallCoverage.nationalHoliday,
      regionalHolidayOnCallDays: onCallCoverage.regionalHoliday,
      localHolidayOnCallDays: onCallCoverage.localHoliday,
      interventionCount: interventions.length,
      interventionMinutes: interventions.reduce(
        (total, intervention) => total + (intervention.durationMinutes ?? 0),
        0,
      ),
      vacationDays: vacations.reduce(
        (total, vacation) =>
          total + this.countWeekdaysForYear(vacation.startDate, vacation.endDate, year),
        0,
      ),
      dayInterventions: interventions.filter((intervention) => intervention.shift === 'DAY').length,
      afternoonInterventions: interventions.filter(
        (intervention) => intervention.shift === 'AFTERNOON',
      ).length,
      nightInterventions: interventions.filter((intervention) => intervention.shift === 'NIGHT')
        .length,
    };
  }

  private getOnCallCoverage(
    userId: string,
    year: number,
  ): {
    workday: number;
    weekend: number;
    nationalHoliday: number;
    regionalHoliday: number;
    localHoliday: number;
  } {
    const coverage = this.onCallService
      .coverageDays()
      .filter((day) => day.userId === userId && this.belongsToYear(day.date, year));

    return {
      workday: coverage.filter((day) => day.type === 'WORKDAY').length,

      weekend: coverage.filter((day) => day.type === 'WEEKEND').length,

      nationalHoliday: coverage.filter((day) => day.type === 'NATIONAL_HOLIDAY').length,

      regionalHoliday: coverage.filter((day) => day.type === 'REGIONAL_HOLIDAY').length,

      localHoliday: coverage.filter((day) => day.type === 'LOCAL_HOLIDAY').length,
    };
  }

  private getPendingVacationRequests(year: number, userId: string): number {
    return this.vacationsService
      .requests()
      .filter(
        (request) =>
          request.status === 'PENDING' &&
          (!userId || request.userId === userId) &&
          this.belongsToYear(request.startDate, year),
      ).length;
  }

  private countDaysForYear(startDate: string, endDate: string, year: number): number {
    return this.getDatesBetween(startDate, endDate).filter((date) => this.belongsToYear(date, year))
      .length;
  }

  private countWeekdaysForYear(startDate: string, endDate: string, year: number): number {
    return this.getDatesBetween(startDate, endDate).filter((date) => {
      const isSelectedYear = this.belongsToYear(date, year);
      const dayOfWeek = this.parseDate(date).getDay();

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const isHoliday = this.holidaysService.isHoliday(date);

      return isSelectedYear && !isWeekend && !isHoliday;
    }).length;
  }

  private getDatesBetween(startDate: string, endDate: string): string[] {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    const dates: string[] = [];

    const current = new Date(start);

    while (current <= end) {
      dates.push(this.toIsoDate(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private belongsToYear(date: string, year: number): boolean {
    return Number(date.slice(0, 4)) === year;
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
