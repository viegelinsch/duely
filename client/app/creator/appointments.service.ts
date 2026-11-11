/**
 * This file contains a service, which handles multiple appointments.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from '../storage/storage.service';
import { CollisionDetector, Collision } from '../DatesAndCollisions/CollisionDetector';
import { EventCollisionData } from '../DatesAndCollisions/EventCollisionData';

import ical, { ICalCalendar, ICalEvent, ICalEventData, ICalEventJSONData, ICalAlarmData } from 'ical-generator';
type HolidaysCountry = { country: string; state?: string; region?: string };
// ical-generator 11 validates BYDAY against its ICalWeekday enum and no longer
// accepts the RFC ordinal prefix ('2SA'). The same rule is expressed with
// BYDAY + BYSETPOS, which the guard matrix accepts as the equivalent form.
const WEEKDAY_BY_INDEX = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
import { Appointment } from './appointment';
import { AlarmData } from './alarmData';
import { alarmTrigger } from './alarm-trigger';
import { addWallHours, formatWallDate, wallDateFromParts } from '../shared/wall-clock';

/**
 * ical-generator's `toJSON()` payload declares dates as ISO strings, while the
 * collision detector runs on `Date` values. This adapter is the single place
 * that converts the serialised event into {@link EventCollisionData}; it
 * replaces the previous blanket `as unknown as` cast, so a field change in a
 * future major fails here instead of leaking into the recurrence patterns.
 */
function toCollisionData(data: ICalEventJSONData): EventCollisionData {
  const asDate = (value: unknown): Date => value instanceof Date ? value : new Date(String(value));
  const asNumber = (value: unknown): number | undefined =>
    value === null || value === undefined ? undefined : Number(value);
  const asNumbers = (value: unknown): number[] | undefined => {
    if (value === null || value === undefined) return undefined;
    return Array.isArray(value) ? value.map(item => Number(item)) : [Number(value)];
  };
  const repeating = typeof data.repeating === 'object' && data.repeating !== null ? data.repeating : null;
  return {
    start: asDate(data.start),
    end: data.end == null ? asDate(data.start) : asDate(data.end),
    repeating: repeating === null ? null : {
      freq: String(repeating.freq),
      interval: asNumber(repeating.interval) ?? 1,
      count: asNumber(repeating.count),
      until: repeating.until === undefined ? undefined : asDate(repeating.until),
      byDay: repeating.byDay?.map(day => String(day)),
      byMonth: asNumbers(repeating.byMonth),
      byMonthDay: asNumbers(repeating.byMonthDay),
      bySetPos: asNumbers(repeating.bySetPos)?.[0],
      exclude: repeating.exclude?.map(asDate)
    }
  };
}
/**
 * This Service holds and grants access onto multiple appointments.
 */
