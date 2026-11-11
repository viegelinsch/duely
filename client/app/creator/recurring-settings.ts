import { Exclusion } from './exclusion';

export type frequency = 'NEVER' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type ends = 'NEVER' | 'COUNT' | 'UNTIL';
type repByMonthly = 'MONTH' | 'MONTHINV' | 'WEEK' | 'WEEKINV' | 'WORK' | 'WORKINV';
type repByYearly = 'DAYMONTHYEAR' | 'DAYMONTHYEARINV' | 'WEEKYEAR' | 'WEEKINVYEAR' | 'WORKINVYEAR' | 'WORKYEAR';

export interface RecurringSettings {
  frequency: frequency;
  interval: number;
  ends: ends;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  repByMonthly?: repByMonthly;
  repByYearly?: repByYearly;
  count?: number;
  // Producer assigns a date-only 'YYYY-MM-DD' string (see shared/wall-clock);
  // consumers pass it straight to ical-generator's `until` (ICalDateTimeValue
  // accepts Date | string). Declared as Date | string so the type matches the
  // value that actually flows.
  untilDate?: Date | string;
  exclusions: Exclusion[];
}
