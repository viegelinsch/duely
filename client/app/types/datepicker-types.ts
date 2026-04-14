/**
 * Local type definitions for ngx-bootstrap datepicker compatibility
 * 
 * DateModel and DatePickerTexts were removed in ngx-bootstrap v21
 * but are still used by this application. These type definitions
 * maintain compatibility without requiring the deprecated exports.
 */

import * as moment from 'moment-timezone';

/**
 * DateModel represents a date value for the datepicker component
 */
export class DateModel {
  day!: string;
  month!: string;
  year!: string;
  formatted!: string;
  momentObj!: any;

  constructor(init?: Partial<DateModel>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}

/**
 * DatePickerTexts holds localization strings for the datepicker
 */
export class DatePickerTexts {
  selectYearText?: string;
  clearText?: string;
  todayText?: string;
  monthName?: string[];
  dayNames?: string[];
  
  constructor(init?: Partial<DatePickerTexts>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}
