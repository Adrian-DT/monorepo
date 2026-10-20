import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable, map, tap } from 'rxjs';

import { ApiService } from '../../../core/http/api.service';
import { UserService } from '../../administration/users/services/user.service';
import {
  AdminCancellationRequest,
  UserCancellationRequest,
  VacationCancellation,
} from '../models/vacation-cancellation.model';
import { VacationRequest, VacationRequestStatus } from '../models/vacation-request.model';

export type VacationDecision = 'APPROVED' | 'REJECTED';

export interface VacationCreateRequest {
  startDate: string;
  endDate: string;
  reason: string;
}

interface VacationDto extends Omit<VacationRequest, 'reason' | 'adminComment'> {
  reason?: string | null;
  adminComment?: string | null;
}

interface CancellationDto extends Omit<
  VacationCancellation,
  'requestReason' | 'resolutionComment' | 'releasedWorkingDays' | 'resolvedAt'
> {
  requestReason?: string | null;
  resolutionComment?: string | null;
  releasedWorkingDays?: number | null;
  resolvedAt?: string | null;
}

interface CancellationResultDto {
  cancellation: CancellationDto;
  vacations: VacationDto[];
}

export interface CancellationResult {
  cancellation: VacationCancellation;
  vacations: VacationRequest[];
}

@Injectable({
  providedIn: 'root',
})
export class VacationsService {
  private readonly apiService = inject(ApiService);
  private readonly userService = inject(UserService);

  private readonly requestsState = signal<VacationRequest[]>([]);
  private readonly cancellationsState = signal<VacationCancellation[]>([]);

  readonly requests = this.requestsState.asReadonly();
  readonly cancellations = this.cancellationsState.asReadonly();

  readonly pendingCancellations = computed(() =>
    this.cancellationsState().filter((cancellation) => cancellation.status === 'PENDING'),
  );

  readonly users = computed(() =>
    this.userService.activeUsers().map((user) => ({
      id: user.id,
      name: user.displayName,
    })),
  );

  load(): void {
    this.apiService.get<VacationDto[]>('vacations').subscribe({
      next: (requests) => this.requestsState.set(this.sort(requests.map(this.fromDto))),
      error: () => this.requestsState.set([]),
    });

    this.apiService.get<CancellationDto[]>('vacations/cancellation-requests').subscribe({
      next: (items) => this.cancellationsState.set(this.sortCancellations(items.map(this.toCancellation))),
      error: () => this.cancellationsState.set([]),
    });
  }

  clear(): void {
    this.requestsState.set([]);
    this.cancellationsState.set([]);
  }

  create(request: VacationCreateRequest): Observable<VacationRequest> {
    return this.apiService.post<VacationDto>('vacations', request).pipe(
      map(this.fromDto),
      tap((created) => this.requestsState.update((requests) => this.sort([...requests, created]))),
    );
  }

  cancel(requestId: string): Observable<VacationRequest> {
    return this.apiService
      .post<VacationDto>(`vacations/${requestId}/cancel`, {})
      .pipe(map(this.fromDto), tap(this.replace));
  }

  decide(
    requestId: string,
    decision: VacationDecision,
    adminComment?: string,
  ): Observable<VacationRequest> {
    return this.apiService
      .post<VacationDto>(`admin/vacations/${requestId}/decision`, {
        decision,
        adminComment: adminComment?.trim() || undefined,
      })
      .pipe(map(this.fromDto), tap(this.replace));
  }

  requestCancellation(
    vacationId: string,
    request: UserCancellationRequest,
  ): Observable<VacationCancellation> {
    return this.apiService
      .post<CancellationResultDto>(`vacations/${vacationId}/cancellation-requests`, {
        fromDate: request.fromDate,
        toDate: request.toDate,
        reason: request.reason.trim(),
      })
      .pipe(
        map(this.toResult),
        tap((result) => this.applyResult(result)),
        map((result) => result.cancellation),
      );
  }

