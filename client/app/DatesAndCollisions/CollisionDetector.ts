import { DailyRecurrencePattern } from './Recurrence/DailyRecurrencePattern';
import { WeeklyRecurrencePattern } from './Recurrence/WeeklyRecurrencePattern';
import { MonthlyRecurrencePattern } from './Recurrence/MonthlyRecurrencePattern';
import { YearlyRecurrencePattern } from './Recurrence/YearlyRecurrencePattern';
import ical from 'ical-generator';
import Holidays from 'date-holidays';
type HolidaysCountry = { country: string; state?: string; region?: string };

/**
 * The type Collision.
 */
export interface Collision {
    /** The date of a collision. */
    date: Date;
    /** The reason of a collision. */
    reason: string;
}

/**
 * The class CollisionDetector.
 */
export class CollisionDetector {
    /** The locations to be considered when checking for collisions with public holidays.  */
    private locations: HolidaysCountry[];
    /** The dates that are excluded by the user. */
    private userExclusions: Date[];
    /** The language. */
    private language: string;
    /**
     * The already-translated reason for user-excluded dates, resolved from the
     * i18n locale files by the DI-managed caller and passed through to the
     * recurrence patterns. Optional so that direct instantiation (e.g. unit tests)
     * keeps working; the patterns fall back to their own default when omitted.
     */
    private excludedByUserReason?: string;

    /**
     * Constructor of class CollisionDetector
     * @param locations         The locations to be considered when checking for collisions with public holidays.
     * @param userExclusions    The dates that are excluded by the user.
     * @param language          The language used to localise public-holiday names.
     * @param excludedByUserReason  The pre-translated reason for user-excluded dates.
     */
    constructor(locations: HolidaysCountry[], userExclusions: Date[], language: string,
                excludedByUserReason?: string) {
        this.locations = locations;
        this.userExclusions = userExclusions;
        this.language = language;
        this.excludedByUserReason = excludedByUserReason;
    }

    /**
     * Get the collisions with a given event.
     * @param eventData     The data of an iCal event.
     * @return              The collisions.
     */
    public getCollisions(eventData: any): Collision[] {
        let collisions: Collision[] = [];

        if (eventData.repeating !== undefined) {
          switch (eventData.repeating.freq) {
              case 'DAILY': {
                  const drp = new DailyRecurrencePattern(this.locations, this.userExclusions, this.language, this.excludedByUserReason);
                  collisions = drp.getCollisions(eventData);
                  break;
              }
              case 'WEEKLY': {
                  const wrp = new WeeklyRecurrencePattern(this.locations, this.userExclusions, this.language, this.excludedByUserReason);
                  collisions = wrp.getCollisions(eventData);
                  break;
              }
              case 'MONTHLY': {
                  const mrp = new MonthlyRecurrencePattern(this.locations, this.userExclusions, this.language, this.excludedByUserReason);
                  collisions = mrp.getCollisions(eventData);
                  break;
              }
              case 'YEARLY': {
                  const yrp = new YearlyRecurrencePattern(this.locations, this.userExclusions, this.language, this.excludedByUserReason);
                  collisions = yrp.getCollisions(eventData);
                  break;
              }
          }
        }

        return collisions;
    }
}
