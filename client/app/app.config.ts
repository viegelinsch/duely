/**
 * Standalone application configuration (Phase 5.2).
 *
 * Replaces the root NgModule's providers array. Every provider that lived in
 * app.module.ts is carried over verbatim; the module-level DI wiring that used
 * to come from `imports` (AppRoutingModule → RouterModule.forRoot,
 * HttpClientModule, ngx-translate's root module) is expressed with the
 * standalone `provide*` helpers. `provideDuelyIcons()` is ADDED
 * here: Phase 1.6 authored the initializer but could not wire it into the
 * NgModule bootstrap, so the bundled `duely:*` icons were never registered
 * until now.
 *
 * ngx-translate v18 removed the NgModule entry point (TranslateModule), so the
 * translation wiring now uses provideTranslateService + the DI-driven
 * provideTranslateHttpLoader. The resource prefix/suffix are unchanged, so the
 * runtime contract (./assets/i18n/<lang>.json) stays identical.
 *
 * Angular 21 changed the bootstrap default from zone.js change detection to
 * zoneless change detection (internalCreateApplication injects
 * provideZonelessChangeDetectionInternal() ahead of the app providers).
 * `provideZoneChangeDetection()` is therefore an explicit, intentional provider
 * here: it overrides that default so the zone.js runtime this app still ships
 * (angular.json polyfills, zone.js is scheduled for D4) keeps driving change
 * detection exactly as it did on Angular 20. Without it, state written from
 * plain promise callbacks (for example CreatorComponent's
 * AppointmentsService.getAppointments() callback that seeds the first
 * appointment form) is only painted on the next event-driven CD pass.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { APP_BASE_HREF, HashLocationStrategy, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { StorageService } from './storage/storage.service';
import { selectStorageService } from './storage/storage.factory';
import { AutoRedirectGuard } from './auto-redirect.guard';
import { provideDuelyIcons } from './shared/icons/icon.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21 defaults to zoneless change detection; keep the Angular 20
    // zone.js semantics this application was written against (see header).
    provideZoneChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withXhr()),
    // Async so the ~30 KB animations chunk stays off the critical path; Material
    // selects/toggles/snack-bars render immediately and animate once it resolves.
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    // `NativeDateAdapter` falls back to en-US when no MAT_DATE_LOCALE provider
    // exists, so the German UI rendered English month and accessibility labels
    // (for example "April 5, 2032" instead of "5. April 2032"). The persisted
    // language is the single source of truth for the UI language the translator
    // loads, so the date adapter now derives its locale from the same value.
    {
      provide: MAT_DATE_LOCALE,
      useFactory: (storage: StorageService) => storage.settings.language === 'de' ? 'de-DE' : 'en-US',
      deps: [StorageService]
    },
    // Registers the bundled duely:* SVG icon literals with MatIconRegistry.
    provideDuelyIcons(),
    provideTranslateService({
      loader: provideTranslateHttpLoader({prefix: './assets/i18n/', suffix: '.json'})
    }),
    {
      provide: StorageService,
      useFactory: selectStorageService
    },
    {
      provide: LocationStrategy,
      useClass: environment.isElectron ? HashLocationStrategy : PathLocationStrategy
    },
    {
      provide: APP_BASE_HREF,
      useValue: environment.isElectron ? '' : '/'
    },
    AutoRedirectGuard
  ]
};
