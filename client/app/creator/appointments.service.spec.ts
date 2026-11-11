import { TestBed, inject } from '@angular/core/testing';
import ical from 'ical-generator';
import type { ICalDateTimeValue, ICalEventJSONData, ICalEventJSONRepeatingData } from 'ical-generator';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import type { RecurringSettings } from './recurring-settings';
import { Appointment } from './appointment';
import { AppointmentsService } from './appointments.service';
import { StorageService } from '../storage/storage.service';

/**
 * Narrow ical-generator's serialised `repeating` value to its object form.
 *
 * `ICalEventJSONData.repeating` is typed `ICalEventJSONRepeatingData | string | null`:
 * ical-generator emits a structured object for the repeating options these specs
 * build, a bare string when an event was created from an RRule string, and `null`
 * for non-repeating events. Every event in this suite is created with a structured
 * repeating object, so anything else is a genuine shape regression.
 *
 * The helper therefore THROWS instead of silently returning `undefined` (as a `?.`
 * chain would) or blindly trusting the value (as an `as` cast would): a wrong shape
 * must fail the spec loudly rather than weaken the assertions. The explicit
 * `=== null` guard is required because `typeof null === 'object'`.
 *
 * The return type is the non-nullable `ICalEventJSONRepeatingData`, so downstream
 * property access type-checks and the earlier TS2531 (non-null assertion) fixes
 * cannot regress.
 */
function repeatingData(
    repeating: ICalEventJSONRepeatingData | string | null
): ICalEventJSONRepeatingData {
    if (repeating === null || typeof repeating !== 'object') {
        throw new Error(
            'Expected a structured ICalEventJSONRepeatingData object but received: ' +
            JSON.stringify(repeating)
        );
    }
    return repeating;
}

/**
 * ical-generator serialises date-time values as ISO strings in `toJSON()` (11
 * declares `start`/`end` as `string` and `repeating.until` as an
 * `ICalDateTimeValue`, whose runtime form is likewise a string). These
 * historical expectations compare the exported instants, so the serialised
 * spelling is parsed instead of compared verbatim. A missing value throws
 * rather than silently comparing against nothing, and an unsupported
 * moment/dayjs/luxon stub is rejected instead of being coerced to `Invalid
 * Date` (which would then fail an assertion with a misleading message).
 */
function instant(value: ICalDateTimeValue | null | undefined): Date {
    if (value === null || value === undefined) {
        throw new Error('Expected a serialised date-time value but received ' + String(value));
    }
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (typeof value === 'string') {
        return new Date(value);
    }
    throw new Error('Expected a Date or ISO string but received an unsupported date-time stub');
}

/**
 * ical-generator 11 serialises a location as an object whose title is optional
 * in the `ICalLocation` union (an address-only location has none). Every event
 * in this suite sets a title-only location, so a missing title is a regression
 * rather than an accepted shape.
 */
function locationTitle(location: ICalEventJSONData['location']): string | null {
    if (location === null || !('title' in location)) {
        return null;
    }
    return location.title;
}

