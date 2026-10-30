// Type definition for alarm data extending ical-generator's ICalAlarmData
export interface AlarmData {
  triggerDelay: number;
  triggerUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';
  /** Reminder repeat interval in minutes; optional because records already in storage may predate the field. */
  intervalMinutes?: number;
  // ICalAlarmData properties
  type?: string;
  /** Alarm trigger point. Duely computes this as a concrete Date (see recalculateTrigger). */
  trigger?: Date;
  /** Reminder repeat count. Duely stores this as a plain number, diverging from ICalAlarmRepeatData. */
  repeat?: number;
  attach?: string | null;
  x?: unknown[];
  interval?: number;
  description?: string;
  summary?: string;
}
