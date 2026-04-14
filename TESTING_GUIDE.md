# Testing Guide - Duely Application

## Overview

The Duely application uses a modern testing stack with **Jasmine 5** for unit tests and **Playwright** for E2E tests. All tests have been updated for Angular 19 compatibility.

---

## 🧪 Test Structure

### Unit Tests (Jasmine + Karma)
- **Location:** `client/app/**/*.spec.ts`
- **Framework:** Jasmine 5.4.0
- **Test Runner:** Karma 6.4.4
- **Coverage:** HTML & Text Summary

### E2E Tests (Playwright)
- **Location:** `e2e/*.spec.ts`
- **Framework:** Playwright 1.49.0
- **Browsers:** Chromium, Firefox, WebKit
- **Features:** Auto-wait, trace viewer, screenshot comparison

---

## 📦 Test Dependencies

### Unit Testing
```json
{
  "jasmine-core": "~5.4.0",
  "karma": "~6.4.4",
  "karma-jasmine": "~5.1.0",
  "karma-chrome-launcher": "~3.2.0",
  "karma-coverage": "~2.2.1",
  "@angular-devkit/build-angular": "^19.0.0"
}
```

### E2E Testing
```json
{
  "@playwright/test": "^1.49.0"
}
```

---

## 🚀 Running Tests

### Unit Tests

#### Run Once (Headless)
```bash
npm test
```
- Runs all unit tests once
- Uses Chrome Headless
- Generates coverage report
- Exits after completion

#### Watch Mode (Development)
```bash
npm run test:watch
```
- Watches for file changes
- Re-runs affected tests automatically
- Opens Chrome browser
- Ideal for TDD workflow

#### Specific Browser
```bash
# Chrome
ng test --browsers=Chrome

# Firefox
ng test --browsers=Firefox

# Chrome Headless CI
ng test --browsers=ChromeHeadlessCI
```

### E2E Tests

#### Run All E2E Tests
```bash
npm run test:e2e
```
- Runs tests on Chromium, Firefox, and WebKit
- Starts dev server automatically
- Generates HTML report
- Parallel execution enabled

#### Run with UI
```bash
npm run test:e2e:ui
```
- Opens Playwright UI
- Interactive test runner
- View traces and screenshots
- Great for debugging

#### Debug Mode
```bash
npm run test:e2e:debug
```
- Runs in debug mode with breakpoints
- Headed mode (visible browser)
- Step-through execution

#### Specific Browser
```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only
npx playwright test --project=webkit
```

#### Single Test File
```bash
npx playwright test e2e/app.e2e.spec.ts
```

#### With Trace Viewer
```bash
# Record traces
npx playwright test --trace on

# View trace after test run
npx playwright show-trace path/to/trace.zip
```

---

## 📊 Coverage Reports

After running unit tests, coverage reports are generated in:
- **HTML:** `coverage/duely/index.html`
- **Text Summary:** Displayed in terminal

Open HTML report:
```bash
open coverage/duely/index.html
```

---

## 🎯 Test File Organization

### Unit Tests
```
client/app/
├── app.component.spec.ts
├── DatesAndCollisions/
│   └── CollisionDetector.spec.ts
├── creator/
│   ├── appointments.service.spec.ts
│   ├── creator.component.spec.ts
│   └── appointment-form/
│       ├── appointment-form.component.spec.ts
│       ├── advanced-settings/advanced-settings.component.spec.ts
│       ├── alarm-settings/alarm-settings.component.spec.ts
│       └── recurring-settings/recurring-settings.component.spec.ts
├── settings/
│   └── settings.component.spec.ts
├── storage/
│   ├── storage.service.spec.ts
│   ├── electron-storage.service.spec.ts
│   └── web-storage.service.spec.ts
└── validation/
    └── custom-validators.spec.ts
```

### E2E Tests
```
e2e/
├── app.e2e.spec.ts          # New Playwright tests
├── app.e2e-spec.ts          # Legacy Protractor tests (deprecated)
├── app.po.ts                # Page objects (legacy)
└── tsconfig.e2e.json        # E2E TypeScript config
```

---

## 🔧 Configuration Files

