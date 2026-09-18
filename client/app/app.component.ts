/**
 * This file handles the input form and the genral user interface
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StorageService } from './storage/storage.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { ThemeService } from './theme/theme.service';

/**
 * @version 0.4.0
 * @since 0.2.0
 * Main component that handles the application shell
 */
@Component({
  selector: 'rac-root',
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  /**
   * Creates the component and imports required dependencies
   * @param storage The environment specific storage service
   */
  constructor(public storage: StorageService, private translate: TranslateService, private theme: ThemeService) {
    translate.addLangs(['de', 'en']);

    translate.setDefaultLang('en');
    translate.use(storage.settings.language);
    theme.apply();
  }

}
