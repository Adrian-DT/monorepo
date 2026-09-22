import { Injectable, computed, signal } from '@angular/core';

import { VacationRequest, VacationRequestStatus } from '../models/vacation-request.model';

@Injectable({
  providedIn: 'root',
})
export class VacationsService {
  private readonly requestsState = signal<VacationRequest[]>([
    {
      id: 'vacation-request-1',
      userId: '1',
      userName: 'Adrián Delgado',
      startDate: '2026-09-14',
      endDate: '2026-09-15',
      workingDays: 2,
      status: 'APPROVED',
      reason: 'Asuntos personales',
      createdAt: '2026-08-20T10:00:00',
    },
    {
      id: 'vacation-request-2',
      userId: '2',
      userName: 'María García',
      startDate: '2026-09-28',
      endDate: '2026-10-02',
      workingDays: 5,
      status: 'PENDING',
      reason: 'Vacaciones de otoño',
      createdAt: '2026-09-01T09:30:00',
    },
    {
      id: 'vacation-request-3',
      userId: '3',
      userName: 'Carlos Martín',
      startDate: '2026-10-19',
      endDate: '2026-10-23',
      workingDays: 5,
      status: 'PENDING',
      reason: 'Viaje programado',
      createdAt: '2026-09-15T12:15:00',
    },
  ]);

  readonly requests = this.requestsState.asReadonly();

  readonly users = computed(() => {
    const userMap = new Map<string, string>();

    for (const request of this.requestsState()) {
      userMap.set(request.userId, request.userName);
    }

    return Array.from(userMap, ([id, name]) => ({
      id,
      name,
    }));
  });

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

  createRequest(request: Omit<VacationRequest, 'id' | 'status' | 'createdAt'>): VacationRequest {
    const newRequest: VacationRequest = {
      ...request,
      id: `vacation-request-${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    this.requestsState.update((requests) => [...requests, newRequest]);

    return newRequest;
  }

  cancelRequest(requestId: string): void {
    this.updateRequest(requestId, (request) =>
      request.status === 'PENDING'
        ? {
            ...request,
            status: 'CANCELLED',
          }
        : request,
    );
  }

  updateStatus(requestId: string, status: VacationRequestStatus, adminComment?: string): void {
    this.updateRequest(requestId, (request) => ({
      ...request,
      status,
      adminComment: adminComment?.trim() || undefined,
    }));
  }

  private updateRequest(
    requestId: string,
    update: (request: VacationRequest) => VacationRequest,
  ): void {
    this.requestsState.update((requests) =>
      requests.map((request) => (request.id === requestId ? update(request) : request)),
    );
  }
}
