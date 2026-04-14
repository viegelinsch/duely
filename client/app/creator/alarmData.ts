// Type definition for alarm data extending ical-generator's ICalAlarmData
export interface AlarmData {
  triggerDelay: number;
  triggerUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';
  // ICalAlarmData properties
  type?: string;
  trigger?: any;
  repeat?: any;
  attach?: any;
  x?: any[];
}
