/**
 * Standalone application configuration (Phase 5.2).
 *
 * Replaces the root NgModule's providers array. Every provider that lived in
 * app.module.ts is carried over verbatim; the module-level DI wiring that used
 * to come from `imports` (AppRoutingModule → RouterModule.forRoot,
 * HttpClientModule, TranslateModule.forRoot) is expressed with the standalone
 * `provide*` helpers / `importProvidersFrom`. `provideDuelyIcons()` is ADDED
 * here: Phase 1.6 authored the initializer but could not wire it into the
 * NgModule bootstrap, so the bundled `duely:*` icons were never registered
 * until now.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { importProvidersFrom } from '@angular/core';
import { APP_BASE_HREF, HashLocationStrategy, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { StorageService } from './storage/storage.service';
import { selectStorageService } from './storage/storage.factory';
import { AutoRedirectGuard } from './auto-redirect.guard';
import { provideDuelyIcons } from './shared/icons/icon.provider';

// AoT requires an exported function for factories
export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    // Async so the ~30 KB animations chunk stays off the critical path; Material
    // selects/toggles/snack-bars render immediately and animate once it resolves.
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    // Registers the bundled duely:* SVG icon literals with MatIconRegistry.
    provideDuelyIcons(),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient]
        }
      })
    ),
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
