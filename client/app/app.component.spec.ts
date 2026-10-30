/*
 * This file defines unit tests for the App Component.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed, inject, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { SettingsComponent } from './settings/settings.component';
import { StorageService } from './storage/storage.service';
import { selectStorageService } from './storage/storage.factory';
import { Router } from '@angular/router';

describe('AppComponent', () => {
    let component: AppComponent;
    let settings: SettingsComponent;
    let fixture: ComponentFixture<SettingsComponent>;
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                RouterTestingModule,
                TranslateModule.forRoot(),
                FormsModule,
                ReactiveFormsModule,
                // AppComponent is standalone (Phase 5.4) → imported, not declared.
                AppComponent,
                // SettingsComponent is standalone (Phase 2 pilot) → imported, not declared.
                SettingsComponent
            ],
            providers: [
                { provide: StorageService, useFactory: selectStorageService }
            ]
        }).compileComponents();
    });
    beforeEach(() => {
        fixture = TestBed.createComponent(SettingsComponent);
        settings = fixture.debugElement.componentInstance as SettingsComponent;
        component = TestBed.createComponent(AppComponent).debugElement.componentInstance as AppComponent;
    });

    it('should create the app', inject([TranslateService, Router], (translate: TranslateService, router: Router) => {
        expect(component).toBeTruthy();
    }));

    /* TODO: Test routes */
    it('should go home', inject([TranslateService, Router], (translate: TranslateService, router: Router) => {
        vi.spyOn(router, 'navigate');
        settings.goHome();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    }));

});
