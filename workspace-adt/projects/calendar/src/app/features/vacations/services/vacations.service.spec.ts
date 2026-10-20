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

function cancellationDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    vacationId: 'v1',
    userId: 'u1',
    userName: 'María',
    fromDate: '2026-11-04',
    toDate: '2026-11-06',
    status: 'PENDING',
    requestedBy: 'u1',
    requestReason: 'Imprevisto',
    resolutionComment: null,
    releasedWorkingDays: null,
    originalStartDate: '2026-11-02',
    originalEndDate: '2026-11-06',
    originalWorkingDays: 5,
    createdAt: '2026-10-21T10:00:00+02:00',
    resolvedAt: null,
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

  function load(items: unknown[], cancellations: unknown[] = []): void {
    service.load();
    http.expectOne(`${baseUrl}/vacations`).flush(items);
    http.expectOne(`${baseUrl}/vacations/cancellation-requests`).flush(cancellations);
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

  it('empties both lists when loading fails', () => {
    load([dto()], [cancellationDto()]);

    service.load();
    http.expectOne(`${baseUrl}/vacations`).flush({}, { status: 500, statusText: 'Error' });
    http
      .expectOne(`${baseUrl}/vacations/cancellation-requests`)
      .flush({}, { status: 500, statusText: 'Error' });

    expect(service.requests()).toEqual([]);
    expect(service.cancellations()).toEqual([]);
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

  it('clears both lists', () => {
    load([dto()], [cancellationDto()]);

    service.clear();

    expect(service.requests()).toEqual([]);
    expect(service.cancellations()).toEqual([]);
  });

  describe('cancellations', () => {
    it('loads cancellation requests, turns nulls into undefined and exposes the pending ones', () => {
      load(
        [dto({ status: 'APPROVED' })],
        [
          cancellationDto({ id: 'c1', status: 'PENDING', createdAt: '2026-10-22T10:00:00+02:00' }),
          cancellationDto({
            id: 'c2',
            status: 'REJECTED',
            resolutionComment: 'Sin cobertura',
            createdAt: '2026-10-21T10:00:00+02:00',
          }),
        ],
      );

      expect(service.cancellations().map((item) => item.id)).toEqual(['c1', 'c2']);
      expect(service.cancellations()[0].resolutionComment).toBeUndefined();
      expect(service.cancellations()[0].releasedWorkingDays).toBeUndefined();
      expect(service.pendingCancellations().map((item) => item.id)).toEqual(['c1']);
      expect(service.getCancellationsByVacation('v1').length).toBe(2);
      expect(service.getCancellationsByVacation('other')).toEqual([]);
    });

    it('requests a cancellation sending the trimmed reason and keeps the vacation untouched', () => {
      load([dto({ status: 'APPROVED' })]);

      let created = '';

      service
        .requestCancellation('v1', {
          fromDate: '2026-11-04',
          toDate: '2026-11-06',
          reason: '  Imprevisto  ',
        })
        .subscribe((item) => (created = item.status));

      const request = http.expectOne({
        method: 'POST',
        url: `${baseUrl}/vacations/v1/cancellation-requests`,
      });

      expect(request.request.body).toEqual({
        fromDate: '2026-11-04',
        toDate: '2026-11-06',
        reason: 'Imprevisto',
      });

      request.flush({
        cancellation: cancellationDto(),
        vacations: [dto({ status: 'APPROVED' })],
      });

      expect(created).toBe('PENDING');
      expect(service.pendingCancellations().length).toBe(1);
      expect(service.requests()[0].status).toBe('APPROVED');
    });

    it('requests a cancellation of the whole period without dates', () => {
      load([dto({ status: 'APPROVED' })]);

      service.requestCancellation('v1', { reason: 'Todo' }).subscribe();

      const request = http.expectOne(`${baseUrl}/vacations/v1/cancellation-requests`);
      expect(request.request.body.fromDate).toBeUndefined();
      expect(request.request.body.toDate).toBeUndefined();

      request.flush({ cancellation: cancellationDto(), vacations: [] });
    });

    it('does not add anything when the request is rejected by the backend', () => {
      load([dto({ status: 'APPROVED' })]);

      let code = '';

      service
        .requestCancellation('v1', { reason: 'x' })
        .subscribe({ error: (error) => (code = error.error.code) });

      http
        .expectOne(`${baseUrl}/vacations/v1/cancellation-requests`)
        .flush({ code: 'CANCELLATION_ALREADY_REQUESTED' }, { status: 409, statusText: 'Conflict' });

      expect(code).toBe('CANCELLATION_ALREADY_REQUESTED');
      expect(service.cancellations()).toEqual([]);
    });

    it('withdraws a pending request', () => {
      load([dto({ status: 'APPROVED' })], [cancellationDto()]);

      service.withdrawCancellation('c1').subscribe();

      http
        .expectOne({
          method: 'POST',
          url: `${baseUrl}/vacations/cancellation-requests/c1/withdraw`,
        })
        .flush(cancellationDto({ status: 'WITHDRAWN' }));

      expect(service.pendingCancellations()).toEqual([]);
      expect(service.cancellations()[0].status).toBe('WITHDRAWN');
    });

    it('applies a partial admin cancellation: shortens the vacation and records it', () => {
      load([dto({ status: 'APPROVED' })]);

      let released: number | undefined;

      service
        .cancelApproved('v1', {
          fromDate: '2026-11-05',
          toDate: '2026-11-06',
          comment: '  Cambio de planes  ',
        })
        .subscribe((result) => (released = result.cancellation.releasedWorkingDays));

      const request = http.expectOne({
        method: 'POST',
        url: `${baseUrl}/admin/vacations/v1/cancel`,
      });

      expect(request.request.body).toEqual({
        fromDate: '2026-11-05',
        toDate: '2026-11-06',
        comment: 'Cambio de planes',
      });

      request.flush({
        cancellation: cancellationDto({
          status: 'APPROVED',
          fromDate: '2026-11-05',
          releasedWorkingDays: 2,
        }),
        vacations: [dto({ status: 'APPROVED', endDate: '2026-11-04', workingDays: 3 })],
      });

      expect(released).toBe(2);
      expect(service.requests().length).toBe(1);
      expect(service.requests()[0].endDate).toBe('2026-11-04');
      expect(service.requests()[0].workingDays).toBe(3);
      expect(service.cancellations()[0].status).toBe('APPROVED');
    });

    it('applies a split: replaces the original and adds the new segment', () => {
      load([dto({ status: 'APPROVED', startDate: '2026-11-02', endDate: '2026-11-13' })]);

      service.cancelApproved('v1', { fromDate: '2026-11-05', toDate: '2026-11-09' }).subscribe();

      http.expectOne(`${baseUrl}/admin/vacations/v1/cancel`).flush({
        cancellation: cancellationDto({ status: 'APPROVED', releasedWorkingDays: 3 }),
        vacations: [
          dto({ status: 'APPROVED', startDate: '2026-11-02', endDate: '2026-11-04', workingDays: 3 }),
          dto({
            id: 'v2',
            status: 'APPROVED',
            startDate: '2026-11-10',
            endDate: '2026-11-13',
            workingDays: 4,
          }),
        ],
      });

      expect(service.requests().map((request) => request.id)).toEqual(['v2', 'v1']);
    });

    it('sends a full cancellation without dates and marks the vacation cancelled', () => {
      load([dto({ status: 'APPROVED' })]);

      service.cancelApproved('v1', {}).subscribe();

      const request = http.expectOne(`${baseUrl}/admin/vacations/v1/cancel`);
      expect(request.request.body.fromDate).toBeUndefined();
      expect(request.request.body.comment).toBeUndefined();

      request.flush({
        cancellation: cancellationDto({ status: 'APPROVED', releasedWorkingDays: 5 }),
        vacations: [dto({ status: 'CANCELLED' })],
      });

      expect(service.requests()[0].status).toBe('CANCELLED');
    });

    it('approves a request: replaces the cancellation record and updates the vacations', () => {
      load([dto({ status: 'APPROVED' })], [cancellationDto()]);

      service.decideCancellation('c1', 'APPROVED', '  De acuerdo  ').subscribe();

      const request = http.expectOne({
        method: 'POST',
        url: `${baseUrl}/admin/vacations/cancellation-requests/c1/decision`,
      });

      expect(request.request.body).toEqual({ decision: 'APPROVED', comment: 'De acuerdo' });

      request.flush({
        cancellation: cancellationDto({
          status: 'APPROVED',
          releasedWorkingDays: 3,
          resolutionComment: 'De acuerdo',
        }),
        vacations: [dto({ status: 'APPROVED', endDate: '2026-11-03', workingDays: 2 })],
      });

      expect(service.cancellations().length).toBe(1);
      expect(service.cancellations()[0].status).toBe('APPROVED');
      expect(service.cancellations()[0].releasedWorkingDays).toBe(3);
      expect(service.pendingCancellations()).toEqual([]);
      expect(service.requests()[0].workingDays).toBe(2);
    });

    it('rejects a request without changing the vacations', () => {
      load([dto({ status: 'APPROVED' })], [cancellationDto()]);

      service.decideCancellation('c1', 'REJECTED').subscribe();

      http
        .expectOne(`${baseUrl}/admin/vacations/cancellation-requests/c1/decision`)
        .flush({
          cancellation: cancellationDto({ status: 'REJECTED' }),
          vacations: [],
        });

      expect(service.cancellations()[0].status).toBe('REJECTED');
      expect(service.requests()[0].workingDays).toBe(5);
    });
  });
});
