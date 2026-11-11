type HolidaysCountry = { country: string; state?: string; region?: string };
import { CollisionDetector, Collision} from '../DatesAndCollisions/CollisionDetector';
import { EventCollisionData, RepeatingCollisionData } from '../DatesAndCollisions/EventCollisionData';
import { addDays } from 'date-fns';
import { HolidayCatalogService } from './HolidayCatalogService';

describe('CollisionDetector', () => {
let cd: CollisionDetector;
let collisions: Collision[];
let eventData: EventCollisionData;

beforeEach(() => {
    const repeatingData: RepeatingCollisionData = {
        freq: 'DAILY',
        interval: 1,
        until: new Date('2032-12-31')
    };

    eventData = {
        start: new Date('2032-01-01'),
        end: new Date('2032-01-01'),
        repeating: repeatingData
    };
});

    it('should return an empty array if no holidays or dates selected by the user are excluded', () => {
        cd = new CollisionDetector(undefined, undefined, 'de');
        collisions = cd.getCollisions(eventData);

        expect(collisions).toEqual([]);
    });

    it('should return all dates excluded by the user', () => {
        const userExcludedDates = new Array<Date>();
        const correctReturn = new Array<Collision>();

        let newDate: Date = new Date('2032-01-01');

        while (+newDate <= +(new Date('2032-01-02'))) {
            const col: Collision = {date: newDate, reason: 'excluded by user'};
            correctReturn.push(col);
            userExcludedDates.push(newDate);

            newDate = addDays(newDate, 1);
        }

        cd = new CollisionDetector(undefined, userExcludedDates, 'de');
        collisions = cd.getCollisions(eventData);

        expect(collisions).toHaveLength(correctReturn.length);
        for (let i = 0; i < correctReturn.length; i++) {
            expect.soft(collisions[i].date).toEqual(correctReturn[i].date);
            expect.soft(collisions[i].reason).toEqual(correctReturn[i].reason);
        }
    });

    it('should return all holidays of Lower Saxony and the city of Augsburg in Bavaria of the year 2032', () => {
        const correctReturn: Collision[] = [
            { date: new Date('2032-01-01T00:00:00+01:00'), reason: 'Neujahr' },
            { date: new Date('2032-01-06T00:00:00+01:00'), reason: 'Heilige Drei Könige' },
            { date: new Date('2032-03-26T00:00:00+01:00'), reason: 'Karfreitag' },
            { date: new Date('2032-03-29T00:00:00+02:00'), reason: 'Ostermontag' },
            { date: new Date('2032-05-01T00:00:00+02:00'), reason: 'Maifeiertag' },
            { date: new Date('2032-05-06T00:00:00+02:00'), reason: 'Christi Himmelfahrt' },
            { date: new Date('2032-05-17T00:00:00+02:00'), reason: 'Pfingstmontag' },
            { date: new Date('2032-05-27T00:00:00+02:00'), reason: 'Fronleichnam' },
            { date: new Date('2032-08-08T00:00:00+02:00'), reason: 'Augsburger Friedensfest' },
            { date: new Date('2032-08-15T00:00:00+02:00'), reason: 'Mariä Himmelfahrt' },
            { date: new Date('2032-10-03T00:00:00+02:00'), reason: 'Tag der Deutschen Einheit' },
            { date: new Date('2032-10-31T00:00:00+02:00'), reason: 'Reformationstag' },
            { date: new Date('2032-11-01T00:00:00+01:00'), reason: 'Allerheiligen' },
            { date: new Date('2032-12-25T00:00:00+01:00'), reason: '1. Weihnachtstag' },
            { date: new Date('2032-12-26T00:00:00+01:00'), reason: '2. Weihnachtstag' }
        ];

        const locations: HolidaysCountry[] = [
            {country: 'de', state: 'ni', region: undefined},
            {country: 'de', state: 'by', region: 'a'}
        ];

        // Raw catalogue dates are independently guarded before the collision-time policy.
        const raw = new HolidayCatalogService().getPublicHolidays(locations, 'de', 2032);
        const union = [...new Map(raw.map(holiday => [holiday.date, {
            date: holiday.start, reason: holiday.name
        }])).values()].sort((a, b) => +a.date - +b.date);
        expect(union).toEqual(correctReturn);

        cd = new CollisionDetector(locations, undefined, 'de');
        collisions = cd.getCollisions(eventData);

        expect(collisions).toHaveLength(correctReturn.length);
        for (let i = 0; i < correctReturn.length; i++) {
            expect.soft(collisions[i].date).toEqual(correctReturn[i].date);
            expect.soft(collisions[i].reason).toEqual(correctReturn[i].reason);
        }
    });

    it('characterizes every holiday collision with the event host-local time, not country midnight', () => {
        const fixture: [string, string][] = [
            ['2032-01-01T00:00:00+01:00', 'Neujahr'],
            ['2032-01-06T00:00:00+01:00', 'Heilige Drei Könige'],
            ['2032-03-26T00:00:00+01:00', 'Karfreitag'],
            ['2032-03-29T00:00:00+02:00', 'Ostermontag'],
            ['2032-05-01T00:00:00+02:00', 'Maifeiertag'],
            ['2032-05-06T00:00:00+02:00', 'Christi Himmelfahrt'],
            ['2032-05-17T00:00:00+02:00', 'Pfingstmontag'],
            ['2032-05-27T00:00:00+02:00', 'Fronleichnam'],
            ['2032-08-08T00:00:00+02:00', 'Augsburger Friedensfest'],
            ['2032-08-15T00:00:00+02:00', 'Mariä Himmelfahrt'],
            ['2032-10-03T00:00:00+02:00', 'Tag der Deutschen Einheit'],
            ['2032-10-31T00:00:00+02:00', 'Reformationstag'],
            ['2032-11-01T00:00:00+01:00', 'Allerheiligen'],
            ['2032-12-25T00:00:00+01:00', '1. Weihnachtstag'],
            ['2032-12-26T00:00:00+01:00', '2. Weihnachtstag']
        ];
        eventData.start = new Date('2032-01-01T09:15:23.125Z');
        eventData.end = new Date('2032-01-01T10:15:23.125Z');
        const expected = fixture.map(([instant, reason]) => {
            const date = new Date(instant);
            date.setHours(eventData.start.getHours(), eventData.start.getMinutes(),
                eventData.start.getSeconds(), eventData.start.getMilliseconds());
            return { date, reason };
        });
        const actual = new CollisionDetector([
            {country: 'de', state: 'ni'}, {country: 'de', state: 'by', region: 'a'}
        ], undefined, 'de').getCollisions(eventData);
        expect(actual).toHaveLength(15);
        expected.forEach((value, i) => expect.soft(actual[i]).toEqual(value));
    });

    it('guards translated reasons and both non-first explicit exclusions within a bounded horizon', () => {
        const dates = [new Date(2032, 0, 2), new Date(2032, 0, 3), new Date(2032, 0, 5)];
        eventData.start = new Date(2032, 0, 1);
        eventData.end = new Date(2032, 0, 1);
        eventData.repeating!.until = new Date(2032, 0, 3);
        const actual = new CollisionDetector(undefined, dates, 'de', 'Vom Benutzer ausgeschlossen')
            .getCollisions(eventData);
        expect(actual).toEqual([
            {date: new Date(2032, 0, 2), reason: 'Vom Benutzer ausgeschlossen'},
            {date: new Date(2032, 0, 3), reason: 'Vom Benutzer ausgeschlossen'}
        ]);
    });
});
