import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function creator(page: Page, language = 'en'): Promise<void> {
  await page.evaluate(lang => localStorage.setItem('settings', JSON.stringify({language: lang, timeZone: 'floating'})), language);
  await page.goto('/');
  await expect(page.locator('rac-creator')).toBeVisible();
}

async function fillAppointment(page: Page, summary: string): Promise<void> {
  await page.locator('input[formControlName="summary"]').fill(summary);
  const start = page.locator('[formGroupName="start"] input[formControlName="date"]');
  await start.fill('04/05/2032');
  await start.press('Tab');
  const end = page.locator('[formGroupName="end"] input[formControlName="date"]');
  await end.fill('04/05/2032');
  await end.press('Tab');
  const startTime = page.locator('[formGroupName="start"] input[formControlName="time"]');
  await startTime.fill('09:00');
  await startTime.press('Tab');
  const endTime = page.locator('[formGroupName="end"] input[formControlName="time"]');
  await endTime.fill('10:00');
  await endTime.press('Tab');
}

async function downloadICS(page: Page, info: TestInfo): Promise<string[]> {
  const pending = page.waitForEvent('download', {timeout: 10000});
  await page.locator('#generate-ical-btn').click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const file = info.outputPath('calendar.ics');
  await download.saveAs(file);
  await info.attach('calendar.ics', {path: file, contentType: 'text/calendar'});
  const lines = (await readFile(file, 'utf8')).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  expect(lines).toContain('BEGIN:VCALENDAR');
  expect(lines.filter(line => line === 'BEGIN:VEVENT')).toHaveLength(1);
  expect(lines).toContain('END:VCALENDAR');
  return lines;
}

async function daily(page: Page): Promise<void> {
  await page.locator('[data-identifier="expand-recurring"]').click();
  const frequency = page.locator('select[formControlName="frequency"]');
  await expect(frequency).toBeVisible();
  await frequency.selectOption('DAILY');
  await expect(frequency).toHaveValue('DAILY');
  await page.locator('mat-radio-button[value="COUNT"] input').check();
  await page.locator('input[formControlName="count"]').fill('3');
}

function recurrence(lines: string[]): Record<string, string> {
  const rules = lines.filter(line => line.startsWith('RRULE:'));
  expect(rules).toHaveLength(1);
  return Object.fromEntries(rules[0].slice(6).split(';').map(part => part.split('=')));
}

