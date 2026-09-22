import { Injectable, computed, inject, signal } from '@angular/core';

import { OnCallService } from '../../on-call/services/on-call.service';
import { VacationsService } from '../../vacations/services/vacations';
import { CalendarEvent, CalendarEventType } from '../models/calendar-event-model';
import { InterventionsService } from '../../interventions/services/interventions.service';
import { HolidaysService } from '../../administration/holidays/services/holidays.service';

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly vacationsService = inject(VacationsService);
  private readonly onCallService = inject(OnCallService);
  private readonly interventionsService = inject(InterventionsService);
  private readonly holidaysService = inject(HolidaysService);

  private readonly fixedEventsState = signal<CalendarEvent[]>([]);

  readonly events = computed(() => [
    ...this.fixedEventsState(),
    ...this.getHolidayEvents(),
    ...this.getApprovedVacationEvents(),
    ...this.getOnCallEvents(),
    ...this.getInterventionEvents(),
  ]);

  readonly eventTypes: CalendarEventType[] = ['VACATION', 'ON_CALL', 'INTERVENTION', 'HOLIDAY'];

  eventsForDate(date: string): CalendarEvent[] {
    return this.events().filter((event) => event.date === date);
  }

  filterEvents(userId: string, types: CalendarEventType[]): CalendarEvent[] {
    return this.events().filter((event) => {
      const matchesUser = !userId || event.userId === userId;

      const matchesType = types.length === 0 || types.includes(event.type);

      return matchesUser && matchesType;
    });
  }

  getUsers(): { id: string; name: string }[] {
    const userMap = new Map<string, string>();

    for (const event of this.events()) {
      if (event.userId && event.userName) {
        userMap.set(event.userId, event.userName);
      }
    }

    return Array.from(userMap, ([id, name]) => ({
      id,
      name,
    }));
  }

  addEvent(event: CalendarEvent): void {
    this.fixedEventsState.update((events) => [...events, event]);
  }

  removeEvent(eventId: string): void {
    this.fixedEventsState.update((events) => events.filter((event) => event.id !== eventId));
  }

  private getHolidayEvents(): CalendarEvent[] {
    return this.holidaysService.holidays().map((holiday) => ({
      id: `calendar-${holiday.id}`,
      title: holiday.name,
      date: holiday.date,
      type: 'HOLIDAY' as const,
      description: this.getHolidayDescription(holiday.scope, holiday.location),
    }));
  }

  private getHolidayDescription(
    scope: 'NATIONAL' | 'REGIONAL' | 'LOCAL',
    location?: string,
  ): string {
    const labels = {
      NATIONAL: 'Festivo nacional',
      REGIONAL: 'Festivo autonómico',
      LOCAL: 'Festivo local',
    };

    return location ? `${labels[scope]} · ${location}` : labels[scope];
  }

  private getApprovedVacationEvents(): CalendarEvent[] {
    return this.vacationsService
      .requests()
      .filter((request) => request.status === 'APPROVED')
      .flatMap((request) =>
        this.getWeekdaysBetween(request.startDate, request.endDate).map((date) => ({
          id: `vacation-${request.id}-${date}`,
          title: `Vacaciones · ${request.userName}`,
          date,
          type: 'VACATION' as const,
          userId: request.userId,
          userName: request.userName,
          description: request.reason || 'Vacaciones aprobadas',
        })),
      );
  }

  private getOnCallEvents(): CalendarEvent[] {
    return this.onCallService.coverageDays().map((coverage) => ({
      id: `on-call-${coverage.assignmentId}-${coverage.date}`,
      title: `Guardia · ${coverage.userName}`,
      date: coverage.date,
      type: 'ON_CALL' as const,
      userId: coverage.userId,
      userName: coverage.userName,
      description: this.getOnCallDescription(coverage.type, coverage.notes),
    }));
  }

  private getOnCallDescription(
    type: 'WORKDAY' | 'WEEKEND' | 'NATIONAL_HOLIDAY' | 'REGIONAL_HOLIDAY' | 'LOCAL_HOLIDAY',
    notes?: string,
  ): string {
    const labels = {
      WORKDAY: 'Guardia en día laborable: después del horario de oficina',
      WEEKEND: 'Guardia de 24 horas: fin de semana',
      NATIONAL_HOLIDAY: 'Guardia de 24 horas: festivo nacional',
      REGIONAL_HOLIDAY: 'Guardia de 24 horas: festivo autonómico',
      LOCAL_HOLIDAY: 'Guardia de 24 horas: festivo local',
    };

    const label = labels[type];

    return notes ? `${label}. ${notes}` : label;
  }

  private getWeekdaysBetween(startDate: string, endDate: string): string[] {
    return this.getDatesBetween(startDate, endDate).filter((date) => {
      const dayOfWeek = this.parseDate(date).getDay();

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const isHoliday = this.holidaysService.isHoliday(date);

      return !isWeekend && !isHoliday;
    });
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

  private getInterventionEvents(): CalendarEvent[] {
    return this.interventionsService.activeInterventions().map((intervention) => ({
      id: `intervention-${intervention.id}`,
      title: `Intervención · ${intervention.userName}`,
      date: intervention.date,
      type: 'INTERVENTION' as const,
      userId: intervention.userId,
      userName: intervention.userName,
      description: this.getInterventionDescription(intervention),
    }));
  }

  private getInterventionDescription(intervention: {
    title: string;
    shift: 'DAY' | 'AFTERNOON' | 'NIGHT';
    type: 'REMOTE' | 'ONSITE';
    startTime?: string;
    endTime?: string;
    description?: string;
  }): string {
    const shiftLabels = {
      DAY: 'Diurna',
      AFTERNOON: 'Tarde',
      NIGHT: 'Nocturna',
    };

    const typeLabels = {
      REMOTE: 'Remota',
      ONSITE: 'Presencial',
    };

    const timeRange =
      intervention.startTime && intervention.endTime
        ? ` (${intervention.startTime} - ${intervention.endTime})`
        : '';

    const details =
      `${shiftLabels[intervention.shift]} · ` + `${typeLabels[intervention.type]}${timeRange}`;

    return intervention.description
      ? `${intervention.title}. ${details}. ${intervention.description}`
      : `${intervention.title}. ${details}`;
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
