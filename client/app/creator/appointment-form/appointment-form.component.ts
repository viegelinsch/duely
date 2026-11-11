/**
 * This file describes the logic behind the Appointment forms.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  clampWallHour, clampWallMinute, formatWallDate, parseWallTime, pickerDayFromModel, wallDayNumber,
  withWallDay, withWallTime
} from '../../shared/wall-clock';
import { Component, Input, OnChanges, ViewChild, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RecurringSettingsComponent } from './recurring-settings/recurring-settings.component';
import { AlarmSettingsComponent } from './alarm-settings/alarm-settings.component';
import { AdvancedSettingsComponent } from './advanced-settings/advanced-settings.component';
import { Subscription } from 'rxjs';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextFieldModule } from '@angular/cdk/text-field';
import { StorageService } from '../../storage/storage.service';
import type { Appointment } from '../appointment';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { AppointmentsService } from '../appointments.service';
/**
 * The appointmentforms will be validated, created and initialized.
 */
@Component({
  selector: 'rac-appointment-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    TextFieldModule,
    TranslatePipe,
    AdvancedSettingsComponent,
    AlarmSettingsComponent,
    RecurringSettingsComponent
  ],
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.scss']
})
export class AppointmentFormComponent implements OnChanges, OnInit, OnDestroy {
  @Input() appointment!: Appointment;
  @ViewChild(RecurringSettingsComponent) recurring!: RecurringSettingsComponent;
  /** says whether the infos in the recurring form are visible or not */
  // public recurringVisible = false;
  /** says whether the infos in the other infos form are visible or not */
  // public otherInfoVisible = false;
  /** used to get data from html formular */
  appointmentForm!: FormGroup;
  /** the date format used in the date forms */
  public datePattern = /\d{4}-\d{2}-\d{2}/;
  /** the time format used in the time forms */
  public timePattern = /((0|1)\d|2[0-3]):[0-5]\d/;
  private subscription: Subscription = new Subscription();
  private advancedValid = false;
  private alarmValid = false;
  private recurringValid = false;
  startdate!: Date | null;
  enddate!: Date | null;
  /** constructs an appointment form filled with standart values */
  constructor(
    private fb: FormBuilder, 
    public translate: TranslateService, 
    private appointments: AppointmentsService,
    private storage: StorageService
  ) {
    this.createForm();
  }
/**
 * when someone is typing it starts the validation
 */
  ngOnInit() {
    // Set initial dates
    this.startdate = this.appointment.start ? new Date(this.appointment.start) : null;
    this.enddate = this.appointment.end ? new Date(this.appointment.end) : null;
    
    this.subscription.add(this.appointmentForm.valueChanges.subscribe(() => this.endValidation()));
  }
/**
 * destroys subcribtion
 */
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
/**
 * gets typed data, validats it with form properties
 */
  endValidation() {
    this.appointment.valid![0] = this.appointmentForm.valid;
  }
  validateStartTime(): void {
    // if (!start.controls['time'].valid) {
    //  this.appointmentForm.get('start.time').setValue(formatWallDate(this.appointment.start, 'HH:mm'));
    // }
  }
  validateStartDate(): void {
    // if (!start.controls['date'].valid) {
    //  this.appointmentForm.get('start.date').setValue(formatWallDate(this.appointment.start));
    // }
  }
  validateEndTime(): void {
    // if (!end.controls['time'].valid) {
    //  this.appointmentForm.get('end.time').setValue(formatWallDate(this.appointment.end!, 'HH:mm'));
    // }
  }
  validateEndDate(): void {
    // if (!end.controls['date'].valid) {
    //  this.appointmentForm.get('end.date').setValue(formatWallDate(this.appointment.end!));
    // }
  }
  /** sets standart values to html forms */
  createForm(): void {
    this.appointmentForm = this.fb.group({
      summary: [
        null, [
          Validators.required.bind(Validators),
          Validators.maxLength(25)
        ]
      ],
      location: [
        null, [
          Validators.maxLength(30)
        ]
      ],
      description: [
        null, []
      ],
      start: this.fb.group({
        date: [
          null, []
        ],
        time: [
          null, [
            Validators.required.bind(Validators),
            Validators.pattern(this.timePattern)
          ]
        ]
      }),
      end: this.fb.group({
        date: [
          null, []
        ],
        time: [
          null, [
            Validators.required.bind(Validators),
            Validators.pattern(this.timePattern)
          ]
        ]
      }),
      allDay: [ ],
    });
  }
/** gets Month and year, gives out the numbers of days that given month has */
  getDaysInMonth(month: number, year: number): number {
    if (month === 4 || month === 6 || month === 9 || month === 11) {
      return 30;
    } else if (month === 2) {
      if ((year % 4 === 0 && year % 100 !== 0) || (year % 4 === 0 && year % 100 === 0 && year % 400 === 0)) {
        return 29;
      } else {
        return 28;
      }
    } else {
      return 31;
    }
  }
/** changes EndDate if StartDate is changed */
  startDateListener(event: MatDatepickerInputEvent<Date>): void {
    const value = event.value;
    if (value != null && this.appointment.start != null && this.appointment.end != null) {
      // The duration is the distance between the two model instants, so it
      // survives the wall-day replacement unchanged.
      const duration = this.appointment.end.getTime() - this.appointment.start.getTime();
      this.appointment.start = withWallDay(this.appointment.start, value.getFullYear(), value.getMonth(), value.getDate());
      this.appointment.end = new Date(this.appointment.start.getTime() + duration);
      this.appointmentForm.get('end.date')!.setValue(pickerDayFromModel(this.appointment.end));
      this.appointmentForm.get('end.time')!.setValue(formatWallDate(this.appointment.end, 'HH:mm'));
      this.recurring.updateRepeatsBy();
      this.recurring.markForCheck();
    }
  }
  /** gets enddate of of day, month , year and updates it, if it is befoe the start date */
  endDateListener(event: MatDatepickerInputEvent<Date>): void {
    const value = event.value;
    if (value != null && this.appointment.end != null) {
      this.appointment.end = withWallDay(this.appointment.end, value.getFullYear(), value.getMonth(), value.getDate());
      const end = this.appointment.end;
      const start = this.appointment.start;
      if (end.getUTCFullYear() === start.getUTCFullYear()
        && end.getUTCMonth() === start.getUTCMonth()
        && end.getUTCDate() < start.getUTCDate()) {
        // End day moved before the start day inside the same month: pull the
        // start day back to the end day so the pair stays ordered.
        this.appointment.start = withWallDay(start, end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
        this.appointmentForm.get('start.date')!.setValue(pickerDayFromModel(this.appointment.start));
      }
      // The previous guard compared the *stale* start captured before the branch
      // above, so a cross-day correction left an inverted pair and the time fix
      // below overwrote a valid start time. Read the current start instead.
      if (end.getTime() < this.appointment.start.getTime()) { // time's not correct yet
        const startTime = withWallTime(this.appointment.start,
          clampWallHour(end.getUTCHours()), clampWallMinute(end.getUTCMinutes()));
        this.appointment.start = startTime;
        this.appointmentForm.get('start.time')!.setValue(formatWallDate(startTime, 'HH:mm'));
      }
      if (Object.prototype.hasOwnProperty.call(this.appointment, 'recurringSettings')) {
        const endDay = wallDayNumber(this.appointment.end);
        const untilDay = wallDayNumber(this.appointment.recurringSettings!.untilDate);
        if (endDay !== null && untilDay !== null && endDay > untilDay) {
          // make a copy; producer stays a 'YYYY-MM-DD' string
          this.appointment.recurringSettings!.untilDate = formatWallDate(this.appointment.end);
          this.recurring.recurringForm.controls['untilDate'].setValue(pickerDayFromModel(this.appointment.end));
        }
      }
    }
  }
  /** if startdate changes updates recurring date */
  onStartDateChange(): void {
    this.recurring.updateRepeatsBy();
    this.recurring.markForCheck();
  }
  /** if starttime changes updates redcurring time */
  onStartTimeChange(value: string): void {
    if (!value.match(/\d{2}:\d{2}/)) {
      return;
    }
    const start = this.appointment.start;
    const end = this.appointment.end;
    if (end == null) {
      return;
    }
    const diffHour = end.getUTCHours() - start.getUTCHours();
    const diffMinute = end.getUTCMinutes() - start.getUTCMinutes();
    const typed = parseWallTime(value);
    const hours = clampWallHour(typed === null ? start.getUTCHours() : typed.hours);
    const minutes = clampWallMinute(typed === null ? start.getUTCMinutes() : typed.minutes);
    this.appointment.start = withWallTime(start, hours, minutes);
    // Update endTime to keep duration
    const newEnd = withWallTime(end, clampWallHour(hours + diffHour), clampWallMinute(minutes + diffMinute));
    this.appointment.end = newEnd;
    this.appointmentForm.get('end.time')!.setValue(formatWallDate(newEnd, 'HH:mm'));
  }
  /** changes nothing  */
  onEndDateChange(): void {
    // dummy function, lost it's meaning
  }
  /** get end time , changes it if invalid */
  onEndTimeChange(value: string): void {
    if (!value.match(/\d{2}:\d{2}/)) {
      return;
    }
    const end = this.appointment.end;
    if (end == null) {
      return;
    }
    const typed = parseWallTime(value);
    const newEnd = withWallTime(end,
      clampWallHour(typed === null ? end.getUTCHours() : typed.hours),
      clampWallMinute(typed === null ? end.getUTCMinutes() : typed.minutes));
    this.appointment.end = newEnd;
    // Update startTime if end would be before start.
    if (newEnd.getTime() < this.appointment.start.getTime()) {
      const startTime = withWallTime(this.appointment.start,
        clampWallHour(newEnd.getUTCHours()), clampWallMinute(newEnd.getUTCMinutes()));
      this.appointment.start = startTime;
      this.appointmentForm.get('start.time')!.setValue(formatWallDate(startTime, 'HH:mm'));
    }
  }
  /** checks for validity of input of time and date form */
  ngOnChanges(): void {
    // This is to prevent 'ExpressionChangedAfterItHasBeenCheckedError'
    this.appointmentForm.patchValue({
      allDay: this.appointment.allDay,
      start: {
        date: formatWallDate(this.appointment.start),
        time: formatWallDate(this.appointment.start, 'HH:mm')
      },
      end: {
        date: formatWallDate(this.appointment.end!),
        time: formatWallDate(this.appointment.end!, 'HH:mm')
      }
    });
  }
}
