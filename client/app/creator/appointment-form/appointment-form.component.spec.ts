import { inject, ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { By } from '@angular/platform-browser';

import { AppointmentFormComponent } from './appointment-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RecurringSettingsComponent } from './recurring-settings/recurring-settings.component';
import { AlarmSettingsComponent } from './alarm-settings/alarm-settings.component';
import { AdvancedSettingsComponent } from './advanced-settings/advanced-settings.component';
import { AppointmentsService } from '../appointments.service';
import { StorageService } from '../../storage/storage.service';



describe('AppointmentFormComponent', () => {
    let component: AppointmentFormComponent;
    let fixture: ComponentFixture<AppointmentFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule, AppointmentFormComponent,
                RecurringSettingsComponent, AlarmSettingsComponent, AdvancedSettingsComponent],
            providers: [provideTranslateService(), AppointmentsService, StorageService, provideNativeDateAdapter()]
        })
            .compileComponents();
    });

    beforeEach(inject([AppointmentsService], (service: AppointmentsService) => {
        fixture = TestBed.createComponent(AppointmentFormComponent);
        component = fixture.componentInstance;
        const appointment = service.defaultAppointment();
        appointment.start = new Date('2032-03-27T22:00:00Z');
        appointment.end = new Date('2032-03-27T23:00:00Z');
        appointment.recurringSettings!.untilDate = '2032-04-03';
        appointment.alarms = [];
        fixture.componentRef.setInput('appointment', appointment);
        fixture.detectChanges();
    }));

    it('should be created', inject([TranslateService], () => {
        expect(component).toBeTruthy();
    }));

    it('should set the validation correct', inject([TranslateService], () => {
        component.endValidation();
        expect(component.appointment.valid![0]).toEqual(component.appointmentForm.valid);
    }));

    it('should create an appointmentForm', inject([TranslateService], () => {
        component.createForm();
        expect(component.appointmentForm).toBeDefined();
    }));

    it('should give correct daysInMonth', inject([TranslateService], () => {
        expect(component.getDaysInMonth(4, 2010)).toEqual(30);
        expect(component.getDaysInMonth(2, 2004)).toEqual(29);
        expect(component.getDaysInMonth(2, 2100)).toEqual(28);
        expect(component.getDaysInMonth(3, 2009)).toEqual(31);

    }));

    function input(selector: string): HTMLInputElement {
        const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(selector);
        expect(element).not.toBeNull();
        return element!;
    }

    async function edit(selector: string, value: string, blur = false): Promise<void> {
        const element = input(selector);
        element.value = value;
        element.dispatchEvent(new Event('input', {bubbles: true}));
        element.dispatchEvent(new Event('change', {bubbles: true}));
        if (blur) element.dispatchEvent(new Event('blur'));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    it('should keep duration through the real start-date listener across the DST weekend', async () => {
        const update = vi.spyOn(component.recurring, 'updateRepeatsBy');
        const notify = vi.spyOn(component.recurring, 'markForCheck');
        await edit('[formGroupName="start"] input[formControlName="date"]', '03/28/2032');
        expect(component.appointment.start).toEqual(new Date('2032-03-28T22:00:00Z'));
        expect(component.appointment.end).toEqual(new Date('2032-03-28T23:00:00Z'));
        expect(component.appointmentForm.get('end.date')!.value).toEqual(new Date(2032, 2, 28));
        expect(input('[formGroupName="end"] input[formControlName="time"]').value).toBe('23:00');
        expect(update).toHaveBeenCalled();
        expect(notify).toHaveBeenCalled();
    });

    it('guards summary input, model synchronization and validity through real input events', async () => {
        await edit('input[formControlName="summary"]', 'Guard');
        expect(component.appointment.summary).toBe('Guard');
        expect(component.appointment.valid![0]).toBe(true);
        await edit('input[formControlName="summary"]', '');
        expect(component.appointment.summary).toBe('');
        expect(component.appointment.valid![0]).toBe(false);
        await edit('input[formControlName="summary"]', 'x'.repeat(26));
        expect(component.appointmentForm.get('summary')!.hasError('maxlength')).toBe(true);
        expect(component.appointment.valid![0]).toBe(false);
    });

    it('keeps time duration and alarm alias through real blur events and public export', async () => {
        const alarms = component.appointment.alarms;
        const child = fixture.debugElement.query(By.directive(AlarmSettingsComponent)).componentInstance as AlarmSettingsComponent;
        expect(child.alarms).toBe(alarms);
        await edit('input[formControlName="summary"]', 'Form export');
        await edit('[formGroupName="start"] input[formControlName="time"]', '20:30', true);
        expect(component.appointment.start).toEqual(new Date('2032-03-27T20:30:00Z'));
        expect(component.appointment.end).toEqual(new Date('2032-03-27T21:30:00Z'));
        expect(component.appointment.alarms).toBe(alarms);
        expect(child.alarms).toBe(alarms);
        const service = TestBed.inject(AppointmentsService);
        service.addAppointment(component.appointment);
        const ics = service.getICalString().replace(/\r?\n[ \t]/g, '');
        expect(ics).toContain('SUMMARY:Form export');
        expect(ics).toContain('DTSTART:20320327T203000');
        expect(ics).toContain('DTEND:20320327T213000');
    });

    it('updates the rendered recurrence summary after an imperative parent date change', async () => {
        const child = component.recurring;
        child.hideSettings = false;
        child.recurringSettings.frequency = 'MONTHLY';
        child.markForCheck();
        fixture.detectChanges();
        component.appointment.start = new Date('2032-04-14T12:00:00Z');
        component.onStartDateChange();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(child.month).toBe('EVERY 14. OF THE MONTH');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('EVERY 14. OF THE MONTH');
    });

    it('intended guard: moving the end date backward must retain an already valid 22:00 start', async () => {
        await edit('[formGroupName="end"] input[formControlName="date"]', '03/26/2032');
        expect(component.appointment.end).toEqual(new Date('2032-03-26T23:00:00Z'));
        expect(component.appointment.start).toEqual(new Date('2032-03-26T22:00:00Z'));
        expect(input('[formGroupName="start"] input[formControlName="time"]').value).toBe('22:00');
    });

    it('advances a saved UNTIL when the real end-date input passes it', async () => {
        await edit('[formGroupName="end"] input[formControlName="date"]', '04/05/2032');
        expect(component.appointment.recurringSettings!.untilDate).toBe('2032-04-05');
        expect(component.recurring.recurringForm.get('untilDate')!.value).toEqual(new Date(2032, 3, 5));
    });

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
