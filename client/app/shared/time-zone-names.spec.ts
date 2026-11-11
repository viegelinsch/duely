/*
 * This file defines unit tests for the time-zone enumeration that replaced
 * Moment's bundled `tz.names()` list.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FLOATING, isTimeZoneName, timeZoneNames } from './time-zone-names';

describe('time-zone-names', () => {
  it('enumerates the canonical zones plus UTC', () => {
    const names = timeZoneNames();
    expect(names).toContain('Europe/Berlin');
    expect(names).toContain('America/New_York');
    expect(names).toContain('UTC');
    expect(names).toEqual([...names].sort());
  });

  it('never enumerates the floating sentinel', () => {
    expect(timeZoneNames()).not.toContain(FLOATING);
    expect(timeZoneNames(FLOATING)).not.toContain(FLOATING);
  });

  it('keeps a saved alias that the runtime database still resolves', () => {
    // `US/Eastern` belongs to Moment's 597-name list but not to the canonical
    // Intl set; it still resolves, so a saved appointment must not lose it.
    expect(isTimeZoneName('US/Eastern')).toBe(true);
    expect(timeZoneNames('US/Eastern')).toContain('US/Eastern');
  });

  it('does not duplicate a saved zone that is already enumerated', () => {
    const names = timeZoneNames('Europe/Berlin');
    expect(names.filter(name => name === 'Europe/Berlin')).toHaveLength(1);
  });

  it('ignores a saved value that cannot be resolved', () => {
    expect(isTimeZoneName('Mars/Olympus')).toBe(false);
    expect(timeZoneNames('Mars/Olympus')).not.toContain('Mars/Olympus');
  });

  it('rejects empty and floating identifiers', () => {
    expect(isTimeZoneName(undefined)).toBe(false);
    expect(isTimeZoneName(null)).toBe(false);
    expect(isTimeZoneName('')).toBe(false);
    expect(isTimeZoneName(FLOATING)).toBe(false);
  });
});
