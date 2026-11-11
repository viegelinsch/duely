import { format, isValid, parse } from 'date-fns';
import { tz } from '@date-fns/tz';

/**
 * Date-model boundary shared by the appointment forms, the calendar service and
 * the collision patterns.
 *
 * Duely keeps a wall clock, not an instant: `Appointment.start`/`end` are native
 * `Date`s whose **UTC fields** carry the date and time the user picked (the
 * model boundary adopted in the I3/D2 work). A native instant still had to be
 * chosen for storage and for ical-generator, and this module is the single place
 * that converts between the two views.
 *
 * `@date-fns/tz` supplies the explicit UTC context, so every wall-clock format
 * or field replacement is a zoned computation instead of a chain of mutable
 * `setUTC*` calls. Operations that mirror the old Moment *local-mode* behaviour
 * (collision days, exclusion days, picker days) still run in the local context;
 * changing that context would change the host-local collision policy that D1
 * deliberately retained.
 */

/** Explicit UTC context for wall-clock reads and writes. */
const utcWallClock = tz('UTC');

/** The wall-clock text of a model value, for example `2032-04-03` or `22:00`. */
export function formatWallDate(date: Date, pattern = 'yyyy-MM-dd'): string {
  return format(date, pattern, {in: utcWallClock});
}

/** A model value from calendar and wall-clock components. */
export function wallDateFromParts(year: number, monthIndex: number, day: number,
                                   hours = 0, minutes = 0, seconds = 0, milliseconds = 0): Date {
  return new Date(Date.UTC(year, monthIndex, day, hours, minutes, seconds, milliseconds));
}

/** Replaces the wall-clock date, keeping the wall-clock time (immutable). */
export function withWallDay(date: Date, year: number, monthIndex: number, day: number): Date {
  return wallDateFromParts(year, monthIndex, day, date.getUTCHours(), date.getUTCMinutes(),
    date.getUTCSeconds(), date.getUTCMilliseconds());
}

/** Replaces the wall-clock time, keeping the wall-clock date and sub-minute fields. */
export function withWallTime(date: Date, hours: number, minutes: number): Date {
  return wallDateFromParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes,
    date.getUTCSeconds(), date.getUTCMilliseconds());
}

/** Adds wall-clock hours; a UTC-offset-free step, so no host DST shift applies. */
export function addWallHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

/** Day number (milliseconds at UTC midnight) of a Date or date-only string. */
export function wallDayNumber(value: Date | string | undefined | null): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match === null ? null : Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return isValid(value) ? Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) : null;
}

/** Day number of a Material datepicker value, without a timezone shift. */
export function wallDayNumberFromPicker(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

/** The local-midnight picker value for a day number. */
export function pickerDayFromWallDay(day: number): Date {
  const utc = new Date(day);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/**
 * The local-midnight picker value for a model value's wall day.
 *
 * A `MatDatepicker` works in the host calendar, so it must receive a local
 * midnight. Handing it the model value directly would shift the visible day for
 * every host west of UTC.
 */
export function pickerDayFromModel(value: Date): Date {
  return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/**
 * The local-midnight picker value for a saved date-only setting, or `null` when
 * the setting is missing/unparseable. Saved `YYYY-MM-DD` strings hydrate the
 * same calendar day in every timezone.
 */
export function pickerDayFromWallValue(value: Date | string | undefined | null): Date | null {
  const day = wallDayNumber(value);
  return day === null ? null : pickerDayFromWallDay(day);
}

/** Parses an `HH:mm` control value; `null` when it is not a valid wall time. */
export function parseWallTime(value: string): {hours: number; minutes: number} | null {
  const parsed = parse(value, 'HH:mm', new Date(2000, 0, 1));
  return isValid(parsed) ? {hours: parsed.getHours(), minutes: parsed.getMinutes()} : null;
}

/** Duely's historical guard against impossible control values. */
export function clampWallHour(hour: number): number {
  return hour >= 24 ? 23 : hour;
}

/** Duely's historical guard against impossible control values. */
export function clampWallMinute(minute: number): number {
  return minute >= 60 ? 59 : minute;
}
