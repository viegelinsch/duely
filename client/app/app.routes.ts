/**
 * This file declares the application route table.
 *
 * Extracted verbatim from the former app-routing.module.ts (Phase 5.1) so the
 * routes can be handed to `provideRouter(routes)` in app.config.ts under the
 * standalone bootstrap.
 *
 * Phase 11.1: route-level lazy loading via `loadComponent`. The root route
 * (Creator + AutoRedirectGuard) and the wildcard/404 error routes are kept
 * EAGER so that error behaviour cannot regress and the guard's synchronous
 * redirect stays in the initial chunk. The three secondary routes (about,
 * legal, settings) use dynamic `import()` for code-splitting.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Routes } from '@angular/router';

import { CreatorComponent } from './creator/creator.component';
import { NotFoundComponent } from './notFound/notFound.component';

import { AutoRedirectGuard } from './auto-redirect.guard';

export const routes: Routes = [
  {
    path: 'about',
    loadComponent: () => import('./about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'legal',
    loadComponent: () => import('./legal/legal.component').then(m => m.LegalComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
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
