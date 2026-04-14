# Angular 19 → 20 LTS & Node.js 22 → 24 LTS Upgrade Plan

## Overview

This document outlines the plan to upgrade from:
- **Angular 19.2.20** → **Angular 20 LTS** (supported until Nov 2026)
- **Node.js 22** → **Node.js 24 LTS** (supported until Apr 2028)

### Why This Upgrade?

1. **Official Vitest Support**: Angular 20 includes `@angular/build:unit-test` builder for Vitest
2. **LTS Stability**: Both versions are Long-Term Support releases
3. **Modern Tooling**: Access to latest Angular features and performance improvements
4. **Karma Replacement**: Complete migration from deprecated Karma to Vitest
5. **Extended Support Window**: Support until late 2026/early 2028

## Current State

- Angular: 19.2.20 (LTS until May 2026)
- Node.js: 22.x (LTS until Apr 2027)
- Testing: Karma (deprecated) + Playwright (E2E)
- Build: Webpack 5 (custom config) + @angular-devkit/build-angular

## Target State

- Angular: 20.0.x or 20.1.x (LTS until Nov 2026)
- Node.js: 24.x (LTS until Apr 2028)
- Testing: Vitest (unit) + Playwright (E2E)
- Build: Webpack 5 (custom) + @angular/build (Vitest support)

## Upgrade Steps

### Phase 1: Node.js 24 Migration

#### 1.1 Update Dockerfile
```dockerfile
# Change from:
FROM node:22-bookworm AS builder
FROM node:22-bookworm-slim AS production-server
FROM node:22-bookworm AS development

# To:
FROM node:24-bookworm AS builder
FROM node:24-bookworm-slim AS production-server
FROM node:24-bookworm AS development
```

#### 1.2 Update package.json engines
```json
{
  "engines": {
    "node": ">= 24.0.0",
    "npm": ">= 10.2.0"
  }
}
```

#### 1.3 Verify Compatibility
- Test all npm scripts work with Node.js 24
- Verify webpack builds succeed
- Check Electron 34 compatibility with Node.js 24

### Phase 2: Angular 20 Upgrade

#### 2.1 Update Core Angular Packages
```bash
# In Docker development container
ng update @angular/core@20 @angular/cli@20
```

This will automatically update:
- @angular/animations
- @angular/common
- @angular/compiler
- @angular/compiler-cli
- @angular/core
- @angular/forms
- @angular/platform-browser
- @angular/platform-browser-dynamic
- @angular/router
- @angular/cli
- @angular-devkit/build-angular

#### 2.2 Update @angular/build
```bash
npm install @angular/build@^20.0.0 --save-dev
```

#### 2.3 Update Third-Party Angular Libraries
- @ngx-translate/core → Check compatibility with Angular 20
- ngx-bootstrap → May need upgrade to v19+ for Angular 20 compatibility

#### 2.4 Update TypeScript
Angular 20 may require TypeScript 5.8+:
```bash
npm install typescript@~5.8.0 --save-dev
```

### Phase 3: Vitest Migration (Complete)

#### 3.1 Angular.json Configuration
Already done in previous session:
```json
{
  "architect": {
    "test": {
      "builder": "@angular/build:unit-test"
    }
  }
}
```

#### 3.2 Verify Test Migration
The Angular CLI schematic already migrated 9 test files:
- ✅ client/app/app.component.spec.ts
- ✅ client/app/storage/electron-storage.service.spec.ts
- ✅ client/app/storage/storage.service.spec.ts
- ✅ client/app/storage/web-storage.service.spec.ts
- ✅ client/app/creator/appointments.service.spec.ts
- ✅ client/app/creator/creator.component.spec.ts
- ✅ client/app/creator/appointment-form/appointment-form.component.spec.ts
- ✅ client/app/creator/appointment-form/recurring-settings/recurring-settings.component.spec.ts
- ✅ client/app/creator/appointment-form/alarm-settings/alarm-settings.component.spec.ts

#### 3.3 Run Tests
```bash
# In Docker development container
ng test --watch=false
ng test --coverage --watch=false
```

### Phase 4: Build & Verification

#### 4.1 Rebuild All Docker Images
```bash
docker-compose build --no-cache
```

#### 4.2 Verify Production Build
```bash
npm run build:prod
```

#### 4.3 Verify Development Server
```bash
npm run serve
```

#### 4.4 Run All Tests
```bash
npm test          # Unit tests with Vitest
npm run test:e2e  # E2E tests with Playwright
```

## Risk Assessment

### Low Risk
- Node.js 22 → 24 (major version bump, but LTS to LTS)
- Angular 19 → 20 (adjacent versions, automated migration available)
- Vitest migration (already prepared, just needs Angular 20 builder)

### Medium Risk
- Third-party library compatibility (ngx-bootstrap, @ngx-translate)
- Custom webpack configuration compatibility
- Electron builder compatibility

### Mitigation
- All changes in Docker containers (isolated environment)
- Comprehensive test suite to catch regressions
- Can rollback by reverting package.json changes
- Branch: dev-v2 (safe to experiment)

## Expected Timeline

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Node.js 24 Migration | 15-30 min | Low |
| Angular 20 Upgrade | 30-60 min | Medium |
| Vitest Verification | 15-30 min | Low |
| Build & Test | 30-60 min | Low |
| **Total** | **1.5-3 hours** | |

## Rollback Plan

If issues arise:
1. Revert package.json changes
2. Revert Dockerfile changes
3. Rebuild containers
4. Currently at Angular 19 + Node.js 22 (stable state)

## Success Criteria

- ✅ All Docker images build successfully
- ✅ Production build completes without errors
- ✅ Development server starts correctly
- ✅ All Vitest unit tests pass
- ✅ All Playwright E2E tests pass
- ✅ No deprecation warnings for Karma
- ✅ Application functionality unchanged

## Next Steps

1. **Get approval** to proceed with upgrade
2. **Execute Phase 1**: Node.js 24 migration
3. **Execute Phase 2**: Angular 20 upgrade
4. **Execute Phase 3**: Verify Vitest works
5. **Execute Phase 4**: Full build & test verification
6. **Document results** in UPGRADE_CHANGELOG.md

## References

- [Angular 20 Release Notes](https://angular.dev/reference/releases)
- [Node.js 24 LTS Announcement](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule)
- [Angular Update Guide](https://angular.dev/update-guide)
- [Migrating from Karma to Vitest](https://angular.dev/guide/testing/migrating-to-vitest)
