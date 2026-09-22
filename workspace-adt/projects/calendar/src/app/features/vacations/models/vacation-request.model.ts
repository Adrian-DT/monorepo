export type VacationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface VacationRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: VacationRequestStatus;
  reason?: string;
  adminComment?: string;
  createdAt: string;
}
