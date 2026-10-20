export type VacationCancellationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface VacationCancellation {
  id: string;
  vacationId: string;
  userId: string;
  userName: string;
  fromDate: string;
  toDate: string;
  status: VacationCancellationStatus;
  requestedBy: string;
  requestReason?: string;
  resolutionComment?: string;
  releasedWorkingDays?: number;
  originalStartDate: string;
  originalEndDate: string;
  originalWorkingDays: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface CancellationRangeRequest {
  fromDate?: string;
  toDate?: string;
}

export interface UserCancellationRequest extends CancellationRangeRequest {
  reason: string;
}

export interface AdminCancellationRequest extends CancellationRangeRequest {
  comment?: string;
}
