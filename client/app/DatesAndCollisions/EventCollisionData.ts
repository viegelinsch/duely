/**
 * Typed shape of the event data consumed by the collision-detection system.
 *
 * At runtime this object is produced by ical-generator's `ICalEvent.toJSON()`,
 * whose declared return type (`ICalEventJSONData`) serialises dates as ISO
 * strings.  The collision code, however, accesses `.getHours()` / `.getMinutes()`
 * on `start` and reads it through `date-fns` (which requires a `Date`), so the
 * values that actually flow are `Date` instances.  This interface models the
 * *runtime* shape the collision algorithm depends on, replacing the previous
 * blanket `any`.
 */

/** The `repeating` block inside an iCal event JSON payload. */
export interface RepeatingCollisionData {
  freq: string;
  interval: number;
  count?: number;
  until?: Date;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
  bySetPos?: number;
  exclude?: Date[];
}

/** Top-level event data passed to {@link CollisionDetector.getCollisions}. */
export interface EventCollisionData {
  start: Date;
  end: Date;
  repeating: RepeatingCollisionData | null;
}
