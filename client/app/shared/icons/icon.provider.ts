/**
 * Registers Duely's bundled SVG icon literals with the Material icon registry.
 *
 * Icons land in the `duely` namespace, so templates reference them as
 * `<mat-icon svgIcon="duely:add" aria-hidden="true"></mat-icon>`. Registration
 * uses `addSvgIconLiteralInNamespace` (the literal, in-bundle path) rather than
 * `addSvgIcon(url)`: the URL form issues an HTTP fetch that fails under
 * Electron's `file://` origin, and pulling in the Material webfont would cost
 * ~130 KB versus the ~2 KB of path data in duely-icons.ts.
 *
 * Two notes on the verified @angular/material 20.2.14 API:
 *  - The literal parameter is typed `SafeHtml` and is run through the sanitizer,
 *    so the raw SVG string must be wrapped with `bypassSecurityTrustHtml`. The
 *    literals are first-party, build-time constants (not user input), so this is
 *    safe.
 *  - `svgIcon="duely:add"` is split by MatIcon into namespace `duely` + name
 *    `add` and looked up via that pair, so the icon must be registered INTO the
 *    `duely` namespace (not as a default-namespace icon literally named
 *    "duely:add", which would never resolve).
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, provideAppInitializer } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { DUELY_ICONS } from './duely-icons';

/** Namespace every Duely icon is registered under (`svgIcon="duely:<name>"`). */
export const DUELY_ICON_NAMESPACE = 'duely';

/**
 * App initializer that registers all bundled Duely icons. Add it to the root
 * providers (e.g. `providers: [provideDuelyIcons()]`) when the icons are first
 * consumed by a template.
 */
export const provideDuelyIcons = () =>
  provideAppInitializer(() => {
    const registry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);
    for (const [name, path] of Object.entries(DUELY_ICONS)) {
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
        `<path d="${path}"/></svg>`;
      registry.addSvgIconLiteralInNamespace(
        DUELY_ICON_NAMESPACE,
        name,
        sanitizer.bypassSecurityTrustHtml(svg),
        { viewBox: '0 0 24 24' }
      );
    }
  });
