import {
  addDays, addWeeks, differenceInCalendarYears, getDate, getISODay, getMonth, isLastDayOfMonth, startOfYear, subDays,
  subWeeks
} from 'date-fns';
import { RecurrencePattern } from './RecurrencePattern';
import { EventCollisionData } from '../EventCollisionData';



/**
 * The class YearlyRecurrencePattern.
 */
export class YearlyRecurrencePattern extends RecurrencePattern {

    /**
     * Check if a given date matches the recurrence pattern.
     *
     * @param eventData     The data of the event.
     * @param date          The date to check.
     */
    public isMatch(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        if (eventData.repeating!.byMonthDay !== undefined) {
            if (eventData.repeating!.byMonthDay[0] === -1) {

                return this.lastDayOfMonth(eventData, date);
            }
            // If byMonthDay is defined but not -1, fall through to yearly check
            return this.yearly(eventData, date);
        } else if (eventData.repeating!.bySetPos !== undefined) {

            return this.bySetPos(eventData, date);
        } else if (eventData.repeating!.byDay !== undefined) {

            return this.byDay(eventData, date);
        } else {

            return this.yearly(eventData, date);
        }
    }

   /** Check if a given last day of the Year is last days of the year
     * @param eventData     The data of the event.
     * @param date          The date to check.
     */
    private lastDayOfMonth(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        if (isLastDayOfMonth(date) === true) {
            return this.isMatchOfInterval(eventData, date);
        }

        return {match: false, break: false};
    }

   /** Check if a day is certain day of the year
     * @param eventData     The data of the event.
     * @param date          The date to check.
     */
    private byDay(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        const byDayString: string = eventData.repeating!.byDay![0].toString();
        const dayPart: string = byDayString.slice(-2);
        const index: number = byDayString.length - 2;
        const factorPart: string = byDayString.slice(0, index);
        const factor: number = Number(factorPart) === 0 ?  1 : Number(factorPart);

        if (getISODay(date) === this.getIsoWeekday(dayPart)) {
            const month: number = getMonth(date);

            let counter = 0;
            let d = date;
            if (factor >= 0) {
                while (getMonth(d) === month) {
                    d = subWeeks(d, 1);
                    counter++;
                }
            } else {
                while (getMonth(d) === month) {
                    d = addWeeks(d, 1);
                    counter--;
                }
            }

            if (counter === factor) {
                return this.isMatchOfInterval(eventData, date);
            }
        }

        return {match: false, break: false};
    }

   /** Check if a day has certain postion in the year
     * @param eventData     The data of the event.
     * @param date          The date to check.
     */
    private bySetPos(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {

        if (this.isIn(eventData.repeating!.byDay!, date) === true) {
            let counter = 0;

            if (eventData.repeating!.bySetPos! >= 0) {
                const month: number = getMonth(date);

                let d = date;
                while (getMonth(d) === month) {
                    if (this.isIn(eventData.repeating!.byDay!, d) === true) {

                        counter++;
                    }
                    d = subDays(d, 1);
                }
            } else {
               const month: number = getMonth(date);

                let d = date;
                while (getMonth(d) === month) {
                    if (this.isIn(eventData.repeating!.byDay!, d) === true) {
                        counter--;
                    }
                    d = addDays(d, 1);
                }
            }


            if (counter === eventData.repeating!.bySetPos) {
                return this.isMatchOfInterval(eventData, date);
            }
        }

        return {match: false, break: false};
    }

   /** Check if the intervall is the calculated yearly
     * @param eventData     The data of the event.
     * @param date          The date to check.
     */
    private yearly(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        if (getDate(date) === getDate(eventData.start)) {

            return this.isMatchOfInterval(eventData, date);
        }

        return {match: false, break: false};
    }

   /** Check if the intervall is the calculated intervall
     * @param eventData     The data of the event.
     * @param date          The date to check.
     */
    private isMatchOfInterval(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        const diff = this.yearsBetween(eventData.start, date);

        if (getMonth(eventData.start) === getMonth(date)) {
            if (diff % eventData.repeating!.interval === 0) {
                    if (eventData.repeating!.count !== undefined) {
                        if (diff / eventData.repeating!.interval > eventData.repeating!.count) {
                            return {match: false, break: true};
                        } else {
                            return {match: true, break: false};
                        }
                    } else {
                        return {match: true, break: false};
                    }
            } else {
                return {match: false, break: false};
            }
        } else {
            return {match: false, break: false};
        }
    }

   /** Count the years between the start and end date
     * @param start: Date     start date
     * @param end: Date        end date.
     * @return the number of whole years since the start year
     */
    private yearsBetween(start: Date, end: Date): number {
        // The previous Moment `diff(..., 'year')` measured from the start of the
        // start year and truncated the partial year, which is exactly the
        // calendar-year distance.
        return differenceInCalendarYears(end, startOfYear(start));
    }
}
