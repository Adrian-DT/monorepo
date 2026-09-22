import { Component, computed, inject, signal } from '@angular/core';

import { CalendarDay, WorkCalendar } from '../../components/work-calendar/work-calendar';
import { CalendarToolbar } from '../../components/calendar-toolbar/calendar-toolbar';
import { CalendarEvent } from '../../models/calendar-event-model';
import { CalendarService } from '../../services/calendar.service';
import { CalendarFilters } from '../../components/calendar-filters/calendar-filters';
import { CalendarLegend } from '../../components/calendar-legend/calendar-legend';
import { CalendarEventType } from '../../models/calendar-event-model';

@Component({
  selector: 'yko-calendar-page',
  standalone: true,
  imports: [CalendarToolbar, WorkCalendar, CalendarFilters, CalendarLegend],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.css',
})
export class CalendarPage {
  readonly calendarService = inject(CalendarService);

  readonly currentMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  readonly selectedDate = signal<string | null>(null);

  readonly monthTitle = computed(() =>
    new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
    }).format(this.currentMonth()),
  );

  readonly calendarDays = computed(() => {
    const filteredEvents = this.calendarService.filterEvents(
      this.selectedUserId(),
      this.selectedTypes(),
    );

    return this.buildMonthDays(this.currentMonth(), filteredEvents);
  });

  readonly selectedEvents = computed(() => {
    const date = this.selectedDate();

    if (!date) {
      return [];
    }

    return this.calendarService.eventsForDate(date);
  });

  readonly selectedUserId = signal('');

  readonly selectedTypes = signal<CalendarEventType[]>([]);

  readonly users = computed(() => this.calendarService.getUsers());

  previousMonth(): void {
    const month = this.currentMonth();

    this.currentMonth.set(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const month = this.currentMonth();

    this.currentMonth.set(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  goToToday(): void {
    const today = new Date();

    this.currentMonth.set(new Date(today.getFullYear(), today.getMonth(), 1));

    this.selectedDate.set(this.toIsoDate(today));
  }

  selectDay(date: string): void {
    this.selectedDate.set(date);
  }

  private buildMonthDays(month: Date, events: CalendarEvent[]): CalendarDay[] {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay = new Date(year, monthIndex, 1);
    const mondayIndex = (firstDay.getDay() + 6) % 7;

    const gridStart = new Date(year, monthIndex, 1 - mondayIndex);
    const todayIso = this.toIsoDate(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      );

      const isoDate = this.toIsoDate(date);

      return {
        date,
        isoDate,
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === monthIndex,
        isToday: isoDate === todayIso,
        events: events.filter((event) => event.date === isoDate),
      };
    });
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  changeUser(userId: string): void {
    this.selectedUserId.set(userId);
  }

  changeTypes(types: CalendarEventType[]): void {
    this.selectedTypes.set(types);
  }

  clearFilters(): void {
    this.selectedUserId.set('');
    this.selectedTypes.set([]);
  }
}
