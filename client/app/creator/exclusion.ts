
export interface Exclusion {
  type: string;
  holiday_countries?: string;
  holiday_states?: string;
  holiday_regions?: string;
  // Producer assigns a date-only 'YYYY-MM-DD' string (format(event.value,
  // 'yyyy-MM-dd')); the only consumer wraps it in `new Date(exclusion.date!)`
  // (DateConstructor accepts Date | string). Declared as Date | string so the
  // type matches the value that actually flows.
  date?: Date | string;
}
