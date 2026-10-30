/**
 * This file contains a mockup of the storage solutions
 * It will be replaced with the real service
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';

/**
 * This service offers methods to store data
 * @since 0.4.0
 */
@Injectable()
export abstract class StorageService {

  // actual settings:
  public settings = {
    color: 'red',
    // 'light' | 'dark' — stored as a string (like `debug`/`color`) so a future
    // 'auto' value is non-breaking. Mirrored onto <html> by ThemeService.
    themeMode: 'light',
    country: '',
    state: '',
    region: '',
    timeZone: 'floating',
    language: 'en',
    debug: 'DEACTIVATED',
    // iCal product metadata. The defaults reproduce the previously hardcoded
    // literals exactly, so settings persisted before these fields existed keep
    // producing identical iCal output (backwards compatibility).
    calendarName: 'Duely',
    calendarProdId: '//TU Braunschweig//Duely//EN',
    calendarUrl: 'https://duely.tu-braunschweig.de'
  };

  public settingsLoaded = false;

  constructor() {
    this.loadSettings();
  }
  /** gets color string from form
      @eturns color  */
  public getColor(): string {
    return this.settings.color;
  }

  /** @returns debug activated if activated */
  public getDebug(): boolean {
    return this.settings.debug === 'ACTIVATED';
  }

  /** loads the saved settings */
  public loadSettings(): void {
    // overwrite settings if can be found
    const settingsstr = localStorage.getItem('settings');
    if (settingsstr) {
      this.settingsLoaded = true;
      const persisted = JSON.parse(settingsstr);
      const stringKeys: (keyof typeof this.settings)[] = [
        'color', 'themeMode', 'language', 'timeZone',
        'country', 'region', 'state', 'debug',
        'calendarName', 'calendarProdId', 'calendarUrl'
      ];
      for (const key of stringKeys) {
        if (Object.prototype.hasOwnProperty.call(persisted, key)) {
          this.settings[key] = this.normalizeString(persisted[key], this.settings[key]);
        }
      }
    }
  }

  /**
   * Validates a persisted value against the expected type (string) and falls
   * back to the current default when the stored value is null, undefined, or
   * of the wrong type. Prevents corrupted or hand-edited localStorage from
   * injecting non-string values into the settings object.
   */
  private normalizeString(persisted: unknown, fallback: string): string {
    return typeof persisted === 'string' ? persisted : fallback;
  }

  /** get settings and saved them in JSON */
  public saveSettings(settings: any): void {
    localStorage.setItem('settings', JSON.stringify(settings));
    this.loadSettings();
  }

  /**
   * Stores a piece of text either witin the file system
   * or by downloading it as a text file
   * @param text The file contents that are to be stored
   * @param filename The default file name of the stored file
   * @since 0.4.0
   */
  public abstract saveText(text: string, filename?: string): void;

}
