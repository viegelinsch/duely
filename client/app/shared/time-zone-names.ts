/**
 * Time-zone enumeration for the Settings select and the appointment advanced
 * settings.
 *
 * Moment's `tz.names()` used to supply a bundled list of 597 entries: 418
 * canonical zones plus 179 legacy aliases (for example
 * `America/Argentina/Buenos_Aires`, `Asia/Calcutta`, `US/Eastern`). D2 removes
 * Moment, so the runtime `Intl` database becomes the single source of truth:
 *
 * - `Intl.supportedValuesOf('timeZone')` yields the canonical zones (418 in the
 *   Chromium/Node builds Duely ships) but omits the `UTC` identifier and every
 *   legacy alias. `UTC` is added explicitly because it resolves normally and is
 *   a legitimate saved value.
 * - A persisted value that is not enumerated (a legacy alias from an older
 *   saved appointment/settings blob, or `UTC`) is inserted into the list, so
 *   opening the form never silently blanks the current selection.
 *
 * Aliases still resolve through `Intl.DateTimeFormat` and stay valid saved
 * values; they are simply not offered for new selections. That is the reviewed
 * surface change (597 enumerated names to 419), not a data invalidation.
 */

const CANONICAL = Intl.supportedValuesOf('timeZone');

/** The `floating` sentinel is a separate option and never part of this list. */
export const FLOATING = 'floating';

/** True when the runtime `Intl` database can resolve the identifier. */
export function isTimeZoneName(value: string | undefined | null): boolean {
  if (value === undefined || value === null || value === '' || value === FLOATING) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', {timeZone: value}).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * The enumerated names: canonical zones plus `UTC` plus the currently selected
 * identifier when it is a resolvable alias outside the canonical set.
 */
export function timeZoneNames(current?: string | null): string[] {
  const names = [...CANONICAL];
  if (!names.includes('UTC')) {
    names.push('UTC');
  }
  if (current !== undefined && current !== null && current !== FLOATING
    && isTimeZoneName(current) && !names.includes(current)) {
    names.push(current);
  }
  return names.sort();
}
