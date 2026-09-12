/**
 * This file loads the required components and services
 * as well as the Angular dependencies and environment configuration
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NgModule } from '@angular/core';
import { APP_BASE_HREF, CommonModule, HashLocationStrategy, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { environment } from '../environments/environment';

import { StorageService } from './storage/storage.service';
import { selectStorageService } from './storage/storage.factory';
import { AboutComponent } from './about/about.component';
import { LegalComponent } from './legal/legal.component';
// SettingsComponent is now standalone (Phase 2 pilot) — referenced only by the
// router, no longer declared here.
import { CreatorComponent } from './creator/creator.component';
import { NotFoundComponent } from './notFound/notFound.component';
import { AppointmentFormComponent } from './creator/appointment-form/appointment-form.component';
import { AdvancedSettingsComponent } from './creator/appointment-form/advanced-settings/advanced-settings.component';
import { RecurringSettingsComponent } from './creator/appointment-form/recurring-settings/recurring-settings.component';
import { AlarmSettingsComponent } from './creator/appointment-form/alarm-settings/alarm-settings.component';

import { AutoRedirectGuard } from './auto-redirect.guard';

/**
 * @version 0.4.0
 * @since 0.1.0
 * used to load components and bootstrap the application
 * generated and maintained using Angular CLI
 */

 import { HttpClient } from '@angular/common/http';

// AoT requires an exported function for factories
export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    AboutComponent,
    LegalComponent,
    CreatorComponent,
    NotFoundComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    TranslateModule.forRoot({
       loader: {
         provide: TranslateLoader,
         useFactory: createTranslateLoader,
         deps: [HttpClient]
       }
    }),
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatToolbarModule,
    MatSlideToggleModule,
    // Standalone child components (bottom-up migration; each moves here as it flips).
    AdvancedSettingsComponent,
    AlarmSettingsComponent,
    RecurringSettingsComponent,
    AppointmentFormComponent
  ],
  providers: [
    // Async so the ~30 KB animations chunk stays off the critical path; Material
    // selects/toggles/snack-bars render immediately and animate once it resolves.
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
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
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
