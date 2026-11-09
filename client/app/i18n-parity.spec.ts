/*
 * This file defines the en/de translation key-parity test (Phase 12, task #37).
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS SPEC EXISTS
 * ---------------------------------------------------------------------------
 * `client/assets/i18n/en.json` and `client/assets/i18n/de.json` are loaded at
 * runtime by ngx-translate. A key present in only one locale silently renders
 * as the raw key text for users of the other language, and nothing in the
 * build, lint or existing test gates catches that drift. This spec closes the
 * gap (backlog §2(g)-7): it asserts the two files hold IDENTICAL key sets and,
 * on failure, reports the symmetric difference so the offending keys are named
 * directly in the test output.
 *
 * Deliberately NOT asserted here (all perfectly symmetric across locales, so
 * a parity test cannot detect them — see backlog §3): orphaned keys, wording
 * correctness, and runtime translation rendering.
 *
 * ---------------------------------------------------------------------------
 * IMPLEMENTATION NOTES
 * ---------------------------------------------------------------------------
 * - The JSON files are imported directly (`resolveJsonModule: true` in the root
 *   tsconfig; esbuild handles JSON imports natively). This avoids Node.js `fs`
 *   which is unavailable in the `@angular/build:unit-test` browser-platform
 *   esbuild bundle.
 * - Keys are extracted RECURSIVELY as dot-separated paths, matching
 *   ngx-translate's own nested-key syntax (`translate.instant('a.b.c')`).
 *   Both files are flat today (127 top-level keys each at task #37), but the
 *   recursion keeps the spec correct if nesting is ever introduced.
 * - Arrays are treated as leaf values, not key namespaces: ngx-translate does
 *   not resolve array indices as key paths.
 * - No TestBed, no Angular imports: this is a pure data-contract test and must
 *   not perturb the frozen 24-failure partition (locked decision 3).
 */

import enData from '../assets/i18n/en.json';
import deData from '../assets/i18n/de.json';

/**
 * Validates one imported locale module and narrows it to a plain key/value
 * record. A JSON module that is not a top-level object (array, string, null)
 * is rejected loudly rather than silently yielding an empty key set.
 */
function asLocaleData(name: string, imported: unknown): Record<string, unknown> {
    if (imported === null || typeof imported !== 'object' || Array.isArray(imported)) {
        throw new Error(`${name}.json must contain a JSON object at its top level`);
    }
    return imported as Record<string, unknown>;
}

/**
 * Recursively collects every translation key as its dot-separated path.
 * Plain objects descend; everything else (strings, numbers, arrays, null) is
 * a leaf value whose own path is the key.
 */
function collectKeys(value: unknown, prefix: string, keys: Set<string>): void {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        for (const [property, child] of Object.entries(value as Record<string, unknown>)) {
            collectKeys(child, prefix === '' ? property : `${prefix}.${property}`, keys);
        }
        return;
    }
    keys.add(prefix);
}

/** All dot-separated keys of one locale, sorted for deterministic reporting. */
function keySet(data: Record<string, unknown>): Set<string> {
    const keys = new Set<string>();
    collectKeys(data, '', keys);
    return keys;
}

/** Every key in `source` that is absent from `target`, sorted. */
function missingFrom(source: Set<string>, target: Set<string>): string[] {
    return [...source].filter((key) => !target.has(key)).sort();
}

describe('I18nKeyParity', () => {
    const en = asLocaleData('en', enData);
    const de = asLocaleData('de', deData);
    const enKeys = keySet(en);
    const deKeys = keySet(de);

    it('en.json and de.json define the identical set of translation keys', () => {
        const missingInDe = missingFrom(enKeys, deKeys);
        const missingInEn = missingFrom(deKeys, enKeys);

        // Both directions are asserted with the full sorted difference in the
        // assertion message, so a failure names every offending key at once.
        expect(missingInDe, `keys in en.json but NOT in de.json: ${missingInDe.join(', ')}`).toEqual([]);
        expect(missingInEn, `keys in de.json but NOT in en.json: ${missingInEn.join(', ')}`).toEqual([]);
        expect(enKeys.size, 'key count en.json vs de.json').toBe(deKeys.size);
    });

    it('both locales are non-empty (guards against a silently truncated file)', () => {
        // A parse of an accidentally emptied file would trivially "pass" parity
        // with 0/0 keys; pin the sets to be genuinely populated instead.
        expect(enKeys.size, 'en.json key count').toBeGreaterThan(0);
        expect(deKeys.size, 'de.json key count').toBeGreaterThan(0);
    });
});
