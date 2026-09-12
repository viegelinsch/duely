/**
 * This file declares the application route table.
 *
 * Extracted verbatim from the former app-routing.module.ts (Phase 5.1) so the
 * routes can be handed to `provideRouter(routes)` in app.config.ts under the
 * standalone bootstrap. The eager `''` route keeps AutoRedirectGuard, which
 * redirects to /settings while `storage.settingsLoaded === false`.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Routes } from '@angular/router';

import { AboutComponent } from './about/about.component';
import { CreatorComponent } from './creator/creator.component';
import { LegalComponent } from './legal/legal.component';
import { SettingsComponent } from './settings/settings.component';
import { NotFoundComponent } from './notFound/notFound.component';

import { AutoRedirectGuard } from './auto-redirect.guard';

export const routes: Routes = [
  {
    path: 'about',
    component: AboutComponent
  },
  {
    path: 'legal',
    component: LegalComponent
  },
  {
    path: 'settings',
    component: SettingsComponent,
    pathMatch: 'full'
  },
  {
    path: '',
    component: CreatorComponent,
    canActivate: [ AutoRedirectGuard ],
    pathMatch: 'full'
  },
  {
    path: '404',
    component: NotFoundComponent
  },
  {
    path: '**',
    redirectTo: '404'
  }
];
