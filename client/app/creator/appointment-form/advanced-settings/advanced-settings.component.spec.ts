import {ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { StorageService } from '../../../storage/storage.service';
import { AppointmentsService } from '../../appointments.service';
import { AdvancedSettingsComponent } from './advanced-settings.component';
import { ReactiveFormsModule } from '@angular/forms';

describe('AdvancedSettingsComponent', () => {
  let component: AdvancedSettingsComponent;
  let fixture: ComponentFixture<AdvancedSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AdvancedSettingsComponent, ReactiveFormsModule ],
      providers: [ provideTranslateService(), StorageService, AppointmentsService ]
    })
    .compileComponents();
  });

  beforeEach(inject([AppointmentsService], (service: AppointmentsService) => {
    fixture = TestBed.createComponent(AdvancedSettingsComponent);
    component = fixture.componentInstance;
    component.appointment = service.defaultAppointment();
    fixture.detectChanges();
  }));

  it('should be created', inject([TranslateService],
      () => {
    expect(component).toBeTruthy();
  }));

  it('should set the validation correctly', inject([TranslateService],
      () => {
    component.endValidation();
    expect(component.appointment.valid![3]).toEqual(component.advancedForm.valid);
  }));

  it('should update the appointment', inject([TranslateService],
      () => {
    component.updateAppointment();
    expect(component.appointment.status).toEqual(component.status);
    expect(component.appointment.floating).toEqual(component.timezone === 'floating');
    expect(component.appointment.timezone).toEqual(component.timezone === 'floating' ? undefined : component.timezone);

  }));

  it('should be created', inject([TranslateService],
      () => {
    expect(component).toBeTruthy();
  }));

  /* TODO: test createForm / ngOnOnit & ngOnChanges */
});

describe('AdvancedSettingsComponent with a stored legacy time-zone alias', () => {
  let component: AdvancedSettingsComponent;
  let fixture: ComponentFixture<AdvancedSettingsComponent>;

  beforeEach(async () => {
    localStorage.setItem('settings', JSON.stringify({ timeZone: 'US/Eastern' }));
    await TestBed.configureTestingModule({
      imports: [ AdvancedSettingsComponent, ReactiveFormsModule ],
      providers: [ provideTranslateService(), StorageService, AppointmentsService ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdvancedSettingsComponent);
    component = fixture.componentInstance;
    component.appointment = TestBed.inject(AppointmentsService).defaultAppointment();
    component.hideSettings = false;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('settings'));

  it('offers the stored alias and selects it instead of a blank control', () => {
    const host = fixture.nativeElement as HTMLElement;
    const select = host.querySelector<HTMLSelectElement>('select[formControlName="timezone"]');
    if (!select) {
      throw new Error('The time-zone select did not render');
    }
    const values = Array.from(select.options).map((option) => option.value);
    expect(values).toContain('US/Eastern');
    expect(select.value).toEqual('US/Eastern');
    expect(component.appointment.timezone).toEqual('US/Eastern');
    expect(component.appointment.floating).toBeUndefined();
  });
});