test.describe('Duely Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
  });

  /**
   * Tests whether the user is redirected to the settings
   * if no settings data is present
   */
  test('should redirect to the settings page', async ({ page }) => {
    const componentTag = await page.locator('rac-settings').first();
    await expect(componentTag).toBeVisible();
  });

  /**
   * Tests whether the user stays on the home page
   * if settings data could be retrieved
   */
  test('should stay on the creator when settings are set', async ({ page }) => {
    // Set settings in localStorage
    await page.evaluate(() => {
      localStorage.setItem('settings', '{}');
    });
    
    await page.goto('/');
    
    const componentTag = await page.locator('rac-creator').first();
    await expect(componentTag).toBeVisible();
  });

  /**
   * Tests whether an ICS file is generated and downloaded for a
   * non-recurring appointment (the default path).
   */
  test('should generate an ICS file with fixed floating event semantics', async ({ page }, info) => {
    await creator(page);
    await fillAppointment(page, 'ICS Download Test');
    const lines = await downloadICS(page, info);
    expect(lines).toContain('SUMMARY:ICS Download Test');
    expect(lines).toContain('DTSTART:20320405T090000');
    expect(lines).toContain('DTEND:20320405T100000');
    expect(lines.filter(line => line.startsWith('RRULE:'))).toEqual([]);
    expect(lines.filter(line => line.startsWith('EXDATE'))).toEqual([]);
  });

  /**
   * Test creating an appointment with basic information
   */
  test('should create an appointment with summary', async ({ page }) => {
    // Ensure settings exist so the guard lets us reach the creator page
    await page.evaluate(() => localStorage.setItem('settings', '{}'));
    await page.goto('/');

    // Fill in appointment summary
    const summaryInput = page.locator('input[formControlName="summary"]');
    await summaryInput.fill('Test Appointment');

    // Verify input was filled
    await expect(summaryInput).toHaveValue('Test Appointment');
  });

  /**
   * Test navigation between pages
   */
  test('should navigate to about page', async ({ page }) => {
    // Click on About link/button (adjust selector based on actual markup)
    await page.click('a[href="/about"], button:has-text("About"), .nav-link:has-text("About")');
    
    // Wait for navigation
    await page.waitForURL(/\/about/);
    
    // Verify we're on the about page
    const aboutComponent = page.locator('rac-about');
    await expect(aboutComponent).toBeVisible();
  });

  /**
   * Test timezone settings functionality
   */
  test('should persist the real timezone control and export named wall-time values', async ({ page }, info) => {
    const timezone = page.locator('select[formControlName="timezone"]');
    await expect(timezone).toBeVisible();
    await timezone.selectOption('Europe/Berlin');
    await expect(timezone).toHaveValue('Europe/Berlin');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('rac-creator')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('settings')!).timeZone)).toBe('Europe/Berlin');
    await page.goto('/settings');
    await page.reload();
    await expect(timezone).toHaveValue('Europe/Berlin');
    await page.locator('button[type="submit"]').click();
    await fillAppointment(page, 'Timezone guard');
    const lines = await downloadICS(page, info);
    expect(lines).toContain('X-WR-TIMEZONE:Europe/Berlin');
    // The real AdvancedSettings form applies the persisted zone to new appointments.
    expect(lines).toContain('DTSTART;TZID=Europe/Berlin:20320405T090000');
    expect(lines).toContain('DTEND;TZID=Europe/Berlin:20320405T100000');
    expect(lines).toContain('SUMMARY:Timezone guard');
  });

  /**
   * Test recurring appointment settings
   */
  test('intended guard: exports bounded daily recurrence without malformed empty EXDATE', async ({ page }, info) => {
    await creator(page);
    await fillAppointment(page, 'Recurring Test');
    await daily(page);
    const lines = await downloadICS(page, info);
    expect(lines).toContain('SUMMARY:Recurring Test');
    expect(lines).toContain('DTSTART:20320405T090000');
    expect(lines).toContain('DTEND:20320405T100000');
    const rule = recurrence(lines);
    expect(rule.FREQ).toBe('DAILY');
    expect(rule.COUNT).toBe('3');
    expect(rule.UNTIL).toBeUndefined();
    expect(lines.filter(line => line.startsWith('EXDATE'))).toEqual([]);
  });

  /**
   * Test collision detection
   */
  for (const language of ['en', 'de'] as const) {
    test(`intended guard: real explicit exclusion, collision reason and EXDATE in ${language}`, async ({ page }, info) => {
      await creator(page, language);
      await fillAppointment(page, 'Exclusion guard');
      await daily(page);
      await page.locator('[data-identifier="add-exclusion-button"]').click();
      await page.locator('select[formControlName="type"]').selectOption('date');
      const exclusion = page.locator('[formArrayName="exclusions"] input[formControlName="date"]');
      await expect(exclusion).toBeVisible();
      await exclusion.fill('04/06/2032');
      await exclusion.press('Tab');
      await page.screenshot({path: info.outputPath(`exclusion-${language}.png`), fullPage: true});
      const lines = await downloadICS(page, info);
      expect(recurrence(lines).COUNT).toBe('3');
      expect(lines.filter(line => line.startsWith('EXDATE')).join(',')).toContain('20320406T090000');
      const rows = page.locator('.duely-table tbody tr');
      await expect(rows).toHaveCount(1);
      await expect(rows.locator('td').nth(0)).toHaveText('Apr 06 2032');
      await expect(rows.locator('td').nth(1)).toHaveText(language === 'en' ? 'excluded by user' : 'vom Benutzer ausgeschlossen');
    });

    test(`renders Settings metadata and Material calendar date labels in ${language}`, async ({ page }, info) => {
      await creator(page, language);
      await page.goto('/settings');
      const labels = language === 'en' ? ['Calendar name', 'Product ID', 'Calendar URL'] : ['Kalendername', 'Produkt-ID', 'Kalender-URL'];
      for (const [i, control] of ['calendarName', 'calendarProdId', 'calendarUrl'].entries()) {
        await expect(page.locator(`input[formControlName="${control}"]`).locator('..').locator('..').locator('mat-label')).toHaveText(labels[i]);
      }
      await page.screenshot({path: info.outputPath(`settings-${language}.png`), fullPage: true});
      await page.goto('/');
      await fillAppointment(page, 'Locale guard');
      const startField = page.locator('[formGroupName="start"] mat-form-field').first();
      await expect(startField.locator('mat-label')).toHaveText(language === 'en' ? 'Select date' : 'Datum auswählen');
      await startField.locator('mat-datepicker-toggle button').click();
      await expect(page.locator('mat-calendar')).toBeVisible();
      await page.screenshot({path: info.outputPath(`datepicker-${language}.png`), fullPage: true});
      // NativeDateAdapter is currently en-US even in German; this intended locale guard remains red.
      await expect(page.locator(`mat-calendar button[aria-label="${language === 'en' ? 'April 5, 2032' : '5. April 2032'}"]`)).toBeVisible();
    });
  }
});