@Injectable()
export class AppointmentsService {
  public events: Appointment[] = [];
  private collisions: Collision[] = new Array<Collision>();

/**
 * contructor initializes Storage
 */
  constructor(private StorageService: StorageService, private translate: TranslateService) {
  }

/**
 * gets the appointment data and returns it as array
 */
  public getAppointments(): Promise<Appointment[]> {
    return Promise.resolve(this.events);
  }

/**
 * gets appointment data and returns a default appointment
 */
  public addAppointment(appointment: Appointment | null): void {
    if (appointment != null) {
      this.events.push(appointment);
    } else {
      this.events.push(this.defaultAppointment());
    }
  }
/**
 * gets the appointment data and removes it
 */
  public removeAppointment(appointment: Appointment): void {
    const index = this.events.indexOf(appointment);
    if (index > -1) {
      this.events.splice(index, 1);
    }
  }
/**
 * initializes the data for the output of the data
 */
  public initializeCalendar(): ICalCalendar {
    const calendar = ical({
      name: this.StorageService.settings.calendarName,
      prodId: this.StorageService.settings.calendarProdId,
      url: this.StorageService.settings.calendarUrl,
      timezone: this.StorageService.settings.timeZone === 'floating' ? undefined : this.StorageService.settings.timeZone
    });
    return calendar;
  }
/**
 * gets the data from the events , returns an ICal-String
 */
  public getICalString(): string {
    const calendar = this.initializeCalendar();

    for (const event of this.events) {
      this.addEventToCalendar(calendar, event);
    }

    return calendar.toString();
  }
/**
 * creats the format for the an appointment in the formular , returns the format
 */
  defaultAppointment(): Appointment {
    // Default start: the next full hour of the *host* wall clock, stored in the
    // UTC fields of the model value (see shared/wall-clock.ts).
    const now = new Date();
    const start = wallDateFromParts(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const end = addWallHours(start, 1);
    const app = <Appointment>{
      summary: '',
      start: start,
      end: end,
      description: '',
      status: 'confirmed',
      timezone: 'floating',
      recurringSettings: {
        frequency: 'NEVER',
        interval: 1,
        ends: 'NEVER',
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
        repByMonthly: 'MONTH',
        repByYearly: 'DAYMONTHYEAR',
        count: 1,
        untilDate: formatWallDate(now),
        exclusions: [],
      },
      valid: [false, true, true, true]
    };
    return app;
  }
  /**
   * Number of days in the given month.
   *
   * `month` is the zero-based `Date#getMonth()` index, like every other month
   * value in this service. The previous implementation compared against
   * one-based month numbers, so every caller (which passes `getMonth()`) read
   * the wrong bucket: February returned 31, April 29/28, October 31.
   */
  private getDaysInMonth(month: number, year: number): number {
    if (month === 3 || month === 5 || month === 8 || month === 10) {
      return 30;
    } else if (month === 1) {
      if ((year % 4 === 0 && year % 100 !== 0) || (year % 4 === 0 && year % 100 === 0 && year % 400 === 0)) {
        return 29;
      } else {
        return 28;
      }
    } else {
      return 31;
    }
  }
/**
 * gets the data from the events , returns an ICal-String
 */
  public addEventToCalendar(calendar: ICalCalendar, event: Appointment): void {
    // Guard clause: recurringSettings is required for this function
    if (!event.recurringSettings) {
      console.warn('addEventToCalendar called without recurringSettings');
      return;
    }

    // ical-generator's ICalEventData uses nominal enums (ICalEventRepeatingFreq,
    // ICalEventStatus, ICalWeekday) while Duely supplies runtime-compatible plain
    // strings. This helper centralises the cast so every createEvent call site
    // stays readable and type-safe at the ICalEvent level.
    const createEvent = (data: object): ICalEvent =>
      calendar.createEvent(data as unknown as ICalEventData);

    const start = new Date(event.start);
    const end = new Date(event.end!);

    // Duely stores 'floating' as its sentinel for "no timezone" (see
    // defaultAppointment and the advanced settings form). ical-generator 8+
    // treats every string as a TZID and would emit DTSTART;TZID=floating, so the
    // sentinel is mapped onto the library's explicit floating flag instead.
    const timezone = event.timezone === 'floating' ? undefined : event.timezone;
    const floating = event.timezone === 'floating' ? true : event.floating;

    const events: ICalEvent[] = [];

    // add eventss to calendar
    if (event.recurringSettings.frequency === 'NEVER') {

      // add a single non-repeating events to calendar
      events[0] = createEvent({
        start: start,
        end: end,
        stamp: new Date(),
        summary: event.summary,
        location: event.location,
        description: event.description,
        allDay: event.allDay,
        status: event.status,
        timezone,
        floating
      });

    } else if (event.recurringSettings.frequency === 'DAILY' || (event.recurringSettings.frequency === 'MONTHLY' &&
    event.recurringSettings.repByMonthly === 'MONTH') || (event.recurringSettings.frequency === 'YEARLY' &&
    event.recurringSettings.repByYearly === 'DAYMONTHYEAR')) {

      // add a single repeating events to calendar
      events[0] = createEvent({
        start: start,
        end: end,
        stamp: new Date(),
        summary: event.summary,
        location: event.location,
        description: event.description,
        allDay: event.allDay,
        status: event.status,
        repeating: {
          freq: event.recurringSettings.frequency,
          count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
          interval: event.recurringSettings.interval,
          until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
        },
        timezone,
        floating
      });

    } else if (event.recurringSettings.frequency === 'WEEKLY') {

      // add multiple (up to 7) eventss that repeat weekly to calendar
      const weekdays = [];
      weekdays[0] = event.recurringSettings.sunday;
      weekdays[1] = event.recurringSettings.monday;
      weekdays[2] = event.recurringSettings.tuesday;
      weekdays[3] = event.recurringSettings.wednesday;
      weekdays[4] = event.recurringSettings.thursday;
      weekdays[5] = event.recurringSettings.friday;
      weekdays[6] = event.recurringSettings.saturday;
      const byDayWeek = [];
      if (weekdays[0]) {
        byDayWeek[byDayWeek.length] = 'su';
      }
      if (weekdays[1]) {
        byDayWeek[byDayWeek.length] = 'mo';
      }
      if (weekdays[2]) {
        byDayWeek[byDayWeek.length] = 'tu';
      }
      if (weekdays[3]) {
        byDayWeek[byDayWeek.length] = 'we';
      }
      if (weekdays[4]) {
        byDayWeek[byDayWeek.length] = 'th';
      }
      if (weekdays[5]) {
        byDayWeek[byDayWeek.length] = 'fr';
      }
      if (weekdays[6]) {
        byDayWeek[byDayWeek.length] = 'sa';
      }
      events[0] = createEvent({
        start: event.start,
        end: event.end,
        stamp: new Date(),
        summary: event.summary,
        location: event.location,
        description: event.description,
        allDay: event.allDay,
        status: event.status,
        repeating: {
          freq: event.recurringSettings.frequency,
          byDay: byDayWeek,
          count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
          interval: event.recurringSettings.interval,
          until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
        },
        timezone,
        floating
      });

    } else if (event.recurringSettings.frequency === 'MONTHLY') {

      if (event.recurringSettings.repByMonthly === 'MONTHINV') {
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byMonthDay: [-1],
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      } else if (event.recurringSettings.repByMonthly === 'WEEK') {
        // One-based ordinal of the start weekday inside its month: day 7, 14,
        // 21 and 28 are the 1st, 2nd, 3rd and 4th occurrence, not the 2nd, 3rd,
        // 4th and 5th.
        const count = Math.floor((start.getDate() - 1) / 7) + 1;
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: [WEEKDAY_BY_INDEX[event.start.getDay()]],
            bySetPos: count,
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      } else if (event.recurringSettings.repByMonthly === 'WEEKINV') {
        // The reverse ordinal needs the month length, so the helper takes the
        // month index (0-11), not the day of month.
        const days = this.getDaysInMonth(event.start.getMonth(), event.start.getFullYear()) - event.start.getDate();
        const count = -(((days - (days % 7)) / 7) + 1);
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: [WEEKDAY_BY_INDEX[event.start.getDay()]],
            bySetPos: count,
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      } else if (event.recurringSettings.repByMonthly === 'WORK') {
        const currentDate = new Date(start);
        currentDate.setDate(1);
        currentDate.setMonth(start.getMonth());
        currentDate.setFullYear(start.getFullYear());
        const isWorkDay = start.getDay() !== 0 && start.getDay() !== 6;
        let workdays = 1;
        while (currentDate.valueOf() < start.valueOf()) {
          if (isWorkDay && currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            workdays++;
          } else if (!isWorkDay && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
            workdays++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        const daysArray = isWorkDay ? ['MO', 'TU', 'WE', 'TH', 'FR'] : ['SA', 'SU'];
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: daysArray,
            bySetPos: workdays,
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      }else if (event.recurringSettings.repByMonthly === 'WORKINV') {
        const currentDate = new Date(start);
        // `start` is already in the target month, so jumping straight to the
        // month's last day is safe: the previous ordering set the day first and
        // then corrected the month, which had already rolled the date forward
        // (February 20th became March 3rd before `setMonth` pulled it back).
        currentDate.setDate(this.getDaysInMonth(start.getMonth(), start.getFullYear()));
        const isWorkDay = start.getDay() !== 0 && start.getDay() !== 6;
        let workdays = 1;
        while (currentDate.valueOf() > start.valueOf()) {
          if (isWorkDay && currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            workdays++;
          } else if (!isWorkDay && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
            workdays++;
          }
          currentDate.setDate(currentDate.getDate() - 1);
        }
        const daysArray = isWorkDay ? ['MO', 'TU', 'WE', 'TH', 'FR'] : ['SA', 'SU'];
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: daysArray,
            bySetPos: -workdays,
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      }

    } else if (event.recurringSettings.frequency === 'YEARLY') {

      // add multiple eventss to calendar which repeat every x-th weekday day of a year (Every second friday of the year)
      if (event.recurringSettings.repByYearly === 'WEEKYEAR') {
        // One-based ordinal of the start weekday inside its month: day 7, 14,
        // 21 and 28 are the 1st, 2nd, 3rd and 4th occurrence, not the 2nd, 3rd,
        // 4th and 5th.
        const count = Math.floor((start.getDate() - 1) / 7) + 1;
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: [WEEKDAY_BY_INDEX[event.start.getDay()]],
            bySetPos: count,
            byMonth: [start.getMonth() + 1],
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      } else if (event.recurringSettings.repByYearly === 'DAYMONTHYEARINV') {
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
            byMonth: [start.getMonth() + 1],
            bySetPos: -1,
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      } else if (event.recurringSettings.repByYearly === 'WEEKINVYEAR') {
        // The reverse ordinal needs the month length, so the helper takes the
        // month index (0-11), not the day of month.
        const days = this.getDaysInMonth(event.start.getMonth(), event.start.getFullYear()) - event.start.getDate();
        const count = -(((days - (days % 7)) / 7) + 1);
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: [WEEKDAY_BY_INDEX[event.start.getDay()]],
            bySetPos: count,
            byMonth: [start.getMonth() + 1],
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      } else if (event.recurringSettings.repByYearly === 'WORKYEAR') {
        const currentDate = new Date(start);
        currentDate.setDate(1);
        currentDate.setMonth(start.getMonth());
        currentDate.setFullYear(start.getFullYear());
        const isWorkDay = start.getDay() !== 0 && start.getDay() !== 6;
        let workdays = 1;
        while (currentDate.valueOf() < start.valueOf()) {
          if (isWorkDay && currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            workdays++;
          } else if (!isWorkDay && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
            workdays++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        const daysArray = isWorkDay ? ['MO', 'TU', 'WE', 'TH', 'FR'] : ['SA', 'SU'];
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: daysArray,
            byMonth: [start.getMonth() + 1],
            bySetPos: workdays,
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      } else if (event.recurringSettings.repByYearly === 'WORKINVYEAR') {
        const currentDate = new Date(start);
        // `start` is already in the target month, so jumping straight to the
        // month's last day is safe: the previous ordering set the day first and
        // then corrected the month, which had already rolled the date forward
        // (February 20th became March 3rd before `setMonth` pulled it back).
        currentDate.setDate(this.getDaysInMonth(start.getMonth(), start.getFullYear()));
        const isWorkDay = start.getDay() !== 0 && start.getDay() !== 6;
        let workdays = 1;
        while (currentDate.valueOf() > start.valueOf()) {
          if (isWorkDay && currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            workdays++;
          } else if (!isWorkDay && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
            workdays++;
          }
          currentDate.setDate(currentDate.getDate() - 1);
        }
        const daysArray = isWorkDay ? ['MO', 'TU', 'WE', 'TH', 'FR'] : ['SA', 'SU'];
        events[0] = createEvent({
          start: event.start,
          end: event.end,
          stamp: new Date(),
          summary: event.summary,
          location: event.location,
          description: event.description,
          status: event.status,
          allDay: event.allDay,
          repeating: {
            freq: event.recurringSettings.frequency,
            byDay: daysArray,
            byMonth: [start.getMonth() + 1],
            bySetPos: -workdays,
            count: event.recurringSettings.ends === 'COUNT' ? event.recurringSettings.count : undefined,
            interval: event.recurringSettings.interval,
            until: event.recurringSettings.ends === 'UNTIL' ? event.recurringSettings.untilDate : undefined,
          },
          timezone,
          floating
        });
      }
    }

    // get exclusion data
    const exclusionDates: Date[] = [];
    const holidayCountries: HolidaysCountry[] = [];
    for (const exclusion of event.recurringSettings.exclusions) {
      if (exclusion.type === 'date') {
        exclusionDates.push(new Date(exclusion.date!));
      } else if (exclusion.type === 'holidays') {
        holidayCountries.push({
          country: exclusion.holiday_countries ?? '',
          state: exclusion.holiday_states,
          region: exclusion.holiday_regions
        });
      }
    }
    this.collisions = [];
    // write collisions to excluded dates
    for (const ev of events) {
      // v7 leaked `Date` instances through this cast; v11 serialises `start`,
      // `end` and `until` to ISO strings, so the payload must be adapted before
      // the recurrence patterns see it.
      const serialised = ev.toJSON();
      const eventData = toCollisionData(serialised);

      if (eventData.repeating != null) {
        const collisionDetector = new CollisionDetector(holidayCountries, exclusionDates,
          this.StorageService.settings.language, this.translate.instant('EXCLUDED BY USER') as string);
        const cols: Collision[] = collisionDetector.getCollisions(eventData);

        // `concat` returns a new array; the previous branch discarded the result
        // whenever a second event existed.
        this.collisions = this.collisions.concat(cols);
        const exDates = cols.map(col => col.date);

        // v11 emits an empty, malformed `EXDATE:` line when the exclusion set is
        // empty, so only write back when the detector actually found collisions.
        if (exDates.length > 0 && typeof serialised.repeating === 'object' && serialised.repeating !== null) {
          ev.repeating({...serialised.repeating, exclude: exDates});
        }
      }
    }


    // add alarm to all events
    for (let i = 0; i < events.length; i++) {
      event.alarms?.forEach((val: AlarmData) => {
          if ((val.repeat ?? 0) > 1) {
            events[i].createAlarm({
              type: val.type,
              trigger: alarmTrigger(start, val),
              // v11 requires the RFC 5545 repeat pair as an object; the flat
              // `repeat`/`interval` numbers of v7 are rejected at runtime.
              repeat: {times: val.repeat!, interval: val.interval! > 0 ? (val.interval! * 60) : 1},
              description: val.description,
            } as unknown as ICalAlarmData);
          } else {
            events[i].createAlarm({
              type: val.type,
              trigger: alarmTrigger(start, val),
              description: val.description,
            } as unknown as ICalAlarmData);
          }
        }
      );
    }
  }
  /**
   * gets the collision array
   *  @returns collision
   */
  public getCollisions(): Collision[] {
    return this.collisions;
  }
}
