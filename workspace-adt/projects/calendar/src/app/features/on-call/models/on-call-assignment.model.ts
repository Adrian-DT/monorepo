export type OnCallDayType =
  | 'WORKDAY'
  | 'WEEKEND'
  | 'NATIONAL_HOLIDAY'
  | 'REGIONAL_HOLIDAY'
  | 'LOCAL_HOLIDAY';

export type OnCallAssignmentStatus = 'PLANNED' | 'CONFIRMED' | 'CANCELLED';

export interface OnCallAssignment {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  status: OnCallAssignmentStatus;
  notes?: string;
  createdAt: string;
}

export interface OnCallCoverageDay {
  assignmentId: string;
  userId: string;
  userName: string;
  date: string;
  type: OnCallDayType;
  status: OnCallAssignmentStatus;
  notes?: string;
}
