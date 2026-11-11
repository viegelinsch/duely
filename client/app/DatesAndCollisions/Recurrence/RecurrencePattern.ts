type HolidaysCountry = { country: string; state?: string; region?: string };
type HolidaysHoliday = { date: string; start: Date; end: Date; name: string; type: string; rule: string };
import { addDays, getISODay, getYear, isAfter, isBefore, isSameDay, parseISO, startOfDay, subDays } from 'date-fns';
import { Collision } from '../CollisionDetector';
import { EventCollisionData } from '../EventCollisionData';
import { HolidayCatalogService } from '../HolidayCatalogService';


export abstract class RecurrencePattern {
   /** The locations to be considered when checking for collisions with public holidays. */
    private locations: HolidaysCountry[] | undefined;
    /** The dates that are excluded by the user. */
    private userExclusions: Date[] | undefined;
    /** The language. */
    private language: string;
    /**
     * The already-translated reason shown for dates excluded by the user.
     * It is resolved from the i18n locale files by the DI-managed caller
     * (AppointmentsService via TranslateService) and passed in, so the locale
     * JSON is the single source of truth. The English default is only a fallback
     * for direct, non-DI instantiation (e.g. unit tests) where no TranslateService
     * is available.
     */
    private excludedByUserReason: string;


    constructor(locations: HolidaysCountry[] | undefined, userExclusions: Date[] | undefined, language: string,
                excludedByUserReason: string = 'excluded by user') {
        this.locations = locations;
        this.userExclusions = userExclusions;
        this.language = language;
        this.excludedByUserReason = excludedByUserReason;
    }
     /**
      * checks match of date and calculated event
      * @param date, eventData A date , Event Data.
      * @return      collision dates.
      */
    public abstract isMatch(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean};
    public getCollisions(eventData: EventCollisionData): Collision[] {
        const collisions: Collision[] = [];

        // check public holidays
        if (this.locations !== undefined) {
            const holidayCatalog = new HolidayCatalogService();

            let year: number = getYear(eventData.start);
            const until = (eventData.repeating!.until === undefined)
                ? new Date('2080-12-31') : eventData.repeating!.until;
            const untilYear = getYear(until);

            while (year <= untilYear) {
                let holidays: HolidaysHoliday[] = holidayCatalog.getPublicHolidays(this.locations, this.language, year);

                if (this.locations.length > 1) {
                    holidays.sort((holiday1: HolidaysHoliday, holiday2: HolidaysHoliday) => {return holiday1.start.getTime() - holiday2.start.getTime(); });
                    holidays = this.removeDuplicates(holidays, 'date');
                }

                const startDay = startOfDay(eventData.start);
                const untilDay = startOfDay(until);
                for (const holiday of holidays) {
                    // `holiday.date` is a date-only string, which both libraries
                    // read as local midnight; the old `isBefore`/`isAfter` calls
                    // compared at day granularity, so the operands are truncated
                    // to local midnight here as well.
                    if (holiday.type === 'public'
                        && isBefore(parseISO(holiday.date), startDay) === false
                        && isAfter(parseISO(holiday.date), untilDay) === false) {
                        let d: Date = holiday.start;
                        const length = this.daysBetween(eventData.start, eventData.end);

                        for (let i = 0; i < length; i++) {
                            const isMatchResult = this.isMatch(eventData, d);

                            if (isMatchResult.match === true) {
                                const pushDate: Date = new Date(holiday.start);
                                const h = eventData.start.getHours();
                                const m = eventData.start.getMinutes();
                                const s = eventData.start.getSeconds();
                                const ms = eventData.start.getMilliseconds();
                                pushDate.setHours( h, m, s, ms);

                                if (collisions.length > 0) {
                                    if (isSameDay(collisions[collisions.length - 1].date, new Date(holiday.date)) === false) {
                                        collisions.push({date: pushDate, reason: holiday.name});
                                    }
                                } else {
                                    collisions.push({date: pushDate, reason: holiday.name});
                                }
                            }

                            if (isMatchResult.break === true) {
                                return collisions;
                            }

                            d = subDays(d, 1);
                        }
                    }
                }

                year++;
            }
        }

        // check dates excluded by user
        if (this.userExclusions !== undefined) {
            const until = (eventData.repeating!.until === undefined)
                ? new Date('2080-12-31') : eventData.repeating!.until;

            for (const exDate of this.userExclusions) {
                if (+until >= +this.dateWithoutTime(exDate) && +exDate >= +this.dateWithoutTime(eventData.start)) {
                    let d: Date = exDate;
                    const h = eventData.start.getHours();
                    const m = eventData.start.getMinutes();
                    const s = eventData.start.getSeconds();
                    const ms = eventData.start.getMilliseconds();
                    d.setHours( h, m, s, ms);
                    const length = this.daysBetween(eventData.start, eventData.end);

                    for (let i = 0; i < length; i++) {
                        const isMatchResult = this.isMatch(eventData, this.dateWithoutTime(d));
                        const reason = this.excludedByUserReason;

                        if (isMatchResult.match === true) {
                            if (collisions.length > 0) {
                                if (isSameDay(collisions[collisions.length - 1].date, addDays(d, i))
                                    === false) {
                                    collisions.push({date: addDays(d, i), reason: reason});
                                }
                            } else {
                                collisions.push({date: addDays(d, i), reason: reason});
                            }
                        }

                        if (isMatchResult.break === true) {
                            return collisions;
                        }

                        d = subDays(d, 1);
                    }
                }
            }
        }

        return collisions;
    }

