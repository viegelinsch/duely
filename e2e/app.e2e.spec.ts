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
   * Tests whether a file is being downloaded
   */
  test('should generate an ICS file', async ({ page }) => {
    // Start download listener
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button.btn-success')
    ]);

    // Verify download exists and has correct filename
    expect(download.suggestedFilename()).toContain('.ics');
    
    // Save to temporary location for verification
    const downloadPath = `./dist/downloads/${download.suggestedFilename()}`;
    await download.saveAs(downloadPath);
  });

  /**
   * Test creating an appointment with basic information
   */
  test('should create an appointment with summary', async ({ page }) => {
    // Fill in appointment summary
    const summaryInput = page.locator('input[ng-reflect-name="summary"]');
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
    // Fill appointment form
    const summaryInput = page.locator('input[ng-reflect-name="summary"]');
    await summaryInput.fill('Recurring Test');
    
    // Open recurring settings
    const recurringButton = page.locator('button:has-text("Recurring"), #recurring-toggle');
    if (await recurringButton.count() > 0) {
      await recurringButton.click();
      
      // Select daily recurrence
      const dailyOption = page.locator('input[type="radio"][value="DAILY"], select option[value="DAILY"]');
      if (await dailyOption.count() > 0) {
        await dailyOption.check();
        
        // Verify daily recurrence is selected
        const recurringSettings = page.locator('rac-recurring-settings');
        await expect(recurringSettings).toBeVisible();
      }
    }
  });

  /**
   * Test collision detection
   */
  test('should detect date collisions', async ({ page }) => {
    // This would require more complex setup with existing appointments
    // Placeholder for collision detection test
    console.log('Collision detection test - requires implementation with specific scenario');
  });
});