  withdrawCancellation(cancellationId: string): Observable<VacationCancellation> {
    return this.apiService
      .post<CancellationDto>(`vacations/cancellation-requests/${cancellationId}/withdraw`, {})
      .pipe(
        map(this.toCancellation),
        tap((updated) => this.replaceCancellation(updated)),
      );
  }

  cancelApproved(
    vacationId: string,
    request: AdminCancellationRequest,
  ): Observable<CancellationResult> {
    return this.apiService
      .post<CancellationResultDto>(`admin/vacations/${vacationId}/cancel`, {
        fromDate: request.fromDate,
        toDate: request.toDate,
        comment: request.comment?.trim() || undefined,
      })
      .pipe(
        map(this.toResult),
        tap((result) => this.applyResult(result)),
      );
  }

  decideCancellation(
    cancellationId: string,
    decision: VacationDecision,
    comment?: string,
  ): Observable<CancellationResult> {
    return this.apiService
      .post<CancellationResultDto>(
        `admin/vacations/cancellation-requests/${cancellationId}/decision`,
        { decision, comment: comment?.trim() || undefined },
      )
      .pipe(
        map(this.toResult),
        tap((result) => this.applyResult(result)),
      );
  }

  getRequestsByUser(userId: string): VacationRequest[] {
    return this.requestsState().filter((request) => request.userId === userId);
  }

  getCancellationsByVacation(vacationId: string): VacationCancellation[] {
    return this.cancellationsState().filter((item) => item.vacationId === vacationId);
  }

  filterRequests(userId: string, status: VacationRequestStatus | ''): VacationRequest[] {
    return this.requestsState().filter((request) => {
      const matchesUser = !userId || request.userId === userId;

      const matchesStatus = !status || request.status === status;

      return matchesUser && matchesStatus;
    });
  }

  private readonly replace = (updated: VacationRequest): void => {
    this.requestsState.update((requests) =>
      this.sort(requests.map((request) => (request.id === updated.id ? updated : request))),
    );
  };

  private readonly replaceCancellation = (updated: VacationCancellation): void => {
    this.cancellationsState.update((items) =>
      this.sortCancellations(items.map((item) => (item.id === updated.id ? updated : item))),
    );
  };

  private readonly applyResult = (result: CancellationResult): void => {
    this.requestsState.update((requests) => {
      const merged = [...requests];

      for (const vacation of result.vacations) {
        const index = merged.findIndex((request) => request.id === vacation.id);

        if (index >= 0) {
          merged[index] = vacation;
        } else {
          merged.push(vacation);
        }
      }

      return this.sort(merged);
    });

    this.cancellationsState.update((items) => {
      const others = items.filter((item) => item.id !== result.cancellation.id);

      return this.sortCancellations([...others, result.cancellation]);
    });
  };

  private readonly toResult = (dto: CancellationResultDto): CancellationResult => ({
    cancellation: this.toCancellation(dto.cancellation),
    vacations: dto.vacations.map(this.fromDto),
  });

  private fromDto(dto: VacationDto): VacationRequest {
    return {
      ...dto,
      reason: dto.reason ?? undefined,
      adminComment: dto.adminComment ?? undefined,
    };
  }

  private toCancellation(dto: CancellationDto): VacationCancellation {
    return {
      ...dto,
      requestReason: dto.requestReason ?? undefined,
      resolutionComment: dto.resolutionComment ?? undefined,
      releasedWorkingDays: dto.releasedWorkingDays ?? undefined,
      resolvedAt: dto.resolvedAt ?? undefined,
    };
  }

  private sort(requests: VacationRequest[]): VacationRequest[] {
    return [...requests].sort(
      (first, second) =>
        second.startDate.localeCompare(first.startDate) ||
        second.createdAt.localeCompare(first.createdAt),
    );
  }

  private sortCancellations(items: VacationCancellation[]): VacationCancellation[] {
    return [...items].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }
}
