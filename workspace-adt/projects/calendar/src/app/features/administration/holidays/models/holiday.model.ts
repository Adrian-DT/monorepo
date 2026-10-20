export type HolidayScope = 'NATIONAL' | 'REGIONAL' | 'LOCAL';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  scope: HolidayScope;
  location?: string;
}

export interface HolidayRequest {
  date: string;
  name: string;
  scope: HolidayScope;
  location?: string;
}
