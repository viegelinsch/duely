import ical from 'ical-generator';
import Holidays from 'date-holidays';
type HolidaysCountry = { country: string; state?: string; region?: string };
type HolidaysHoliday = { date: string; start: Date; end: Date; name: string; type: string; rule: string };
import moment from 'moment-timezone';
import { Collision } from '../CollisionDetector';


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
    public abstract isMatch(eventData: any, date: Date): {match: boolean, break: boolean};
    public getCollisions(eventData: any): Collision[] {
        const collisions: Collision[] = [];

        // check public holidays
        if (this.locations !== undefined) {
            const hd = new Holidays();

            let year: number = moment(eventData.start).year();
            const until = (eventData.repeating.until === undefined)
                ? new Date('2080-12-31') : <Date> eventData.repeating.until;
            const untilYear = moment(until).year();

            while (year <= untilYear) {
                let holidays: HolidaysHoliday[] = [];

                for (const location of this.locations) {
                    hd.init(location.country, location.state, location.region);
                    hd.setLanguages([this.language]);
                    const holidaysOfYear: HolidaysHoliday[] = hd.getHolidays(year);

                    for (const hol of holidaysOfYear) {
                        if (hol.type === 'public') {
                            holidays.push(hol);
                        }
                    }
                }

                if (this.locations.length > 1) {
                    holidays.sort((holiday1: any, holiday2: any) => {return holiday1.start - holiday2.start; });
                    holidays = this.removeDuplicates(holidays, 'date');
                }

                for (const holiday of holidays) {
                    if (holiday.type === 'public'
                        && moment(holiday.date).isBefore(eventData.start, 'days') === false
                        && moment(holiday.date).isAfter(until, 'days') === false) {
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
                                    if (moment(collisions[collisions.length - 1].date).isSame(new Date(holiday.date), 'days') === false) {
                                        collisions.push({date: pushDate, reason: holiday.name});
                                    }
                                } else {
                                    collisions.push({date: pushDate, reason: holiday.name});
                                }
                            }

                            if (isMatchResult.break === true) {
                                return collisions;
                            }

                            d = moment(d).subtract(1, 'days').toDate();
                        }
                    }
                }

                year++;
            }
        }

        // check dates excluded by user
        if (this.userExclusions !== undefined) {
            const until = (eventData.repeating.until === undefined)
                ? new Date('2080-12-31') : <Date> eventData.repeating.until;

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
                                if (moment(collisions[collisions.length - 1].date).isSame(moment(d).add(i, 'days').toDate(), 'days')
                                    === false) {
                                    collisions.push({date: moment(d).add(i, 'days').toDate(), reason: reason});
                                }
                            } else {
                                collisions.push({date: moment(d).add(i, 'days').toDate(), reason: reason});
                            }
                        }

                        if (isMatchResult.break === true) {
                            return collisions;
                        }

                        d = moment(d).subtract(1, 'days').toDate();
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
    private removeDuplicates(originalArray: any[], objKey: any): any[] {
        const trimmedArray = [];
        const values = [];
        let value: any;

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
        const a = moment(start);
        const b = moment(end);

        return b.diff(a, 'days') + 1;
    }

     /**
      * Remove the time from a date.
      * @param date  A date.
      * @return      The date without time.
      */
    protected dateWithoutTime(date: Date): Date {
        date.setHours(0, 0, 0, 0);
        return date;
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
        const isoWeekdays: number[] = new Array<number>();

        for (const weekday of weekdays) {
            if (this.getIsoWeekday(weekday) === moment(date).isoWeekday()) {
                return true;
            }
        }

        return false;
    }
}
