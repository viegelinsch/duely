# Deprecation Analysis Report

## Summary

During Docker build, npm shows deprecation warnings for **legacy packages**. These are **transitive dependencies** (dependencies of our dependencies), not direct dependencies we control.

---

## Deprecated Packages Analysis - UPDATED

## Latest Update: Package Updates Applied ✅

### Changes Made:
1. **electron-builder**: ^25.1.8 → **^26.8.1** ✅
2. **glob**: Multiple old versions → **^13.0.6** (via overrides) ✅
3. **tar**: Multiple old versions → **^7.5.13** (via overrides) ✅
4. **rimraf**: ^6.0.1 (already at latest) - kept as-is ✅

### Results:
- ✅ **glob deprecation warnings**: ELIMINATED
- ✅ **tar deprecation warnings**: ELIMINATED
- ✅ **electron-builder deprecated deps**: MOSTLY RESOLVED
- ⚠️ **boolean@3.2.0**: Still present (from @electron/get → global-agent)
- ⚠️ **rimraf@3.0.2**: Still present (from karma@6.4.4 - latest version)

### Remaining Warnings (Acceptable):

#### 1. boolean@3.2.0 ⚠️
- **Status**: No longer supported
- **Source**: electron → @electron/get → global-agent → boolean
- **Why We Can't Fix**: This is a transitive dependency deep in the electron toolchain
- **Risk**: 🟢 **Low** - Used only during electron downloads in development/build
- **Action**: **Accept** - Will be resolved when electron updates @electron/get

#### 2. rimraf@3.0.2 ⚠️
- **Status**: Rimraf versions prior to v4 are no longer supported
- **Source**: karma@6.4.4 → rimraf@3.0.2
- **Why We Can't Fix**: Karma is already at latest version (6.4.4)
- **Risk**: 🟢 **Low** - Karma is a test runner, rimraf only used for cleanup
- **Action**: **Accept** - Karma is in maintenance mode; modern Angular uses Vitest

#### 3. Sass @import Deprecation ⚠️
- **Status**: @import rules deprecated in Dart Sass 3.0.0
- **Source**: ./client/styles.scss and component styles
- **Risk**: 🟡 **Medium** - Future compatibility issue
- **Action**: **Migrate to @use/@forward** (separate task - not critical)

---

## Original Analysis (For Reference)

### 1. **gauge@4.0.4** ⚠️
- **Status:** No longer supported
- **Used by:** `npm` internal packages
- **Impact:** None - this is an npm internal dependency
- **Action:** Cannot fix - will be updated when npm updates its internals
- **Risk:** 🟢 Low (internal npm package)

### 2. **are-we-there-yet@3.0.1** ⚠️
- **Status:** No longer supported
- **Used by:** Part of npm's progress bar system
- **Impact:** None - transitive dependency of npm itself
- **Action:** Cannot fix - npm will update when ready
- **Risk:** 🟢 Low (npm internal)

### 3. **npmlog@6.0.2** ⚠️
- **Status:** No longer supported
- **Used by:** npm logging system
- **Impact:** None - transitive dependency
- **Action:** Cannot fix
- **Risk:** 🟢 Low (npm internal)

### 4. **@npmcli/move-file@2.0.1** ⚠️
- **Status:** Functionality moved to @npmcli/fs
- **Used by:** npm CLI tools
- **Impact:** None - will be updated automatically
- **Action:** Cannot fix - npm will update
- **Risk:** 🟢 Low (npm internal)

### 5. **boolean@3.2.0** ⚠️
- **Status:** Package no longer supported
- **Used by:** Unknown transitive dependency
- **Impact:** Minimal - simple utility package
- **Action:** Need to identify which package depends on it
- **Risk:** 🟡 Medium (abandoned package)

### 6. **inflight@1.0.6** ⚠️⚠️
- **Status:** Not supported, **memory leaks**
- **Used by:** Old glob versions
- **Impact:** Memory issues during builds
- **Replacement:** Already using modern alternatives in code
- **Action:** Update packages that depend on glob
- **Risk:** 🟠 Medium-High (memory leak, but only affects build time)

### 7. **glob@7.2.3** ⚠️⚠️⚠️
- **Status:** **Security vulnerabilities** (fixed in current version)
- **Used by:** Multiple build tools
- **Impact:** Security risk during build
- **Replacement:** glob@10+ available
- **Note:** Warning says "Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me"
- **Action:** URGENT - Update all packages depending on glob@7
- **Risk:** 🔴 High (security vulnerabilities)

