import { subDays, subHours, subMinutes, subWeeks } from 'date-fns';
import type { AlarmData } from './alarmData';

/**
 * The single alarm trigger rule, shared by the alarm form and the calendar
 * export.
 *
 * The previous implementation built `moment(start).subtract(delay, unit)`. That
 * was a *local-mode* Moment: the offset applied to the instant, and a DAY or
 * WEEK step moved the calendar day of the host timezone, so a reminder kept its
 * wall-clock time across a DST change. `date-fns` subtraction on a native Date
 * has the same calendar semantics, and keeping one helper means the exported
 * `TRIGGER` and the value shown in the form can never drift apart.
 */
export function subtractAlarmOffset(start: Date, delay: number, unit: AlarmData['triggerUnit']): Date {
  switch (unit) {
    case 'MINUTES':
      return subMinutes(start, delay);
    case 'HOURS':
      return subHours(start, delay);
    case 'DAYS':
      return subDays(start, delay);
    case 'WEEKS':
      return subWeeks(start, delay);
  }
}

/** The alarm trigger for an appointment start, as stored in {@link AlarmData.trigger}. */
export function alarmTrigger(start: Date, alarm: AlarmData): Date {
  return subtractAlarmOffset(start, alarm.triggerDelay, alarm.triggerUnit);
}
