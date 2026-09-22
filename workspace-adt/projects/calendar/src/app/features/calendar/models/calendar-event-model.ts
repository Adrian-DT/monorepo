export type CalendarEventType = 'VACATION' | 'ON_CALL' | 'INTERVENTION' | 'HOLIDAY';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: CalendarEventType;
  userId?: string;
  userName?: string;
  description?: string;
}
