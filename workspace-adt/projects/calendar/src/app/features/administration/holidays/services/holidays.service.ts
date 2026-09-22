import { Injectable, signal } from '@angular/core';

import { Holiday, HolidayScope } from '../models/holiday.model';

@Injectable({
  providedIn: 'root',
})
export class HolidaysService {
  private readonly holidaysState = signal<Holiday[]>([
    {
      id: 'holiday-2026-01-01',
      date: '2026-01-01',
      name: 'Año Nuevo',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-01-06',
      date: '2026-01-06',
      name: 'Epifanía del Señor',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-04-02',
      date: '2026-04-02',
      name: 'Jueves Santo',
      scope: 'REGIONAL',
      location: 'Castilla-La Mancha',
    },
    {
      id: 'holiday-2026-04-03',
      date: '2026-04-03',
      name: 'Viernes Santo',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-05-01',
      date: '2026-05-01',
      name: 'Fiesta del Trabajo',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-06-15',
      date: '2026-06-15',
      name: 'Festivo local de Toledo',
      scope: 'LOCAL',
      location: 'Toledo',
    },
    {
      id: 'holiday-2026-08-15',
      date: '2026-08-15',
      name: 'Asunción de la Virgen',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-10-12',
      date: '2026-10-12',
      name: 'Fiesta Nacional de España',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-11-01',
      date: '2026-11-01',
      name: 'Todos los Santos',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-12-06',
      date: '2026-12-06',
      name: 'Día de la Constitución Española',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-12-08',
      date: '2026-12-08',
      name: 'Inmaculada Concepción',
      scope: 'NATIONAL',
    },
    {
      id: 'holiday-2026-12-25',
      date: '2026-12-25',
      name: 'Navidad',
      scope: 'NATIONAL',
    },
  ]);

  readonly holidays = this.holidaysState.asReadonly();

  getByYear(year: number): Holiday[] {
    return this.holidaysState()
      .filter((holiday) => Number(holiday.date.slice(0, 4)) === year)
      .sort((first, second) => first.date.localeCompare(second.date));
  }

  isHoliday(date: string): boolean {
    return this.holidaysState().some((holiday) => holiday.date === date);
  }

  getHoliday(date: string): Holiday | undefined {
    return this.holidaysState().find((holiday) => holiday.date === date);
  }

  addHoliday(holiday: Omit<Holiday, 'id'>): Holiday {
    const alreadyExists = this.isHoliday(holiday.date);

    if (alreadyExists) {
      throw new Error(`Ya existe un festivo configurado para ${holiday.date}.`);
    }

    const newHoliday: Holiday = {
      ...holiday,
      id: `holiday-${Date.now()}`,
    };

    this.holidaysState.update((holidays) => [...holidays, newHoliday]);

    return newHoliday;
  }

  removeHoliday(holidayId: string): void {
    this.holidaysState.update((holidays) => holidays.filter((holiday) => holiday.id !== holidayId));
  }

  getScopeLabel(scope: HolidayScope): string {
    const labels: Record<HolidayScope, string> = {
      NATIONAL: 'Nacional',
      REGIONAL: 'Autonómico',
      LOCAL: 'Local',
    };

    return labels[scope];
  }
}
