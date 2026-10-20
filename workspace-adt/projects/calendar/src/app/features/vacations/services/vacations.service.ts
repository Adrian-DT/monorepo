import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable, map, tap } from 'rxjs';

import { ApiService } from '../../../core/http/api.service';
import { UserService } from '../../administration/users/services/user.service';
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

@Injectable({
  providedIn: 'root',
})
export class VacationsService {
  private readonly apiService = inject(ApiService);
  private readonly userService = inject(UserService);

  private readonly requestsState = signal<VacationRequest[]>([]);

  readonly requests = this.requestsState.asReadonly();

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
  }

  clear(): void {
    this.requestsState.set([]);
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

  getRequestsByUser(userId: string): VacationRequest[] {
    return this.requestsState().filter((request) => request.userId === userId);
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

  private fromDto(dto: VacationDto): VacationRequest {
    return {
      ...dto,
      reason: dto.reason ?? undefined,
      adminComment: dto.adminComment ?? undefined,
    };
  }

  private sort(requests: VacationRequest[]): VacationRequest[] {
    return [...requests].sort(
      (first, second) =>
        second.startDate.localeCompare(first.startDate) ||
        second.createdAt.localeCompare(first.createdAt),
    );
  }
}
