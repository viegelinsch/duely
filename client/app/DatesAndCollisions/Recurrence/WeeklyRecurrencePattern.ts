import { startOfWeek } from 'date-fns';
import { RecurrencePattern } from './RecurrencePattern';
import { EventCollisionData } from '../EventCollisionData';


/**
 * The class WeeklyRecurrencePattern.
 */
export class WeeklyRecurrencePattern extends RecurrencePattern {

    public isMatch(eventData: EventCollisionData, date: Date): {match: boolean, break: boolean} {
        if (this.isIn(eventData.repeating!.byDay!, date) === true) {
            const diff = this.weeksBetween(eventData.start, date);

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

        return {match: false, break: false};
    }

    private weeksBetween(start: Date, end: Date): number {
        // Same rule as the previous Moment `diff(..., 'weeks')`: the start is
        // moved to the host week start (Sunday), the DST offset difference is
        // removed, and the remaining whole weeks are truncated.
        const startWeek = startOfWeek(start);
        const zoneDelta = (end.getTimezoneOffset() - startWeek.getTimezoneOffset()) * 60000;

        return Math.trunc((end.getTime() - startWeek.getTime() - zoneDelta) / 604800000);
    }
}
