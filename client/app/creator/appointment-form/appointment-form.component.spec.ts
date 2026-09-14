import { inject, ComponentFixture, TestBed } from '@angular/core/testing';
import moment from 'moment-timezone';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { provideNativeDateAdapter } from '@angular/material/core';

import { AppointmentFormComponent } from './appointment-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RecurringSettingsComponent } from './recurring-settings/recurring-settings.component';
import { AlarmSettingsComponent } from './alarm-settings/alarm-settings.component';
import { AdvancedSettingsComponent } from './advanced-settings/advanced-settings.component';
import { AppointmentsService } from '../appointments.service';
import { StorageService } from '../../storage/storage.service';
import { Appointment } from '../appointment';



describe('AppointmentFormComponent', () => {
    let component: AppointmentFormComponent;
    let fixture: ComponentFixture<AppointmentFormComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot(), ReactiveFormsModule, AppointmentFormComponent,
                RecurringSettingsComponent, AlarmSettingsComponent, AdvancedSettingsComponent],
            providers: [AppointmentsService, StorageService, provideNativeDateAdapter()]
        })
            .compileComponents();
    });

    beforeEach(inject([AppointmentsService], (service: AppointmentsService) => {
        fixture = TestBed.createComponent(AppointmentFormComponent);
        component = fixture.componentInstance;
        component.appointment = service.defaultAppointment();
        fixture.detectChanges();
    }));

    it('should be created', inject([TranslateService], (translate: TranslateService) => {
        expect(component).toBeTruthy();
    }));

    it('should set the validation correct', inject([TranslateService], (translate: TranslateService) => {
        component.endValidation(null);
        expect(component.appointment!.valid![0]).toEqual(component.appointmentForm.valid);
    }));

    it('should create an appointmentForm', inject([TranslateService], (translate: TranslateService) => {
        component.createForm();
        expect(component.appointmentForm).toBeDefined();
    }));

    it('should give correct daysInMonth', inject([TranslateService], (translate: TranslateService) => {
        expect(component.getDaysInMonth(4, 2010)).toEqual(30);
        expect(component.getDaysInMonth(2, 2004)).toEqual(29);
        expect(component.getDaysInMonth(2, 2100)).toEqual(28);
        expect(component.getDaysInMonth(3, 2009)).toEqual(31);

    }));

    it('should keep the duration when changing the start date', inject([TranslateService], (translate: TranslateService) => {
        const testDate = moment.utc('2017-07-13', 'YYYY-MM-DD');
        const oldEndTime = moment.utc(component.appointment.end);
        const duration = oldEndTime.diff(component.appointment.start);
        component.createForm();
        component.appointmentForm.get('start.date')!.setValue(testDate);
        component.onStartDateChange();
        expect(moment.utc(component.appointment.start).add(duration).valueOf()).toEqual(component.appointment.end!.valueOf());
    }));

    /*it('should keep the duration when changing the start time', inject([TranslateService],
        (translate: TranslateService) => {
      const testTime = moment.utc('21:30', 'HH:mm');
      const oldEndTime = moment.utc(component.appointment.end);
      const duration = oldEndTime.diff(component.appointment.start);
      component.createForm();
      component.appointmentForm.get('start.time').setValue(testTime);
      component.onStartTimeChange();
      expect(moment.utc(component.appointment.start).add(duration).valueOf()).toEqual(component.appointment.end.valueOf());
    }));*/

    /*it('should adjust starttime when endtime is before starttime', inject([TranslateService],
        (translate: TranslateService) => {
      component.appointment.start = new Date('2017-07-13T06:00:00.000Z'); // same date is important
      component.appointment.end = new Date('2017-07-13T04:00:00.000Z');
      component.validateStartTime();
      component.validateEndTime();
      component.createForm();
      component.onEndTimeChange();
      expect(component.appointment.start.valueOf()).toEqual(component.appointment.end.valueOf());
    }));*/


});
