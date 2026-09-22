import { CalendarEventType } from './calendar-event-model';

export interface CalendarFilter {
  userId: string;
  types: CalendarEventType[];
}
