/**
 * Applies Duely's persisted theme selection to the document root.
 *
 * The service is intentionally minimal: no RxJS, no BehaviorSubject, no
 * HostBinding. It reads the two theme fields from StorageService.settings and
 * mirrors them onto <html> as `data-color` / `data-theme` attributes, which the
 * selectors in styles/_theme.scss key off of. The inline head script in
 * index.html sets the same attributes before the bundle parses (killing the
 * dark-mode flash); this service re-applies them once Angular is live and after
 * any settings change.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { StorageService } from '../storage/storage.service';

/** @since 0.5.0 Mirrors persisted theme settings onto the document element. */
@Injectable({ providedIn: 'root' })
export class ThemeService {

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private storage: StorageService
  ) { }

  /** Writes `data-color` (accent) and `data-theme` ('light' | 'dark') to <html>. */
  public apply(): void {
    const root = this.document.documentElement;
    root.setAttribute('data-color', this.storage.settings.color);
    root.setAttribute('data-theme', this.storage.settings.themeMode);
  }

}
