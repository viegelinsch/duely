// Type definition for alarm data extending ical-generator's ICalAlarmData
export interface AlarmData {
  triggerDelay: number;
  triggerUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';
  /** Reminder repeat interval in minutes; optional because records already in storage may predate the field. */
  intervalMinutes?: number;
  // ICalAlarmData properties
  type?: string;
  trigger?: any;
  repeat?: any;
  attach?: any;
  x?: any[];
  interval?: number;
  description?: string;
  summary?: string;
}
