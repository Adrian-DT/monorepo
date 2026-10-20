import { Injectable, inject, signal } from '@angular/core';

import { Observable, map, tap } from 'rxjs';

import { ApiService } from '../../../../core/http/api.service';
import { Holiday, HolidayRequest, HolidayScope } from '../models/holiday.model';

interface HolidayDto extends Omit<Holiday, 'location'> {
  location?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class HolidaysService {
  private readonly apiService = inject(ApiService);

  private readonly holidaysState = signal<Holiday[]>([]);

  readonly holidays = this.holidaysState.asReadonly();

  load(): void {
    this.apiService.get<HolidayDto[]>('holidays').subscribe({
      next: (holidays) => this.holidaysState.set(this.sort(holidays.map(this.fromDto))),
      error: () => this.holidaysState.set([]),
    });
  }

  clear(): void {
    this.holidaysState.set([]);
  }

  add(request: HolidayRequest): Observable<Holiday> {
    return this.apiService.post<HolidayDto>('admin/holidays', request).pipe(
      map(this.fromDto),
      tap((holiday) => this.holidaysState.update((holidays) => this.sort([...holidays, holiday]))),
    );
  }

  update(holidayId: string, request: HolidayRequest): Observable<Holiday> {
    return this.apiService.put<HolidayDto>(`admin/holidays/${holidayId}`, request).pipe(
      map(this.fromDto),
      tap((updated) =>
        this.holidaysState.update((holidays) =>
          this.sort(holidays.map((holiday) => (holiday.id === holidayId ? updated : holiday))),
        ),
      ),
    );
  }

  remove(holidayId: string): Observable<void> {
    return this.apiService
      .delete<void>(`admin/holidays/${holidayId}`)
      .pipe(
        tap(() =>
          this.holidaysState.update((holidays) =>
            holidays.filter((holiday) => holiday.id !== holidayId),
          ),
        ),
      );
  }

  getByYear(year: number): Holiday[] {
    return this.holidaysState().filter((holiday) => Number(holiday.date.slice(0, 4)) === year);
  }

  isHoliday(date: string): boolean {
    return this.holidaysState().some((holiday) => holiday.date === date);
  }

  getHoliday(date: string): Holiday | undefined {
    return this.holidaysState().find((holiday) => holiday.date === date);
  }

  getScopeLabel(scope: HolidayScope): string {
    const labels: Record<HolidayScope, string> = {
      NATIONAL: 'Nacional',
      REGIONAL: 'Autonómico',
      LOCAL: 'Local',
    };

    return labels[scope];
  }

  private fromDto(dto: HolidayDto): Holiday {
    return { ...dto, location: dto.location ?? undefined };
  }

  private sort(holidays: Holiday[]): Holiday[] {
    return [...holidays].sort((first, second) => first.date.localeCompare(second.date));
  }
}
