import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { StorageService } from '../../../storage/storage.service';
import { subMinutes } from 'date-fns';
import { AlarmData } from '../../alarmData';

import { AlarmSettingsComponent } from './alarm-settings.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AppointmentsService } from '../../appointments.service';

describe('AlarmSettingsComponent', () => {
    let component: AlarmSettingsComponent;
    let fixture: ComponentFixture<AlarmSettingsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule, AlarmSettingsComponent],
            providers: [provideTranslateService(), StorageService, AppointmentsService]
        })
            .compileComponents();
    });

    beforeEach(inject([AppointmentsService], (service: AppointmentsService) => {
        fixture = TestBed.createComponent(AlarmSettingsComponent);
        component = fixture.componentInstance;
        component.appointment = service.defaultAppointment();
        component.alarms = [];
        fixture.detectChanges();
    }));

    it('should be created', inject([TranslateService], () => {
        expect(component).toBeTruthy();
    }));

    it('should create a form', inject([TranslateService], () => {
        component.createForm();
        expect(component.alarmsForm).toBeDefined();
    }));

    it('should send validator information to appointment', inject([TranslateService], () => {
        component.endValidation();
        expect(component.appointment.valid![2]).toEqual(component.alarmsForm.valid);
    }));

    it('should add an alarm', inject([TranslateService], () => {
        const numAlarms = component.alarms.length;
        const defaultAlarm = <AlarmData>{
            type: 'display',
            triggerDelay: 10,
            triggerUnit: 'MINUTES',
            repeat: 1,
            intervalMinutes: 5,
            trigger: subMinutes(component.appointment.start, 10),
            interval: 5 * 60
        };
        vi.spyOn(component.alarms, 'push');
        const setAlarmsSpy = vi.spyOn(component, 'setAlarms');
        component.addAlarm();
        expect(component.alarms.length).toEqual(numAlarms + 1);
        expect(component.alarms.push).toHaveBeenCalledWith(defaultAlarm);
        expect(setAlarmsSpy).toHaveBeenCalledWith(component.alarms);
    }));

    it('should remove an alarm', inject([TranslateService], () => {
        const defaultAlarm = <AlarmData>{
            type: 'display',
            triggerDelay: 10,
            triggerUnit: 'MINUTES',
            repeat: 1,
            intervalMinutes: 5,
            trigger: subMinutes(component.appointment.start, 10),
            interval: 5 * 60
        };

        component.alarms.push(defaultAlarm);
        const numAlarms = component.alarms.length;
        component.removeAlarm(defaultAlarm);
        expect(component.alarms.length).toEqual(numAlarms - 1);

    }));

    it('should update the alarmforms', inject([TranslateService], () => {
        component.addAlarm();
        const setControlSpy = vi.spyOn(component.alarmsForm, 'setControl');
        component.setAlarms(component.alarms);
        expect(setControlSpy).toHaveBeenCalled();

    }));

    it('should recalculate the trigger correctly', inject([TranslateService], () => {
        const defaultAlarm = <AlarmData>{
            type: 'display',
            triggerDelay: 10,
            triggerUnit: 'MINUTES',
            repeat: 1,
            intervalMinutes: 5
        };
        const expectedTrigger = subMinutes(component.appointment.start, 10);
        component.recalculateTrigger(defaultAlarm);
        expect(defaultAlarm.trigger).toEqual(expectedTrigger);

    }));

    it('should recalculate the interval correctly', inject([TranslateService], () => {
        const defaultAlarm = <AlarmData>{
            type: 'display',
            triggerDelay: 10,
            triggerUnit: 'MINUTES',
            repeat: 1,
            intervalMinutes: 5
        };
        const expectedInterval = 5 * 60;
        component.recalculateInterval(defaultAlarm);
        expect(defaultAlarm.interval).toEqual(expectedInterval);

    }));

});