### Karma Config (`karma.conf.js`)
```javascript
module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    browsers: ['Chrome', 'ChromeHeadless'],
    reporters: ['progress', 'kjhtml'],
    coverageReporter: {
      dir: './coverage/duely',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    }
  });
};
```

### Playwright Config (`playwright.config.ts`)
```typescript
export default defineConfig({
  testDir: './e2e',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:8000'
  }
});
```

---

## ✅ Test Examples

### Unit Test Example
```typescript
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AppComponent]
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test.describe('Duely Application', () => {
  test('should redirect to the settings page', async ({ page }) => {
    await page.goto('/');
    const componentTag = await page.locator('rac-settings').first();
    await expect(componentTag).toBeVisible();
  });

  test('should generate an ICS file', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button.btn-success')
    ]);
    expect(download.suggestedFilename()).toContain('.ics');
  });
});
```

---

## 🐛 Debugging Tests

### Unit Tests
1. Add `debugger` statement in test or code
2. Run `npm run test:watch`
3. Open Chrome DevTools (F12)
4. Tests will pause at debugger statements

### E2E Tests
```bash
# Debug specific test
npx playwright test --debug e2e/app.e2e.spec.ts

# Use Playwright Inspector
PWDEBUG=1 npx playwright test

# Show browser during execution
npx playwright test --headed
```

---

## 📈 Best Practices

### Unit Tests
✅ **DO:**
- Test one thing per spec
- Use descriptive test names
- Mock external dependencies
- Test edge cases and error conditions
- Keep tests fast and isolated

❌ **DON'T:**
- Test multiple behaviors in one spec
- Rely on DOM structure (use Angular testing utilities)
- Make HTTP requests (use HttpClientTestingModule)
- Share state between tests

### E2E Tests
✅ **DO:**
- Use data-testid attributes for selectors
- Test critical user journeys
- Handle loading states
- Test across different browsers
- Use page objects for maintainability

❌ **DON'T:**
- Test every single interaction
- Rely on CSS classes that might change
- Skip authentication setup
- Ignore network failures

---

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      
      # Unit Tests
      - run: npm test
        env:
          CI: true
      
      # E2E Tests
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      # Upload coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/duely/lcov.info
```

---

## 🎯 Migration Notes

### From Protractor to Playwright

**Protractor (Deprecated):**
```typescript
import { browser, element, by } from 'protractor';

it('should click button', async () => {
  await element(by.css('button')).click();
});
```

**Playwright (Current):**
```typescript
import { test, expect } from '@playwright/test';

test('should click button', async ({ page }) => {
  await page.click('button');
  // or
  await page.getByRole('button').click();
});
```

### Key Differences
| Feature | Protractor | Playwright |
|---------|-----------|------------|
| Wait Strategy | Implicit waits | Auto-waiting |
| Selectors | by.css, by.xpath | CSS, XPath, text, role |
| Browser Support | Chrome, Firefox | Chromium, Firefox, WebKit |
| Speed | Slower | Faster |
| Maintenance | Deprecated | Actively maintained |

---

## 📚 Resources

- [Jasmine Documentation](https://jasmine.github.io/)
- [Karma Runner](https://karma-runner.github.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Testing Best Practices](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#tests)

---

## 🆘 Troubleshooting

### Issue: Tests fail with "Cannot find module"
**Solution:** Ensure dependencies are installed
```bash
npm install
```

### Issue: Chrome won't start in CI
**Solution:** Use headless mode with proper flags
```bash
npm test -- --browsers=ChromeHeadlessCI
```

### Issue: E2E tests timeout
**Solution:** Increase timeout in playwright.config.ts
```typescript
timeout: 60000, // 60 seconds
expect: {
  timeout: 10000
}
```

### Issue: Coverage not generated
**Solution:** Check karma.conf.js has coverage reporter
```javascript
coverageReporter: {
  dir: require('path').join(__dirname, './coverage/duely'),
  reporters: [
    { type: 'html' },
    { type: 'text-summary' }
  ]
}
```

---

## 📞 Support

For testing-related questions:
- Check existing issues on GitHub
- Consult Stack Overflow with tag `duely-testing`
- Review test files for examples
- Read framework documentation

---

*Last Updated: March 13, 2026*  
*Angular Version: 19.2.20*  
*Test Frameworks: Jasmine 5.4.0, Playwright 1.49.0*
