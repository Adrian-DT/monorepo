export interface StatisticsUser {
  id: string;
  name: string;
}

export interface UserStatistics {
  userId: string;
  userName: string;
  onCallDays: number;
  workdayOnCallDays: number;
  weekendOnCallDays: number;
  nationalHolidayOnCallDays: number;
  regionalHolidayOnCallDays: number;
  localHolidayOnCallDays: number;
  interventionCount: number;
  interventionMinutes: number;
  vacationDays: number;
  dayInterventions: number;
  afternoonInterventions: number;
  nightInterventions: number;
}

export interface GeneralStatistics {
  totalOnCallDays: number;
  totalInterventions: number;
  totalInterventionMinutes: number;
  totalVacationDays: number;
  pendingVacationRequests: number;
}

export interface StatisticsFilters {
  year: number;
  userId: string;
}
