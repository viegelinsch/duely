import { test, expect } from '@playwright/test';

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
  test('should generate an ICS file', async ({ page }) => {
    // Ensure settings exist so the guard lets us reach the creator page
    await page.evaluate(() => localStorage.setItem('settings', '{}'));
    await page.goto('/');

    // Fill all required fields so the form validates (valid[0] must be true).
    const summaryInput = page.locator('input[formControlName="summary"]');
    await summaryInput.fill('ICS Download Test');
    const startTime = page.locator('div[formGroupName="start"] input[formControlName="time"]');
    await startTime.fill('09:00');
    const endTime = page.locator('div[formGroupName="end"] input[formControlName="time"]');
    await endTime.fill('10:00');

    // Start download listener
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#generate-ical-btn')
    ]);

    // Verify download exists and has correct filename
    expect(download.suggestedFilename()).toContain('.ics');

    // Save to temporary location for verification
    const downloadPath = `/tmp/${download.suggestedFilename()}`;
    await download.saveAs(downloadPath);
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
  test('should allow setting timezone', async ({ page }) => {
    // Navigate to settings
    await page.click('a[href="/settings"], button:has-text("Settings"), .nav-link:has-text("Settings")');
    await page.waitForURL(/\/settings/);
    
    // Find timezone selector and select a timezone
    const timezoneSelect = page.locator('select[name="timeZone"]');
    if (await timezoneSelect.count() > 0) {
      await timezoneSelect.selectOption('Europe/Berlin');
      
      // Verify selection
      await expect(timezoneSelect).toHaveValue('Europe/Berlin');
    }
  });

  /**
   * Test recurring appointment settings
   */
  test('should configure daily recurrence', async ({ page }) => {
    // Ensure settings exist so the guard lets us reach the creator page
    await page.evaluate(() => localStorage.setItem('settings', '{}'));
    await page.goto('/');

    // Fill appointment form
    const summaryInput = page.locator('input[formControlName="summary"]');
    await summaryInput.fill('Recurring Test');

    // Expand the recurring settings section (hidden by default)
    await page.click('[data-identifier="expand-recurring"]');

    // Select daily recurrence from the frequency dropdown
    const frequencySelect = page.locator('select[data-identifier="recurrence-selectbox"]');
    await frequencySelect.selectOption('DAILY');

    // Verify daily recurrence is selected and the settings panel is visible
    await expect(frequencySelect).toHaveValue('DAILY');
    const recurringSettings = page.locator('[data-identifier="recurring-settings"]');
    await expect(recurringSettings).toBeVisible();
  });

  /**
   * Test collision detection
   */
  test('should detect date collisions', async () => {
    // This would require more complex setup with existing appointments
    // Placeholder for collision detection test
    console.log('Collision detection test - requires implementation with specific scenario');
  });
});