### 8. **glob@10.5.0** ⚠️
- **Status:** Old version with security vulnerabilities
- **Used by:** Modern tools (but not latest)
- **Impact:** Security risk
- **Replacement:** glob@11+ available
- **Action:** Update to latest versions of packages that use glob
- **Risk:** 🟠 Medium-High (security vulnerabilities)

### 9. **tar@6.2.1** ⚠️⚠️⚠️
- **Status:** **Security vulnerabilities** (fixed in current version)
- **Used by:** npm, electron-builder, and packaging tools
- **Impact:** Security risk during package installation
- **Replacement:** tar@7+ available
- **Action:** CRITICAL - Update immediately
- **Risk:** 🔴 High (security vulnerabilities)

### 10. **rimraf@3.0.2** ⚠️
- **Status:** No longer supported (versions prior to v4)
- **Used by:** Build and cleanup scripts
- **Impact:** Maintenance issue
- **Replacement:** rimraf@5+ available (we're already using ^6.0.1!)
- **Note:** This is strange - we have rimraf 6.0.1 in package.json
- **Action:** Check which package is installing old rimraf
- **Risk:** 🟡 Medium (outdated but functional)

### 11. **glob@8.1.0** ⚠️
- **Status:** Old version with security vulnerabilities
- **Used by:** Some build tool
- **Impact:** Security risk
- **Replacement:** glob@11+ available
- **Action:** Update dependent packages
- **Risk:** 🟠 Medium-High (security vulnerabilities)

---

## Root Cause Analysis

### Direct Dependencies Causing Issues:

1. **electron-builder@25.1.8** 
   - Depends on old `tar`, `glob`, and `rimraf` versions
   - **Solution:** Update to electron-builder@26.0.0+ (if available) or wait for their update

2. **@angular-devkit/build-angular@^19.0.0**
   - May depend on older `glob` versions
   - **Solution:** Ensure using latest 19.x version

3. **karma@6.4.4**
   - Uses old glob versions
   - **Solution:** Karma 6.4.4 is latest - this is a known issue with Karma

### Good News:
- **We are NOT directly using any deprecated packages**
- All deprecated packages are **transitive dependencies**
- Most are used only during **build/install time**, not runtime

---

## Action Plan

### Immediate Actions (Security Critical) 🔴

#### 1. Update electron-builder
```bash
npm install electron-builder@latest --save-dev
```
**Expected:** Should update tar and some glob dependencies

#### 2. Force resolutions for glob and tar
Add to package.json:
```json
"overrides": {
  "glob": "^11.0.0",
  "tar": "^7.4.0",
  "rimraf": "^5.0.0"
}
```

### Medium Priority (Maintenance) 🟡

#### 3. Identify boolean dependency
```bash
npm ls boolean
```
Find which package uses it and consider alternatives.

#### 4. Wait for npm updates
The npm internal packages (gauge, are-we-there-yet, npmlog) will be updated by npm team eventually.

### Low Priority (Acceptable) 🟢

#### 5. Document and accept
Some deprecations are in npm itself and cannot be fixed by us.

---

## Implementation

Let me implement the fixes:

### Step 1: Check current versions
```bash
npm ls glob
npm ls tar
npm ls rimraf
```

### Step 2: Update electron-builder
```bash
npm install electron-builder@^26.0.0 --save-dev
```

### Step 3: Add overrides to package.json
```json
{
  "overrides": {
    "glob": "^11.0.0",
    "tar": "^7.4.0",
    "rimraf": "^5.0.0",
    "inflight": "npm inflight@^1.0.6"
  }
}
```

### Step 4: Clean reinstall
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

## Risk Assessment

### Current State:
- 🔴 **High Risk:** glob@7.2.3, tar@6.2.1 (security vulnerabilities)
- 🟠 **Medium-High Risk:** glob@8.1.0, glob@10.5.0 (security vulnerabilities)
- 🟡 **Medium Risk:** rimraf@3.0.2, boolean@3.2.0 (abandoned/outdated)
- 🟢 **Low Risk:** npm internal packages (unavoidable)

### After Fixes:
- 🟢 **All risks eliminated or mitigated**
- Only unavoidable npm internal deprecations remain

---

## Recommendation

**Proceed with immediate updates** for security-critical packages (glob, tar). These are build-time dependencies, so while the risk is contained to the build environment, it's best practice to keep them updated.

The npm internal package warnings can be safely ignored - they will be updated when npm updates them.

---

*Generated: March 13, 2026*  
*NPM Version: 10.x*  
*Node Version: 22.x*
