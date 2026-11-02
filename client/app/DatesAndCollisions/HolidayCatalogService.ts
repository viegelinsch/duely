import { Injectable } from '@angular/core';
import Holidays from 'date-holidays';

type HolidaysCountry = { country: string; state?: string; region?: string };
type HolidaysHoliday = { date: string; start: Date; end: Date; name: string; type: string; rule: string };

/**
 * Shared owner of the `date-holidays` catalogue construction for the collision-detection path.
 *
 * Extracted (task #63, Phase 11.2, backlog §2(g)-2) from the single construction site that
 * lived inline in `RecurrencePattern.getCollisions()`. The four recurrence subclasses
 * (Daily/Weekly/Monthly/Yearly) inherit that method, so they now all reach the catalogue
 * through this one service. This is a **single-site extraction, NOT a deduplication**:
 * `CollisionDetector.ts` has never constructed a holiday catalogue (git-proven), so there was
 * no second copy to merge.
 *
 * Injectable (`providedIn: 'root'`) so Angular DI can provide it to future consumers, AND
 * directly constructible with no arguments because `RecurrencePattern` is reached via plain
 * `new` (and `CollisionDetector` is constructed directly inside `CollisionDetector.spec.ts`).
 * A `new`-ed instance and the DI root instance are therefore distinct objects; that is
 * acceptable because every `getHolidays()` call is immediately preceded by `init()` and
 * `setLanguages()` for its location, so the output never depends on instance identity or on
 * any cross-call state.
 *
 * BEHAVIOUR PRESERVATION (locked decision 9 — no modernisation, no optimisation): there is
 * **no caching, no memoisation, no reordering and no batching** of years or locations. The
 * exact per-location, per-year `init(country, state, region)` -> `setLanguages([language])` ->
 * `getHolidays(year)` sequence and the single reused `date-holidays` instance (one per
 * `getCollisions()` call, created here in the constructor) are preserved verbatim from the
 * pre-extraction code. `date-holidays` instances are stateful, so this lifecycle is deliberate.
 */
@Injectable({ providedIn: 'root' })
export class HolidayCatalogService {
    /** The `date-holidays` instance, created once per service instance and re-initialised per location. */
    private hd: Holidays;

    constructor() {
        this.hd = new Holidays();
    }

    /**
     * Retrieve the public holidays of one year across all given locations, in the exact order
     * the pre-extraction inline loop produced them (per location, filtered to `type === 'public'`).
     * Multi-location sorting and duplicate removal remain the caller's responsibility, unchanged.
     * @param locations  The locations to be considered when checking for public holidays.
     * @param language   The language used to localise public-holiday names.
     * @param year       The year to retrieve.
     * @return           The public holidays of that year across all locations.
     */
    public getPublicHolidays(locations: HolidaysCountry[], language: string, year: number): HolidaysHoliday[] {
        const holidays: HolidaysHoliday[] = [];

        for (const location of locations) {
            this.hd.init(location.country, location.state, location.region);
            this.hd.setLanguages([language]);
            const holidaysOfYear: HolidaysHoliday[] = this.hd.getHolidays(year);

            for (const hol of holidaysOfYear) {
                if (hol.type === 'public') {
                    holidays.push(hol);
                }
            }
        }

        return holidays;
    }
}
