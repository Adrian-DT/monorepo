export type InterventionShift = 'DAY' | 'AFTERNOON' | 'NIGHT';

export type InterventionType = 'REMOTE' | 'ONSITE';

export type InterventionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Intervention {
  id: string;
  userId: string;
  userName: string;
  date: string;
  shift: InterventionShift;
  type: InterventionType;
  status: InterventionStatus;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  createdAt: string;
}
