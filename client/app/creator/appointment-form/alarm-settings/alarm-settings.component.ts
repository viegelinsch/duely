/**
 * This file contains a service, which handles multiple alarms.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, Input, OnChanges, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators  } from '@angular/forms';
import { AlarmData } from '../../alarmData';
import moment from 'moment-timezone';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import type { Appointment } from '../../appointment';
import { StorageService } from '../../../storage/storage.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * A service handling multiple alarms.
 */
@Component({
  selector: 'rac-alarm-settings',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule
  ],
  templateUrl: './alarm-settings.component.html',
  styleUrls: ['./alarm-settings.component.scss']
})
export class AlarmSettingsComponent implements OnChanges, OnInit, OnDestroy {
  @Input() appointment!: Appointment;
  alarms!: AlarmData[];
  /** used to get data from html formular */
  alarmsForm!: FormGroup;
  private subscription: Subscription[] = [];

  /** constructs a AdvancedSettingsComponent */
  constructor(private fb: FormBuilder, public storage: StorageService, public translate: TranslateService) {
    this.createForm();
  }
 /** when alram values changes it validates it */
  ngOnInit(): void {
    this.subscription[0] = (this.alarmsForm.valueChanges.subscribe(data => this.endValidation(data)));
  }

 /** checks if alarm is in the object, and if not adds it */
  ngOnChanges(): void {
    if (!this.appointment.alarms) {
      this.appointment.alarms = [];
    }

    this.alarms = this.appointment.alarms;
    this.setAlarms(this.alarms);
  }

  /** creates the alarm form */
  createForm(): void {
    this.alarmsForm = this.fb.group({
      alarms: this.fb.array([])
    });
  }

  /** typed accessor for the alarms FormArray so the template can reach per-group controls */
  get alarmsArray(): FormArray<FormGroup> {
    return this.alarmsForm.controls['alarms'] as FormArray<FormGroup>;
  }

  /** destroys the subcribtion */
  ngOnDestroy() {
    for (const sub of this.subscription) {
      sub.unsubscribe();
    }
  }

  /** gets alarm data and validates it */
  endValidation(_data: unknown) {
    this.appointment.valid![2] = this.alarmsForm.valid;
  }

  /** creates alarm */
  public addAlarm(): void {
    const newAlarm = <AlarmData>{
      type: 'display',
      triggerDelay: 10,
      triggerUnit: 'MINUTES',
      repeat: 1,
      intervalMinutes: 5
    };
    this.recalculateTrigger(newAlarm);
    this.recalculateInterval(newAlarm);
    this.alarms.push(newAlarm);
    this.setAlarms(this.alarms);
  }

  /** removes one alarm */
  public removeAlarm(alarm: AlarmData): void {
    const index = this.alarms.indexOf(alarm);
    if (index > -1) {
      this.alarms.splice(index, 1);
    }
  }

  /** gets alarm data and creates an array */
  setAlarms(alarms: AlarmData[]): void {
    const alarmFGs = alarms.map(alarm => this.fb.group({
        type: alarm.type,
        triggerDelay: [
          alarm.triggerDelay, [
            Validators.required
          ]
        ],
        triggerUnit: alarm.triggerUnit,
        repeat: [
          alarm.repeat, [
            Validators.required
          ]
        ],
        intervalMinutes: alarm.interval ? alarm.interval / 60 : 1,
        description: alarm.description,
    }));
    const alarmFormArray = this.fb.array(alarmFGs);
    for (let i = 0; i < alarmFormArray.length; i++) {
      const xy = alarmFormArray.controls[i] as FormGroup;
      this.subscription[i + 1] = (xy.controls['repeat'].valueChanges.subscribe(() => {
        if (xy.controls['repeat'].value > 1) {
          xy.controls['intervalMinutes'].setValidators([Validators.required, Validators.min(1)]);
        } else {
          xy.controls['intervalMinutes'].setValidators([]);
        }
      }));
    }
    this.alarmsForm.setControl('alarms', alarmFormArray);
  }

  /** gets the alarm distanze and recalculates it as date */
  public recalculateTrigger(alarm: AlarmData): void {
    const start = moment(this.appointment.start);
    alarm.trigger = start.subtract(alarm.triggerDelay,
      alarm.triggerUnit as unknown as moment.unitOfTime.DurationConstructor).toDate();
  }

  /** get alarm intervall and caculates it to minutes */
  public recalculateInterval(alarm: AlarmData): void {
    if (alarm.intervalMinutes != null) {
      alarm.interval = alarm.intervalMinutes * 60;
    }
  }

}