     /**
      * Remove duplicates from array.
      * @param originalArray  array.
      * @return      trimmed array.
      */
    private removeDuplicates(originalArray: HolidaysHoliday[], objKey: keyof HolidaysHoliday): HolidaysHoliday[] {
        const trimmedArray: HolidaysHoliday[] = [];
        const values: unknown[] = [];
        let value: unknown;

        for (let i = 0; i < originalArray.length; i++) {
            value = originalArray[i][objKey];

            if (values.indexOf(value) === -1) {
                trimmedArray.push(originalArray[i]);
                values.push(value);
            }
        }

        return trimmedArray;
    }

     /**
      * Calculates amount of days between two dates.
      * @param start : date  A start date.
      * @param end : date  A ende date.
      * @return      number of days.
      */
    protected daysBetween(start: Date, end: Date): number {
        // Day distance of the previous Moment `end.diff(start, 'days')`: whole
        // days truncated towards zero, with the host DST offset difference
        // removed so a 23- or 25-hour local day still counts as one. A calendar
        // difference would not be equivalent: an overnight event (22:00 to
        // 02:00) is a single day pair here, not two.
        const zoneDelta = (end.getTimezoneOffset() - start.getTimezoneOffset()) * 60000;
        const days = Math.trunc((end.getTime() - start.getTime() - zoneDelta) / 86400000);
        return days + 1;
    }

     /**
      * Remove the time from a date, without mutating the supplied Date.
      *
      * The user-exclusion branch compares the exclusion day against the event
      * start day and afterwards copies the event's wall-clock time onto the
      * collision date. Truncating `eventData.start` in place during the day
      * comparison therefore dropped that time (midnight EXDATE entries and
      * midnight user-exclusion collisions). Callers keep their own values and
      * receive a truncated copy instead.
      * @param date  A date.
      * @return      The date without time.
      */
    protected dateWithoutTime(date: Date): Date {
        const withoutTime = new Date(date);
        withoutTime.setHours(0, 0, 0, 0);
        return withoutTime;
    }

    /**
     * Convert weekday abbreviation to iso weekday.
     * @param weekday   The abbreviation of the weekday.
     * @return          The iso weekday.
     */
    protected getIsoWeekday(weekday: string): number {
        let isoWeekday = 0;

        switch (weekday) {
            case 'MO': {
                isoWeekday = 1;
                break;
            }
            case 'TU': {
                isoWeekday = 2;
                break;
            }
            case 'WE': {
                isoWeekday = 3;
                break;
            }
            case 'TH': {
                isoWeekday = 4;
                break;
            }
            case 'FR': {
                isoWeekday = 5;
                break;
            }
            case 'SA': {
                isoWeekday = 6;
                break;
            }
            case 'SU': {
                isoWeekday = 7;
                break;
            }
        }

        return isoWeekday;
    }

    /**
     * Checks if day in week
     * @param weekdays   The String of the weekday.
     * @return          true
     * @return          false
     */
    protected isIn(weekdays: string[], date: Date): boolean {
        for (const weekday of weekdays) {
            if (this.getIsoWeekday(weekday) === getISODay(date)) {
                return true;
            }
        }

        return false;
    }
}
