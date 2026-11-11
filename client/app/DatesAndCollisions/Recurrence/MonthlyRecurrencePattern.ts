import {
  addDays, addWeeks, differenceInCalendarMonths, getDate, getISODay, getMonth, isLastDayOfMonth, startOfMonth,
  subDays, subWeeks
} from 'date-fns';
import { RecurrencePattern } from './RecurrencePattern';
import { EventCollisionData } from '../EventCollisionData';



/**
 * The class MonthlyRecurrencePattern.
 */
export class MonthlyRecurrencePattern extends RecurrencePattern {

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
            // If byMonthDay is defined but not -1, fall through to monthly check
            return this.monthly(eventData, date);
        } else if (eventData.repeating!.bySetPos !== undefined) {

            return this.bySetPos(eventData, date);
        } else if (eventData.repeating!.byDay !== undefined) {

            return this.byDay(eventData, date);
        } else {

            return this.monthly(eventData, date);
        }
    }

   /** Check if a given last day of the Month is last days of the month
     * @param eventData     The data of the event.
     * @param date          The date to check.
     */
    private lastDayOfMonth(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        if (isLastDayOfMonth(date) === true) {
            return this.isMatchOfInterval(eventData, date);
        }

        return {match: false, break: false};
    }

  /** Check which number the a given day has in a week  
    * @return true, true if the intervall is right
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

/** Check  a given last day of the Month of it number from the last day on
    * @return true, true if the intervall is right
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

  /** Check if a given date intervall is the event date intervall
    * @return true, true if the intervall is right
    */
    private monthly(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        if (getDate(date) === getDate(eventData.start)) {

            return this.isMatchOfInterval(eventData, date);
        }

        return {match: false, break: false};
    }

  /** Check if a given Intervall is identical
    * @return true, true if the intervall is right
    * @return true, false 
    * @return false, false
    * @return false , true
    */
    private isMatchOfInterval(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        const diff = this.monthsBetween(eventData.start, date);

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
    }

  /** Is given start and end date
    * @return the number of whole months between the start month and the date
    */
    private monthsBetween(start: Date, end: Date): number {
        // The previous Moment `diff(..., 'months')` measured from the start of
        // the start month and truncated the partial month, which is exactly the
        // calendar-month distance.
        return differenceInCalendarMonths(end, startOfMonth(start));
    }
}
