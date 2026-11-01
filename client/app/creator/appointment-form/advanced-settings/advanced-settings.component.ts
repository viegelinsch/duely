/**
 * This file contains the Advanced Settings.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { StorageService } from '../../../storage/storage.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import type { Appointment } from '../../appointment';

/**
 * Component to handle all settings contained in 'other' section.
 */
@Component({
  selector: 'rac-advanced-settings',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule
  ],
  templateUrl: './advanced-settings.component.html',
  styleUrls: ['./advanced-settings.component.scss']
})

export class AdvancedSettingsComponent implements OnInit, OnChanges {
  @Input() appointment!: Appointment;

  public hideSettings = true;
  protected timeZoneNames: string[];
  status!: string | undefined;
  timezone!: string | undefined;
  private subscription: Subscription = new Subscription();


  advancedForm!: FormGroup;
  /** constructs a AdvancedSettingsComponent */
  constructor(public fb: FormBuilder, public storage: StorageService, private translate: TranslateService) {
    this.timeZoneNames = moment.tz.names();
  }
  /** creates settings form */
  ngOnInit() {
    this.createForm();
    this.status = this.appointment.status;
    this.timezone = this.storage.settings.timeZone;
    this.appointment.timezone = this.timezone === 'floating' ? undefined : this.timezone;
    this.appointment.floating = this.timezone === 'floating' ? true : undefined;
    this.subscription.add(this.advancedForm.valueChanges.subscribe(() => this.endValidation()));
  }

  /** checks is timezone is changend if not its set floating, gets status change */
  ngOnChanges() {
    this.timezone = this.appointment.floating ? 'floating' : this.appointment.timezone;
    this.status = this.appointment.status;
  }

  /** gets the data, checks if the form is valid */
  endValidation() {
    this.appointment.valid![3] = this.advancedForm.valid;
  }

  /** sets timezone and status if changed */
  updateAppointment(): void {
    this.appointment.status = this.status;
    this.appointment.floating = this.timezone === 'floating';
    this.appointment.timezone = this.timezone === 'floating' ? undefined : this.timezone;
  }

  /** creates the settings form */
  private createForm(): void {
    this.advancedForm = this.fb.group({
      status: this.status,
      timezone: this.timezone
    });
  }

}