// Public-flow guards deliberately leave production defects red. No populated-calendar seam.
describe('AppointmentsService public regression guards', () => {
    let service: AppointmentsService;
    let storage: StorageService;
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideTranslateService(), AppointmentsService, StorageService]
        });
        service = TestBed.inject(AppointmentsService);
        storage = TestBed.inject(StorageService);
        storage.settings.timeZone = 'floating';
        storage.settings.language = 'en';
        TestBed.inject(TranslateService).setTranslation('en', {'EXCLUDED BY USER': 'excluded by user'});
        TestBed.inject(TranslateService).use('en');
    });

    function appointment(overrides: Partial<Appointment> = {}, recurrence: Partial<RecurringSettings> = {}): Appointment {
        const seed = service.defaultAppointment();
        return {...seed, start: new Date('2032-02-07T09:00:00Z'), end: new Date('2032-02-07T10:00:00Z'),
            summary: 'Public guard', timezone: undefined, floating: true, alarms: [], ...overrides,
            recurringSettings: {...seed.recurringSettings!, untilDate: '2032-03-08', ...recurrence}};
    }
    function lines(event: Appointment): string[] {
        service.addAppointment(event);
        const text = service.getICalString().replace(/\r?\n[ \t]/g, '');
        const result = text.split(/\r?\n/);
        expect(result.filter(line => line === 'BEGIN:VEVENT')).toHaveLength(1);
        expect(result).toContain('SUMMARY:Public guard');
        return result;
    }
    function rule(result: string[]): Record<string, string> {
        const rules = result.filter(line => line.startsWith('RRULE:'));
        expect(rules).toHaveLength(1);
        const parsed: Record<string, string> = {};
        for (const part of rules[0].slice(6).split(';')) {
            const [key, value] = part.split('=');
            parsed[key] = value;
        }
        return parsed;
    }
    function ordinal(result: string[], weekday: string, position: number): void {
        const parsed = rule(result);
        // Both legal RFC representations express the same nth weekday in the selected month.
        if (parsed.BYSETPOS !== undefined) {
            expect(parsed.BYDAY).toBe(weekday);
            expect(Number(parsed.BYSETPOS)).toBe(position);
        } else {
            expect(parsed.BYDAY).toBe(`${position}${weekday}`);
        }
    }

    it('exports a simple floating wall-time event and empty public collisions', () => {
        const result = lines(appointment());
        expect(result).toContain('DTSTART:20320207T090000');
        expect(result).toContain('DTEND:20320207T100000');
        expect(result.filter(line => line.startsWith('RRULE:'))).toEqual([]);
        expect(service.getCollisions()).toEqual([]);
    });

    it('intended guard: default floating sentinel must not become a literal TZID', () => {
        storage.settings.timeZone = 'Europe/Berlin';
        const event = appointment({timezone: 'floating', floating: undefined});
        const result = lines(event);
        expect(result).toContain('X-WR-TIMEZONE:Europe/Berlin');
        expect(result).toContain('DTSTART:20320207T090000');
        expect(service.getCollisions()).toEqual([]);
    });

    it('characterizes an explicit named event timezone as preserved UTC-shaped wall components', () => {
        const result = lines(appointment({timezone: 'Europe/Berlin', floating: false}));
        expect(result).toContain('DTSTART;TZID=Europe/Berlin:20320207T090000');
        expect(result).toContain('DTEND;TZID=Europe/Berlin:20320207T100000');
        expect(service.getCollisions()).toEqual([]);
    });

    it('characterizes explicit floating flags overriding a named calendar', () => {
        storage.settings.timeZone = 'Europe/Berlin';
        const result = lines(appointment({timezone: undefined, floating: true}));
        expect(result).toContain('DTSTART:20320207T090000');
        expect(result).toContain('DTEND:20320207T100000');
        expect(service.getCollisions()).toEqual([]);
    });

    it('characterizes omitted event timezone separately from the named calendar metadata', () => {
        storage.settings.timeZone = 'Europe/Berlin';
        const result = lines(appointment({timezone: undefined, floating: undefined}));
        expect(result).toContain('X-WR-TIMEZONE:Europe/Berlin');
        expect(result).toContain('DTSTART:20320207T090000');
        expect(result).toContain('DTEND:20320207T100000');
        expect(service.getCollisions()).toEqual([]);
    });

    it('characterizes UTC events separately from floating values', () => {
        const result = lines(appointment({timezone: 'UTC', floating: false}));
        expect(result).toContain('DTSTART:20320207T090000Z');
        expect(result).toContain('DTEND:20320207T100000Z');
        expect(service.getCollisions()).toEqual([]);
    });

    it('preserves supplied exclusive all-day boundaries without a time or timezone suffix', () => {
        const result = lines(appointment({allDay: true, start: new Date('2032-02-07T00:00:00Z'), end: new Date('2032-02-08T00:00:00Z')}));
        expect(result).toContain('DTSTART;VALUE=DATE:20320207');
        expect(result).toContain('DTEND;VALUE=DATE:20320208');
        expect(service.getCollisions()).toEqual([]);
    });

    it('intended guard: exports alarm content, absolute trigger, repeat and interval through addAppointment', () => {
        const event = appointment({alarms: [{type: 'display', triggerDelay: 15, triggerUnit: 'MINUTES',
            description: 'Reminder', repeat: 2, interval: 5}]});
        const alarms = event.alarms;
        const result = lines(event);
        expect(result).toContain('BEGIN:VALARM');
        expect(result).toContain('ACTION:DISPLAY');
        expect(result).toContain('TRIGGER;VALUE=DATE-TIME:20320207T084500Z');
        expect(result).toContain('DESCRIPTION:Reminder');
        expect(result).toContain('REPEAT:2');
        expect(result).toContain('DURATION:PT5M');
        expect(event.alarms).toBe(alarms);
        expect(service.getCollisions()).toEqual([]);
    });

    it('exports a single alarm action, trigger and description without mutating its model alias', () => {
        const event = appointment({alarms: [{type: 'display', triggerDelay: 15, triggerUnit: 'MINUTES', description: 'Single reminder', repeat: 1}]});
        const alarms = event.alarms;
        const result = lines(event);
        expect(result).toContain('BEGIN:VALARM');
        expect(result).toContain('ACTION:DISPLAY');
        expect(result).toContain('TRIGGER;VALUE=DATE-TIME:20320207T084500Z');
        expect(result).toContain('DESCRIPTION:Single reminder');
        expect(event.alarms).toBe(alarms);
        expect(service.getCollisions()).toEqual([]);
    });

    for (const frequency of ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const) {
        it(`intended guard: exports ${frequency} COUNT without malformed empty EXDATE`, () => {
            const result = lines(appointment({}, {frequency, ends: 'COUNT', count: 3, interval: 1,
                saturday: true, repByMonthly: 'MONTH', repByYearly: 'DAYMONTHYEAR'}));
            const parsed = rule(result);
            expect(parsed.FREQ).toBe(frequency);
            expect(parsed.COUNT).toBe('3');
            expect(parsed.UNTIL).toBeUndefined();
            if (frequency === 'WEEKLY') expect(parsed.BYDAY).toBe('SA');
            expect(result.filter(line => line.startsWith('EXDATE'))).toEqual([]);
            expect(service.getCollisions()).toEqual([]);
        });
    }

    it('characterizes serialized UNTIL date-only midnight, not an invented end-of-day policy', () => {
        const parsed = rule(lines(appointment({}, {frequency: 'DAILY', ends: 'UNTIL', untilDate: '2032-02-10'})));
        expect(parsed.UNTIL).toBe('20320210T000000');
        expect(parsed.COUNT).toBeUndefined();
        expect(service.getCollisions()).toEqual([]);
    });

    it('intended guard: exports both explicit exclusions and their public date/reason collisions', () => {
        const result = lines(appointment({}, {frequency: 'DAILY', ends: 'UNTIL', untilDate: '2032-02-10', exclusions: [
            {type: 'date', date: '2032-02-08'}, {type: 'date', date: '2032-02-09'}
        ]}));
        const excluded = result.filter(line => line.startsWith('EXDATE')).join(',');
        expect(excluded).toContain('20320208T090000');
        expect(excluded).toContain('20320209T090000');
        expect(service.getCollisions()).toEqual([
            {date: new Date('2032-02-08T09:00:00Z'), reason: 'excluded by user'},
            {date: new Date('2032-02-09T09:00:00Z'), reason: 'excluded by user'}
        ]);
    });

    it('intended guard: COUNT describes pre-exclusion occurrences and excludes only dates in that set', () => {
        const result = lines(appointment({}, {frequency: 'DAILY', ends: 'COUNT', count: 3, exclusions: [
            {type: 'date', date: '2032-02-08'}, {type: 'date', date: '2032-02-12'}
        ]}));
        expect(rule(result).COUNT).toBe('3');
        const excluded = result.filter(line => line.startsWith('EXDATE')).join(',');
        expect(excluded).toContain('20320208T090000');
        expect(excluded).not.toContain('20320212');
        expect(service.getCollisions()).toEqual([{date: new Date('2032-02-08T09:00:00Z'), reason: 'excluded by user'}]);
    });

    it('intended guard: exports bounded Augsburg holiday exclusions with their translated name', () => {
        const result = lines(appointment({start: new Date('2032-08-07T09:00:00Z'), end: new Date('2032-08-07T10:00:00Z')}, {
            frequency: 'DAILY', ends: 'UNTIL', untilDate: '2032-08-09', exclusions: [
                {type: 'holidays', holiday_countries: 'de', holiday_states: 'by', holiday_regions: 'a'}
            ]
        }));
        expect(result.filter(line => line.startsWith('EXDATE')).join(',')).toContain('20320807T090000');
        // Characterize the UTC host-local collision policy from P1C; do not silently correct it here.
        expect(service.getCollisions()).toEqual([{date: new Date('2032-08-07T09:00:00Z'), reason: 'Augsburg Peace Festival'}]);
    });

    for (const [date, forward, inverse] of [
        ['2031-02-07', 1, -4], ['2032-02-07', 1, -4], ['2032-02-14', 2, -3], ['2032-02-28', 4, -1]
    ] as const) {
        for (const frequency of ['MONTHLY', 'YEARLY'] as const) {
            for (const direction of ['forward', 'inverse'] as const) {
                it(`intended guard: ${frequency} ${direction} ordinal on ${date} has the correct weekday position`, () => {
                    const start = new Date(`${date}T09:00:00Z`);
                    const weekday = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][start.getUTCDay()];
                    const result = lines(appointment({start, end: new Date(+start + 3600000)}, {
                        frequency, ends: 'COUNT', count: 2,
                        repByMonthly: direction === 'forward' ? 'WEEK' : 'WEEKINV',
                        repByYearly: direction === 'forward' ? 'WEEKYEAR' : 'WEEKINVYEAR'
                    }));
                    ordinal(result, weekday, direction === 'forward' ? forward : inverse);
                    if (frequency === 'YEARLY') expect(rule(result).BYMONTH).toBe('2');
                    expect(service.getCollisions()).toEqual([]);
                });
            }
        }
    }

    for (const [date, forward, inverse] of [['2031-02-20', 14, -7], ['2032-02-20', 15, -6]] as const) {
        for (const frequency of ['MONTHLY', 'YEARLY'] as const) {
            for (const direction of ['forward', 'inverse'] as const) {
                it(`intended guard: ${frequency} ${direction} workday position on ${date} uses the actual month length`, () => {
                    const start = new Date(`${date}T00:00:00Z`);
                    const parsed = rule(lines(appointment({start, end: new Date(+start + 3600000)}, {
                        frequency, ends: 'COUNT', count: 2,
                        repByMonthly: direction === 'forward' ? 'WORK' : 'WORKINV',
                        repByYearly: direction === 'forward' ? 'WORKYEAR' : 'WORKINVYEAR'
                    })));
                    expect(parsed.BYDAY).toBe('MO,TU,WE,TH,FR');
                    expect(Number(parsed.BYSETPOS)).toBe(direction === 'forward' ? forward : inverse);
                    if (frequency === 'YEARLY') expect(parsed.BYMONTH).toBe('2');
                    expect(service.getCollisions()).toEqual([]);
                });
            }
        }
    }

    for (const frequency of ['MONTHLY', 'YEARLY'] as const) {
        it(`intended guard: ${frequency} last February workday handles the one-based leap-month boundary`, () => {
            const parsed = rule(lines(appointment({start: new Date('2032-02-27T00:00:00Z'), end: new Date('2032-02-27T01:00:00Z')}, {
                frequency, ends: 'COUNT', count: 2, repByMonthly: 'WORKINV', repByYearly: 'WORKINVYEAR'
            })));
            expect(parsed.BYDAY).toBe('MO,TU,WE,TH,FR');
            expect(parsed.BYSETPOS).toBe('-1');
            if (frequency === 'YEARLY') expect(parsed.BYMONTH).toBe('2');
            expect(service.getCollisions()).toEqual([]);
        });
    }
});

