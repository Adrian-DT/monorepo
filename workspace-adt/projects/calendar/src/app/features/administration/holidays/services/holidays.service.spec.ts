import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { HolidaysService } from './holidays.service';

const newYear = { id: 'h1', date: '2026-01-01', name: 'Año Nuevo', scope: 'NATIONAL', location: null };
const toledo = {
  id: 'h2',
  date: '2026-06-15',
  name: 'Festivo local de Toledo',
  scope: 'LOCAL',
  location: 'Toledo',
};

describe('HolidaysService', () => {
  let service: HolidaysService;
  let http: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(HolidaysService);
    http = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => http.verify());

  function loadBoth(): void {
    service.load();
    http.expectOne(`${baseUrl}/holidays`).flush([toledo, newYear]);
  }

  it('loads holidays sorted by date and turns null locations into undefined', () => {
    loadBoth();

    expect(service.holidays().map((holiday) => holiday.id)).toEqual(['h1', 'h2']);
    expect(service.holidays()[0].location).toBeUndefined();
    expect(service.holidays()[1].location).toBe('Toledo');
  });

  it('answers date queries from the loaded holidays', () => {
    loadBoth();

    expect(service.isHoliday('2026-01-01')).toBe(true);
    expect(service.isHoliday('2026-01-02')).toBe(false);
    expect(service.getHoliday('2026-06-15')?.scope).toBe('LOCAL');
    expect(service.getByYear(2026).length).toBe(2);
    expect(service.getByYear(2027)).toEqual([]);
  });

  it('empties the list when loading fails', () => {
    loadBoth();

    service.load();
    http.expectOne(`${baseUrl}/holidays`).flush({}, { status: 500, statusText: 'Error' });

    expect(service.holidays()).toEqual([]);
  });

  it('adds a holiday with POST and keeps the list sorted', () => {
    loadBoth();

    service.add({ date: '2026-03-19', name: 'San José', scope: 'REGIONAL' }).subscribe();

    const request = http.expectOne({ method: 'POST', url: `${baseUrl}/admin/holidays` });
    expect(request.request.body).toEqual({
      date: '2026-03-19',
      name: 'San José',
      scope: 'REGIONAL',
    });

    request.flush({ id: 'h3', date: '2026-03-19', name: 'San José', scope: 'REGIONAL', location: null });

    expect(service.holidays().map((holiday) => holiday.id)).toEqual(['h1', 'h3', 'h2']);
  });

  it('updates a holiday with PUT and re-sorts when the date changes', () => {
    loadBoth();

    service
      .update('h1', { date: '2026-12-31', name: 'Fin de año', scope: 'NATIONAL' })
      .subscribe();

    const request = http.expectOne({ method: 'PUT', url: `${baseUrl}/admin/holidays/h1` });
    request.flush({ id: 'h1', date: '2026-12-31', name: 'Fin de año', scope: 'NATIONAL', location: null });

    expect(service.holidays().map((holiday) => holiday.name)).toEqual([
      'Festivo local de Toledo',
      'Fin de año',
    ]);
  });

  it('keeps the list unchanged when the backend rejects a duplicate date', () => {
    loadBoth();

    let status = 0;

    service
      .add({ date: '2026-01-01', name: 'Repetido', scope: 'NATIONAL' })
      .subscribe({ error: (error) => (status = error.status) });

    http
      .expectOne({ method: 'POST', url: `${baseUrl}/admin/holidays` })
      .flush({ code: 'DUPLICATE_DATE' }, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
    expect(service.holidays().length).toBe(2);
  });

  it('removes a holiday with DELETE', () => {
    loadBoth();

    service.remove('h2').subscribe();

    http
      .expectOne({ method: 'DELETE', url: `${baseUrl}/admin/holidays/h2` })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(service.holidays().map((holiday) => holiday.id)).toEqual(['h1']);
  });

  it('clears the list', () => {
    loadBoth();

    service.clear();

    expect(service.holidays()).toEqual([]);
  });

  it('returns readable scope labels', () => {
    expect(service.getScopeLabel('NATIONAL')).toBe('Nacional');
    expect(service.getScopeLabel('REGIONAL')).toBe('Autonómico');
    expect(service.getScopeLabel('LOCAL')).toBe('Local');
  });
});
