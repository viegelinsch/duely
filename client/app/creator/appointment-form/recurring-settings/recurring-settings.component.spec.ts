import { inject, ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';

import { RecurringSettingsComponent } from './recurring-settings.component';
import { ReactiveFormsModule } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { StorageService } from '../../../storage/storage.service';
import { AppointmentsService } from '../../appointments.service';



describe('RecurringSettingsComponent', () => {
    let component: RecurringSettingsComponent;
    let fixture: ComponentFixture<RecurringSettingsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule, RecurringSettingsComponent],
            providers: [provideTranslateService(), AppointmentsService, StorageService, provideNativeDateAdapter()]
        })
            .compileComponents();
    });

    beforeEach(inject([AppointmentsService], (service: AppointmentsService) => {
        fixture = TestBed.createComponent(RecurringSettingsComponent);
        component = fixture.componentInstance;
        const appointment = service.defaultAppointment();
        appointment.start = new Date('2032-03-27T09:00:00Z');
        appointment.end = new Date('2032-03-27T10:00:00Z');
        appointment.recurringSettings!.untilDate = '2032-04-03';
        fixture.componentRef.setInput('appointment', appointment);
        fixture.detectChanges();
    }));

    it('should be created', inject([TranslateService], () => {
        expect(component).toBeTruthy();
    }));

    it('should update recurrence validity for COUNT and remove that constraint for UNTIL', () => {
        component.recurringForm.get('ends')!.setValue('COUNT');
        component.recurringForm.get('count')!.setValue(0);
        expect(component.appointment.valid![1]).toBe(false);
        component.recurringForm.get('count')!.setValue(3);
        expect(component.appointment.valid![1]).toBe(true);
        component.recurringForm.get('ends')!.setValue('UNTIL');
        component.recurringForm.get('count')!.setValue(0);
        expect(component.appointment.valid![1]).toBe(true);
    });

    async function revealUntil(): Promise<HTMLInputElement> {
        component.recurringSettings.frequency = 'DAILY';
        component.recurringSettings.ends = 'UNTIL';
        component.hideSettings = false;
        component.markForCheck();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[formControlName="untilDate"]');
        expect(element).not.toBeNull();
        return element!;
    }

    it('intended guard: hydrates the saved UNTIL calendar day on first reveal and reopening', async () => {
        const first = await revealUntil();
        expect.soft(first.value).toBe('4/3/2032');
        expect.soft(component.enddate).toEqual(new Date(2032, 3, 3));
        component.hideSettings = true;
        component.markForCheck();
        fixture.detectChanges();
        const reopened = await revealUntil();
        expect(reopened.value).toBe('4/3/2032');
        expect(component.recurringSettings.untilDate).toBe('2032-04-03');
    });

    it('keeps a picker-selected UNTIL day on reopening and exports it through the public flow', async () => {
        const element = await revealUntil();
        element.value = '04/05/2032';
        element.dispatchEvent(new Event('input', {bubbles: true}));
        element.dispatchEvent(new Event('change', {bubbles: true}));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.enddate).toEqual(new Date(2032, 3, 5));
        expect(component.recurringSettings.untilDate).toBe('2032-04-05');
        component.hideSettings = true;
        component.markForCheck();
        fixture.detectChanges();
        expect((await revealUntil()).value).toBe('4/5/2032');
        const service = TestBed.inject(AppointmentsService);
        service.addAppointment(component.appointment);
        const ics = service.getICalString().replace(/\r?\n[ \t]/g, '');
        const rule = ics.split(/\r?\n/).find(line => line.startsWith('RRULE:'));
        expect(rule).toContain('FREQ=DAILY');
        expect(rule).toContain('UNTIL=20320405T000000');
    });

    it('should return countries', () => {
        const hdSpy = vi.spyOn(component.hd, 'getCountries').mockReturnValue({ 'a': 'A', 'b': 'B' });
        const ret = component.getCountries();
        expect(ret).toEqual([['a', 'A'], ['b', 'B']]);
        expect(hdSpy).toHaveBeenCalled();
    });

    it('should return states', () => {
        const hdSpy = vi.spyOn(component.hd, 'getStates').mockReturnValue({ 'a': 'A', 'b': 'B' });
        const ret = component.getStates('xyz');
        expect(ret).toEqual([['a', 'A'], ['b', 'B']]);
        expect(hdSpy).toHaveBeenCalledWith('xyz');
    });

    it('should return regions', () => {
        const hdSpy = vi.spyOn(component.hd, 'getRegions').mockReturnValue({ 'a': 'A', 'b': 'B' });
        const ret = component.getRegions('abc', 'def');
        expect(ret).toEqual([['a', 'A'], ['b', 'B']]);
        expect(hdSpy).toHaveBeenCalledWith('abc', 'def');
    });

    it('should return no states if country does not exist', () => {
        const hdSpy = vi.spyOn(component.hd, 'getStates').mockReturnValue(null as unknown as Record<string, string>);
        const ret = component.getStates('xyz');
        expect(ret).toBeUndefined();
        expect(hdSpy).toHaveBeenCalledWith('xyz');
    });

    it('should return no regions if state does not exist', () => {
        const hdSpy = vi.spyOn(component.hd, 'getRegions').mockReturnValue(null as unknown as Record<string, string>);
        const ret = component.getRegions('abc', 'def');
        expect(ret).toBeUndefined();
        expect(hdSpy).toHaveBeenCalledWith('abc', 'def');
    });

});