describe('AppointmentsService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideTranslateService(), AppointmentsService, StorageService]
        });
    });

    it('should be created', inject([AppointmentsService], (service: AppointmentsService) => {
        expect(service).toBeTruthy();
    }));

    it('should add an appointment', inject([AppointmentsService], (service: AppointmentsService) => {
        const appointments = [
            {
                'summary': '1',
                'location': 'TU Braunschweig',
                'start': new Date('2017-07-13T06:00:00.000Z'),
                'end': new Date('2017-07-13T16:00:58.220Z'),
                'alarms': []
            },
            {
                'summary': '2',
                'location': 'TU Braunschweig',
                'start': new Date('2017-07-13T06:00:00.000Z'),
                'end': new Date('2017-07-13T16:00:58.220Z'),
                'alarms': []
            },
            {
                'summary': '3',
                'location': 'TU Braunschweig',
                'start': new Date('2017-07-13T06:00:00.000Z'),
                'end': new Date('2017-07-13T16:00:58.220Z'),
                'alarms': []
            }
        ];
        service.addAppointment(appointments[0]);
        service.addAppointment(appointments[1]);
        service.addAppointment(appointments[2]);
        expect(service.events).toEqual(appointments);
    }));

    it('should remove an appointment', inject([AppointmentsService], (service: AppointmentsService) => {
        const appointments = [
            {
                'summary': '1',
                'location': 'TU Braunschweig',
                'start': new Date('2017-07-13T06:00:00.000Z'),
                'end': new Date('2017-07-13T16:00:58.220Z'),
                'alarms': []
            },
            {
                'summary': '2',
                'location': 'TU Braunschweig',
                'start': new Date('2017-07-13T06:00:00.000Z'),
                'end': new Date('2017-07-13T16:00:58.220Z'),
                'alarms': []
            },
            {
                'summary': '3',
                'location': 'TU Braunschweig',
                'start': new Date('2017-07-13T06:00:00.000Z'),
                'end': new Date('2017-07-13T16:00:58.220Z'),
                'alarms': []
            }
        ];
        for (let i = 0; i < appointments.length; i++) {
            service.events[i] = Object.assign({}, appointments[i]); // deep copy
        }
        service.removeAppointment(service.events[1]);
        expect(service.events[0]).toEqual(appointments[0]);
        expect(service.events[1]).toEqual(appointments[2]);
    }));

    it('should return a valid iCal string', inject([AppointmentsService], (service: AppointmentsService) => {
        const freq: 'NEVER' | 'DAILY' | 'MONTHLY' | 'YEARLY' = 'NEVER';
        const end: 'NEVER' | 'COUNT' | 'UNTIL' = 'NEVER';
        const repByMonthly: 'MONTH' | 'MONTHINV' | 'WEEK' | 'WEEKINV' = 'MONTH';
        const repByYearly: 'DAYMONTHYEAR' | 'WEEKYEAR' | 'WEEKINVYEAR' = 'DAYMONTHYEAR';
        const appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-13T06:00:00.000Z'),
            'end': new Date('2017-07-13T16:00:58.220Z'),
            'allDay': true,
            'recurringSettings': {
                'frequency': freq,
                'interval': 1,
                'ends': end,
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': false,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': repByMonthly,
                'repByYearly': repByYearly,
                'count': 1,
                'untilDate': new Date('2017-07-13T16:00:58.220Z'),
                'exclusions': []
            },
            'alarms': []
        };
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        calendar.createEvent({
            start: new Date('2017-07-13T06:00:00.000Z'),
            end: new Date('2017-07-13T16:00:58.220Z'),
            stamp: new Date(),
            summary: 'SEP - TDSE',
            location: 'TU Braunschweig',
            allDay: false,
        });
        vi.spyOn(service, 'initializeCalendar').mockReturnValue(calendar);
        service.events = [appointment];
        vi.spyOn(service, 'addEventToCalendar');
        expect(service.getICalString()).toContain('BEGIN:VCALENDAR');
        expect(service.getICalString()).toContain('VERSION:2.0');
        expect(service.getICalString()).toContain('PRODID:-//TU Braunschweig//Duely//EN');
        expect(service.getICalString()).toContain('URL:https://duely.tu-braunschweig.de');
        expect(service.getICalString()).toContain('NAME:Duely');
        expect(service.getICalString()).toContain('X-WR-CALNAME:Duely');
        expect(service.getICalString()).toContain('TIMEZONE-ID:Europe/Berlin');
        expect(service.getICalString()).toContain('X-WR-TIMEZONE:Europe/Berlin');
        expect(service.getICalString()).toContain('BEGIN:VEVENT');
        expect(service.getICalString()).toContain('SEQUENCE:0');
        // Both events in this calendar omit a timezone, and the approved export
        // contract (guards above) maps an omitted timezone to floating wall time
        // rather than to UTC or to the calendar's timezone metadata.
        expect(service.getICalString()).toContain('DTSTART:20170713T060000');
        expect(service.getICalString()).toContain('DTEND:20170713T160058');
        expect(service.getICalString()).not.toContain('DTSTART;TZID=Europe/Berlin:20170713T060000');
        expect(service.getICalString()).toContain('SUMMARY:SEP - TDSE');
        expect(service.getICalString()).toContain('LOCATION:TU Braunschweig');
        expect(service.getICalString()).toContain('END:VEVENT');
        expect(service.getICalString()).toContain('END:VCALENDAR');
    }));

    it('should add a simple event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': '2017-07-13T06:00:00.000Z',
                    'end': '2017-07-13T16:00:58.220Z',
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'allDay': true,
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-13T06:00:00.000Z'),
            'end': new Date('2017-07-13T16:00:58.220Z'),
            'allDay': true,
            'status': 'tentative',
            'recurringSettings': {
                'frequency': 'NEVER',
                'interval': 1,
                'ends': 'NEVER',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': false,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'MONTH',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 1,
                'untilDate': new Date('2017-07-03'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(new Date(json.events[0].start.valueOf())).toEqual(new Date(correctAppointment.events[0].start));
        expect(new Date(json.events[0].end!.valueOf())).toEqual(new Date(correctAppointment.events[0].end));
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(json.events[0].allDay).toEqual(correctAppointment.events[0].allDay);
    }));

    it('should add a recurring (daily, never ending) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2017-07-13T06:00:00.000Z'),
                    'end': new Date('2017-07-13T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'DAILY',
                        'interval': 1
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-13T06:00:00.000Z'),
            'end': new Date('2017-07-13T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'DAILY',
                'interval': 1,
                'ends': 'NEVER',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': false,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'MONTH',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 1,
                'untilDate': new Date('2017-07-03'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
    }));

    it('should add a recurring (daily, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2017-07-13T06:00:00.000Z'),
                    'end': new Date('2017-07-13T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'DAILY',
                        'interval': 1,
                        'count': 2
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-13T06:00:00.000Z'),
            'end': new Date('2017-07-13T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'DAILY',
                'interval': 1,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': false,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'MONTH',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 2,
                'untilDate': new Date('2017-07-03'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (daily, until ) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2017-07-13T06:00:00.000Z'),
                    'end': new Date('2017-07-13T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'DAILY',
                        'interval': 1,
                        'until': new Date('2017-07-20T00:00:00.000Z')
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-13T06:00:00.000Z'),
            'end': new Date('2017-07-13T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'DAILY',
                'interval': 1,
                'ends': 'UNTIL',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': false,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'MONTH',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 2,
                'untilDate': new Date('2017-07-20'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(instant(repeatingData(json.events[0].repeating).until)).toEqual(correctAppointment.events[0].repeating.until);
    }));

    it('should add a recurring (weekly-thursday, interval: 2, never-ending) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2017-07-13T06:00:00.000Z'),
                    'end': new Date('2017-07-13T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'WEEKLY',
                        'byDay': ['TH'],
                        'interval': 2
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-13T06:00:00.000Z'),
            'end': new Date('2017-07-13T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'WEEKLY',
                'interval': 2,
                'ends': 'NEVER',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'MONTH',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 2,
                'untilDate': new Date('2017-07-20'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
    }));

    it('should add a recurring (monthly, every 2. wednesday, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2100-10-13T06:00:00.000Z'),
                    'end': new Date('2100-10-13T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'MONTHLY',
                        // "every 2nd wednesday": RFC 5545 spells the ordinal as
                        // BYDAY=2WE, ical-generator 11 emits BYDAY=WE plus
                        // BYSETPOS=2. Both select the same day of the month.
                        'byDay': ['WE'],
                        'bySetPos': [2],
                        'interval': 2,
                        'count': 2
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2100-10-13T06:00:00.000Z'),
            'end': new Date('2100-10-13T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'MONTHLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEK',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 2,
                'untilDate': new Date('2017-07-20'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (monthly, every last, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2100-10-13T06:00:00.000Z'),
                    'end': new Date('2100-10-13T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'MONTHLY',
                        'byMonthDay': [-1],
                        'interval': 2,
                        'count': 2
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2100-10-13T06:00:00.000Z'),
            'end': new Date('2100-10-13T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'MONTHLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'MONTHINV',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 2,
                'untilDate': new Date('2017-07-20'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byMonthDay).toEqual(correctAppointment.events[0].repeating.byMonthDay);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (monthly, every 3. last wednesday, interval 2, never-ending) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2100-10-13T06:00:00.000Z'),
                    'end': new Date('2100-10-13T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'MONTHLY',
                        // "every 3rd last wednesday": BYDAY=-3WE selects the same
                        // day as BYDAY=WE with BYSETPOS=-3.
                        'byDay': ['WE'],
                        'bySetPos': [-3],
                        'interval': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2100-10-13T06:00:00.000Z'),
            'end': new Date('2100-10-13T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'MONTHLY',
                'interval': 2,
                'ends': 'NEVER',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 2,
                'untilDate': new Date('2017-07-20'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
    }));

    it('should add a recurring (monthly, every 3. last wednesday, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2100-10-13T06:00:00.000Z'),
                    'end': new Date('2100-10-13T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'MONTHLY',
                        'byDay': ['WE'],
                        'bySetPos': [-3],
                        'interval': 2,
                        'count': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2100-10-13T06:00:00.000Z'),
            'end': new Date('2100-10-13T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'MONTHLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'DAYMONTHYEAR',
                'count': 2,
                'untilDate': new Date('2017-07-20'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (yearly, every first friday of january, interval 2, never-ending) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2098-01-03T06:00:00.000Z'),
                    'end': new Date('2098-01-03T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'YEARLY',
                        // "every first friday": BYDAY=1FR is emitted as
                        // BYDAY=FR with BYSETPOS=1.
                        'byDay': ['FR'],
                        'bySetPos': [1],
                        'byMonth': [1],
                        'interval': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2098-01-03T06:00:00.000Z'),
            'end': new Date('2098-01-03T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'YEARLY',
                'interval': 2,
                'ends': 'UNTIL',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'WEEKYEAR',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).byMonth).toEqual(correctAppointment.events[0].repeating.byMonth);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
    }));

    it('should add a recurring (yearly, every first wednesday of january, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2098-01-01T06:00:00.000Z'),
                    'end': new Date('2098-01-01T16:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'YEARLY',
                        // "every first wednesday": BYDAY=1WE is emitted as
                        // BYDAY=WE with BYSETPOS=1.
                        'byDay': ['WE'],
                        'bySetPos': [1],
                        'byMonth': [1],
                        'interval': 2,
                        'count': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2098-01-01T06:00:00.000Z'),
            'end': new Date('2098-01-01T16:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'YEARLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'WEEKYEAR',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).byMonth).toEqual(correctAppointment.events[0].repeating.byMonth);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (yearly, every second last friday, interval 2, never-ending) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2098-12-19T07:00:00.000Z'),
                    'end': new Date('2098-12-19T17:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'YEARLY',
                        // "every second last friday": BYDAY=-2FR is emitted as
                        // BYDAY=FR with BYSETPOS=-2.
                        'byDay': ['FR'],
                        'bySetPos': [-2],
                        'byMonth': [12],
                        'interval': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2098-12-19T07:00:00.000Z'),
            'end': new Date('2098-12-19T17:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'YEARLY',
                'interval': 2,
                'ends': 'UNTIL',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'WEEKINVYEAR',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).byMonth).toEqual(correctAppointment.events[0].repeating.byMonth);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
    }));

    it('should add a recurring (yearly, every last friday, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2098-12-19T07:00:00.000Z'),
                    'end': new Date('2098-12-19T17:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'YEARLY',
                        'byDay': ['FR'],
                        'bySetPos': [-2],
                        'byMonth': [12],
                        'interval': 2,
                        'count': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2098-12-19T07:00:00.000Z'),
            'end': new Date('2098-12-19T17:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'YEARLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'WEEKINVYEAR',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).byMonth).toEqual(correctAppointment.events[0].repeating.byMonth);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (yearly, last day of december, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2098-12-19T07:00:00.000Z'),
                    'end': new Date('2098-12-19T17:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'YEARLY',
                        'byDay': ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
                        'byMonth': [12],
                        'bySetPos': [-1],
                        'interval': 2,
                        'count': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2098-12-19T07:00:00.000Z'),
            'end': new Date('2098-12-19T17:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'YEARLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'DAYMONTHYEARINV',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).byMonth).toEqual(correctAppointment.events[0].repeating.byMonth);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (yearly, 2. last workday, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    // The start date must BE the ordinal this case claims: the
                    // service derives BYSETPOS from the date, and 2017-07-27 is
                    // the 3rd-to-last workday of July (28th, 31st follow it),
                    // while 2017-07-28 is the 2nd-to-last. The stale 27th fixture
                    // was masked by the string-vs-Date assertion earlier in this
                    // test and could never match the approved contract.
                    'start': new Date('2017-07-28T07:00:00.000Z'),
                    'end': new Date('2017-07-28T17:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'YEARLY',
                        'byDay': ['MO', 'TU', 'WE', 'TH', 'FR'],
                        'byMonth': [7],
                        'bySetPos': [-2],
                        'interval': 2,
                        'count': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-28T07:00:00.000Z'),
            'end': new Date('2017-07-28T17:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'YEARLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'WORKINVYEAR',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).byMonth).toEqual(correctAppointment.events[0].repeating.byMonth);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (yearly, 2. workday, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2017-07-04T07:00:00.000Z'),
                    'end': new Date('2017-07-04T17:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'YEARLY',
                        'byDay': ['MO', 'TU', 'WE', 'TH', 'FR'],
                        'byMonth': [7],
                        'bySetPos': [2],
                        'interval': 2,
                        'count': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-04T07:00:00.000Z'),
            'end': new Date('2017-07-04T17:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'YEARLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WEEKINV',
                'repByYearly': 'WORKYEAR',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).byMonth).toEqual(correctAppointment.events[0].repeating.byMonth);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (monthly, 2. workday, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2017-07-04T07:00:00.000Z'),
                    'end': new Date('2017-07-04T17:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'MONTHLY',
                        'byDay': ['MO', 'TU', 'WE', 'TH', 'FR'],
                        'bySetPos': [2],
                        'interval': 2,
                        'count': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-04T07:00:00.000Z'),
            'end': new Date('2017-07-04T17:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'MONTHLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WORK',
                'repByYearly': 'WORKYEAR',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));

    it('should add a recurring (monthly, 2. weekend day, interval 2, 2 events) event', inject([AppointmentsService], (service: AppointmentsService) => {
        const calendar = ical({
            name: 'Duely',
            prodId: '//TU Braunschweig//Duely//EN',
            url: 'https://duely.tu-braunschweig.de',
            timezone: 'Europe/Berlin' // or what's configured in the settings
        });
        const correctAppointment = {
            'prodId': '//TU Braunschweig//Duely//EN',
            'name': 'Duely',
            'timezone': 'Europe/Berlin',
            'url': 'https://duely.tu-braunschweig.de',
            'events': [{
                    'start': new Date('2017-07-02T07:00:00.000Z'),
                    'end': new Date('2017-07-02T17:00:58.220Z'),
                    'timezone': null,
                    'summary': 'SEP - TDSE',
                    'location': 'TU Braunschweig',
                    'repeating': {
                        'freq': 'MONTHLY',
                        'byDay': ['SA', 'SU'],
                        'bySetPos': [2],
                        'interval': 2,
                        'count': 2,
                    }
                }]
        };
        const toBeTestedAppointment: Appointment = {
            'summary': 'SEP - TDSE',
            'location': 'TU Braunschweig',
            'start': new Date('2017-07-02T07:00:00.000Z'),
            'end': new Date('2017-07-02T17:00:58.220Z'),
            'allDay': false,
            'recurringSettings': {
                'frequency': 'MONTHLY',
                'interval': 2,
                'ends': 'COUNT',
                'monday': false,
                'tuesday': false,
                'wednesday': false,
                'thursday': true,
                'friday': false,
                'saturday': false,
                'sunday': false,
                'repByMonthly': 'WORK',
                'repByYearly': 'WORKYEAR',
                'count': 2,
                'untilDate': new Date('2100-12-31'),
                'exclusions': []
            },
            'alarms': []
        };
        service.addEventToCalendar(calendar, toBeTestedAppointment);
        const json = calendar.toJSON();
        expect(json.prodId).toEqual(correctAppointment.prodId);
        expect(json.name).toEqual(correctAppointment.name);
        expect(json.timezone).toEqual(correctAppointment.timezone);
        expect(json.url).toEqual(correctAppointment.url);
        expect(instant(json.events[0].start)).toEqual(correctAppointment.events[0].start);
        expect(instant(json.events[0].end)).toEqual(correctAppointment.events[0].end);
        expect(json.events[0].timezone).toEqual(correctAppointment.events[0].timezone);
        expect(json.events[0].summary).toEqual(correctAppointment.events[0].summary);
        expect(locationTitle(json.events[0].location)).toEqual(correctAppointment.events[0].location);
        expect(repeatingData(json.events[0].repeating).freq).toEqual(correctAppointment.events[0].repeating.freq);
        expect(repeatingData(json.events[0].repeating).byDay).toEqual(correctAppointment.events[0].repeating.byDay);
        expect(repeatingData(json.events[0].repeating).bySetPos).toEqual(correctAppointment.events[0].repeating.bySetPos);
        expect(repeatingData(json.events[0].repeating).interval).toEqual(correctAppointment.events[0].repeating.interval);
        expect(repeatingData(json.events[0].repeating).count).toEqual(correctAppointment.events[0].repeating.count);
    }));
});
