import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/config/api.config';
import { VacationsService } from './vacations.service';

function dto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    userId: 'u1',
    userName: 'María',
    startDate: '2026-11-02',
    endDate: '2026-11-06',
    workingDays: 5,
    status: 'PENDING',
    reason: 'Descanso',
    adminComment: null,
    createdAt: '2026-10-20T10:00:00+02:00',
    ...overrides,
  };
}

describe('VacationsService', () => {
  let service: VacationsService;
  let http: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(VacationsService);
    http = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => http.verify());

  function load(items: unknown[]): void {
    service.load();
    http.expectOne(`${baseUrl}/vacations`).flush(items);
  }

  it('loads requests sorted by start date (newest first) and turns nulls into undefined', () => {
    load([
      dto({ id: 'old', startDate: '2026-01-05', endDate: '2026-01-09' }),
      dto({ id: 'new', startDate: '2026-12-01', endDate: '2026-12-04', reason: null }),
    ]);

    expect(service.requests().map((request) => request.id)).toEqual(['new', 'old']);
    expect(service.requests()[0].reason).toBeUndefined();
    expect(service.requests()[0].adminComment).toBeUndefined();
  });

  it('empties the list when loading fails', () => {
    load([dto()]);

    service.load();
    http.expectOne(`${baseUrl}/vacations`).flush({}, { status: 500, statusText: 'Error' });

    expect(service.requests()).toEqual([]);
  });

  it('filters by user and status and groups by user', () => {
    load([
      dto({ id: 'a', userId: 'u1', status: 'PENDING' }),
      dto({ id: 'b', userId: 'u2', status: 'APPROVED', startDate: '2026-12-01' }),
    ]);

    expect(service.getRequestsByUser('u1').map((request) => request.id)).toEqual(['a']);
    expect(service.filterRequests('', 'APPROVED').map((request) => request.id)).toEqual(['b']);
    expect(service.filterRequests('u2', 'PENDING')).toEqual([]);
    expect(service.filterRequests('', '').length).toBe(2);
  });

  it('creates a request sending only dates and reason, and adds the server response', () => {
    load([]);

    let workingDays = 0;

    service
      .create({ startDate: '2026-11-02', endDate: '2026-11-06', reason: 'Descanso' })
      .subscribe((created) => (workingDays = created.workingDays));

    const request = http.expectOne({ method: 'POST', url: `${baseUrl}/vacations` });
    expect(request.request.body).toEqual({
      startDate: '2026-11-02',
      endDate: '2026-11-06',
      reason: 'Descanso',
    });

    request.flush(dto({ workingDays: 4 }));

    expect(workingDays).toBe(4);
    expect(service.requests().length).toBe(1);
  });

  it('keeps the list unchanged when the backend reports an overlap', () => {
    load([dto()]);

    let code = '';

    service
      .create({ startDate: '2026-11-03', endDate: '2026-11-03', reason: 'x' })
      .subscribe({ error: (error) => (code = error.error.code) });

    http
      .expectOne({ method: 'POST', url: `${baseUrl}/vacations` })
      .flush({ code: 'OVERLAP' }, { status: 409, statusText: 'Conflict' });

    expect(code).toBe('OVERLAP');
    expect(service.requests().length).toBe(1);
  });

  it('cancels a request with POST and replaces it in the list', () => {
    load([dto()]);

    service.cancel('v1').subscribe();

    http
      .expectOne({ method: 'POST', url: `${baseUrl}/vacations/v1/cancel` })
      .flush(dto({ status: 'CANCELLED' }));

    expect(service.requests()[0].status).toBe('CANCELLED');
  });

  it('decides a request and reflects the recalculated working days', () => {
    load([dto()]);

    service.decide('v1', 'APPROVED', '  Adelante  ').subscribe();

    const request = http.expectOne({
      method: 'POST',
      url: `${baseUrl}/admin/vacations/v1/decision`,
    });

    expect(request.request.body).toEqual({ decision: 'APPROVED', adminComment: 'Adelante' });

    request.flush(dto({ status: 'APPROVED', workingDays: 4, adminComment: 'Adelante' }));

    expect(service.requests()[0].status).toBe('APPROVED');
    expect(service.requests()[0].workingDays).toBe(4);
    expect(service.requests()[0].adminComment).toBe('Adelante');
  });

  it('omits an empty admin comment', () => {
    load([dto()]);

    service.decide('v1', 'REJECTED', '   ').subscribe();

    const request = http.expectOne(`${baseUrl}/admin/vacations/v1/decision`);
    expect(request.request.body.adminComment).toBeUndefined();

    request.flush(dto({ status: 'REJECTED' }));
  });

  it('clears the list', () => {
    load([dto()]);

    service.clear();

    expect(service.requests()).toEqual([]);
  });
});
