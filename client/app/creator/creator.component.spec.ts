import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { CreatorComponent } from './creator.component';
import { StorageService } from '../storage/storage.service';
import { selectStorageService } from '../storage/storage.factory';
import { AppointmentsService } from './appointments.service';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { AppointmentFormComponent } from './appointment-form/appointment-form.component';
import { RecurringSettingsComponent } from './appointment-form/recurring-settings/recurring-settings.component';
import { AlarmSettingsComponent } from './appointment-form/alarm-settings/alarm-settings.component';
import { AdvancedSettingsComponent } from './appointment-form/advanced-settings/advanced-settings.component';
import { ReactiveFormsModule } from '@angular/forms';



describe('CreatorComponent', () => {
    let component: CreatorComponent;
    let fixture: ComponentFixture<CreatorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule, CreatorComponent,
                AppointmentFormComponent, AdvancedSettingsComponent, AlarmSettingsComponent,
                RecurringSettingsComponent],
            providers: [provideTranslateService(), AppointmentsService, { provide: StorageService, useFactory: selectStorageService }]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CreatorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should be created', inject([AppointmentsService, StorageService, TranslateService], () => {
        expect(component).toBeTruthy();
    }));

    it('should start with 1 appointment', inject([AppointmentsService, StorageService, TranslateService], async () => {
        await component.getAppointments();
        expect(component.appointments).not.toBeUndefined();
        expect(component.appointments.length).toEqual(1);
    }));

    it('should call saveText and getICalString if input is valid', inject([AppointmentsService, StorageService, TranslateService], async (service: AppointmentsService, storage: StorageService) => {
        await component.getAppointments();
        expect(component.appointments).not.toBeNull();
        expect(component.appointments.length).toEqual(1);
        component.appointments[0].summary = 'test'; // now it's a valid input
        const saveTextSpy = vi.spyOn(storage, 'saveText');
        const getICalSpy = vi.spyOn(service, 'getICalString');
        component.generateAndSaveICAL();
        expect(saveTextSpy).toHaveBeenCalled();
        expect(getICalSpy).toHaveBeenCalled();
    }));


    it('shouldn\'t call saveText and getICalString if input is invalid', inject([AppointmentsService, StorageService, TranslateService], async (service: AppointmentsService, storage: StorageService) => {
        await component.getAppointments();
        expect(component.appointments).not.toBeNull();
        expect(component.appointments.length).toEqual(1);
        component.appointments[0].summary = ''; // now it's an invalid input
        const saveTextSpy = vi.spyOn(storage, 'saveText');
        const getICalSpy = vi.spyOn(service, 'getICalString');
        component.generateAndSaveICAL();
        expect(saveTextSpy).not.toHaveBeenCalled();
        expect(getICalSpy).not.toHaveBeenCalled();
    }));
});
