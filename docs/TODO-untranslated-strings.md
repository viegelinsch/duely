# Untranslated / Untranslatable Strings - RESOLVED

- **Status:** RESOLVED (translations applied to the codebase)
- **Date:** 2026-09-11
- **Branch:** `dev-v2`
- **Commit context:** applied on top of `17e88ea` (the TS2322 + TS2531 remediation). These i18n changes are left **uncommitted in the working tree** (nothing staged, nothing committed, no upstream created).
- **Original scope:** every user-visible string in `client/app/**/*.html` and `client/app/**/*.ts`, plus `client/index.html`, cross-referenced against `client/assets/i18n/en.json` / `de.json`.
- **This file was moved** from the repo root to `docs/` (plain `mv`, it is untracked). It is kept as the record of what was applied and what was deliberately left alone.
- **Historical snapshot (added 2026-09-14):** the build and compile statements in this document (the NG8xxx counts, the 154-error tsc histogram, "the application bundle still fails to build") describe the **pre-migration** state as of 2026-09-11. They were superseded by the completed Bootstrap→Material migration (Phases 0-8): both type-check gates (`client/tsconfig.app.json` and `client/tsconfig.spec.json`) now exit 0 with empty error histograms, and `ng build` succeeds in development and production. The i18n records below remain accurate and are unchanged.

### i18n mechanism (confirmed)

- Library: `@ngx-translate/core` + `@ngx-translate/http-loader`; loader `new TranslateHttpLoader(http, './assets/i18n/', '.json')` ([app.module.ts](file:///Users/Shared/vcs/git/duely/client/app/app.module.ts#L53-L55)).
- Default locale `en` (`translate.setDefaultLang('en')`), available langs `['de','en']` ([app.component.ts](file:///Users/Shared/vcs/git/duely/client/app/app.component.ts#L29-L34)).
- Locale files are **flat**. Before this change: **127 identical keys** in each file. After: **135 identical keys** in each file (8 added, still symmetric).
- **Key naming convention:** `UPPER CASE WITH SPACES`.

### Caveat about NG8004 (out of scope, unchanged architecture)

The Angular compiler reports `NG8004 "No pipe found with name 'translate'"` for every `| translate` usage in a template whose spec/TestBed (or standalone component) does not import `TranslateModule`. This is a **known unfixed cluster**, not a translation gap. Adding the new pipes for this task therefore **increased NG8004 from 98 to 103 (+5)** - expected and fully attributed below. The application bundle still fails to build for pre-existing reasons, so **no runtime/browser verification was possible**.

---

## Summary (post-change)

| Section | Description | Items | Status |
|---|---|---:|---|
| A | Key referenced in code but missing from locales | 1 | DONE (renamed + added) |
| B | Asymmetric keys (one locale only) | 0 | N/A - locales were and remain symmetric |
| C | Hardcoded user-visible strings bypassing i18n | 6 | DONE (C1-C6) |
| C? | Uncertain items | 6 | U6 DONE (made configurable); U1-U5 deliberately unchanged |
| D | Unused locale keys | 12 | Deliberately untouched (informational) |

---

## Section A - `SELECT_DATE` (missing key) - DONE

The user supplied **EN `Select date`**, **DE `Datum auswählen`** and asked to also fix the key-name convention violation. The key was **renamed** from `SELECT_DATE` to the conventional **`SELECT DATE`** (upper case with spaces), added to both locales, and all four template references were updated.

| Final key | EN | DE | Applied at |
|---|---|---|---|
| `SELECT DATE` | Select date | Datum auswählen | [appointment-form.component.html:55](file:///Users/Shared/vcs/git/duely/client/app/creator/appointment-form/appointment-form.component.html#L55) & [:76](file:///Users/Shared/vcs/git/duely/client/app/creator/appointment-form/appointment-form.component.html#L76); [recurring-settings.component.html:220](file:///Users/Shared/vcs/git/duely/client/app/creator/appointment-form/recurring-settings/recurring-settings.component.html#L220) & [:275](file:///Users/Shared/vcs/git/duely/client/app/creator/appointment-form/recurring-settings/recurring-settings.component.html#L275) |

**Proof the old identifier is gone:** a repo-wide search for `SELECT_DATE` now returns matches **only inside this document** - zero in any `.html`, `.ts`, `.spec.ts`, or locale JSON. The old `SELECT_DATE` key was never present in the locale files, so nothing needed removing there.

---

## Section B - Asymmetric keys - NONE

`en.json` and `de.json` contained exactly the same 127 keys before, and the same 135 keys after. No EN-only or DE-only keys exist. No action was required.

---

## Section C - Hardcoded strings - DONE

The duplicated C1 row from the audit draft has been collapsed to a single item.

| # | Original hardcoded string | Resolution / final key | EN | DE | Files & lines changed |
|---|---|---|---|---|---|
| C1 | `max. 25 letters required` | **Reused existing `REQUIRED25`** (no new key) | Max. 25 letters allowed! | Maximal 25 Zeichen! | [appointment-form.component.html:34](file:///Users/Shared/vcs/git/duely/client/app/creator/appointment-form/appointment-form.component.html#L34) now `{{'REQUIRED25' | translate}}` |
| C2 | `DEBUG-OUTPUT` | **New key `DEBUG OUTPUT`** | Debug output | Debug Ausgabe | [creator.component.html:58](file:///Users/Shared/vcs/git/duely/client/app/creator/creator.component.html#L58) now `{{'DEBUG OUTPUT' | translate}}` |
| C3 | `Legal notice` (`<h1>`) | **Reused existing `LEGAL NOTICE`** (no new key) | Legal notice | Impressum | [legal.component.ts](file:///Users/Shared/vcs/git/duely/client/app/legal/legal.component.ts#L26-L35) - built via `translate.instant('LEGAL NOTICE')` |
| C4 | `This is the default legal notice message.` | **New key `LEGAL DEFAULT MESSAGE`** | This is the default legal notice message. | Dies ist der Standardtext für die rechtlichen Hinweise. | [legal.component.ts](file:///Users/Shared/vcs/git/duely/client/app/legal/legal.component.ts#L26-L35) - `translate.instant('LEGAL DEFAULT MESSAGE')` |
| C5 | `To add your own, please edit the 'content' variable in static/main.bundle.js!` | **New key `LEGAL EDIT HINT`** | To add your own, please edit the 'content' variable in static/main.bundle.js! | Um ihren eigenen Text hinzuzufügen, ändern Sie bitte die Variable 'content' in static/main.bundle.js! | [legal.component.ts](file:///Users/Shared/vcs/git/duely/client/app/legal/legal.component.ts#L26-L35) - `translate.instant('LEGAL EDIT HINT')` |
| C6 | `excluded by user` / `vom Benutzer ausgeschlossen` (hand-rolled ternary) | **New key `EXCLUDED BY USER`** | excluded by user | vom Benutzer ausgeschlossen | See C6 design decision below |

### C3-C5 implementation note (`legal.component.ts`)

`LegalComponent` now injects `TranslateService` and assembles the `content` HTML string in its constructor using **`.instant()`**. `.instant()` was chosen over `.get()` because the string is built **synchronously** in the constructor and interpolated into a plain template literal; `.get()` returns an `Observable` and cannot be interpolated directly. `.instant()` reads the already-loaded translations (the default lang is set at app startup in `AppComponent`).

> **TestBed note (corrected 2026-09-14):** this document previously claimed that [legal.component.spec.ts](file:///Users/Shared/vcs/git/duely/client/app/legal/legal.component.spec.ts) "already fails to compile for pre-existing reasons (`TS2305 async`, `TS2307 @angular/http`, `TS7006`)". **That claim is stale and no longer true.** Those errors were resolved during the Bootstrap→Material migration: the spec imports only `ComponentFixture` and `TestBed` from `@angular/core/testing` (no `async`) and has no `@angular/http` import at all, and both tsc gates exit 0. The `TranslateService` dependency introduced by C3-C5 is also already satisfied - `TranslateModule.forRoot()` is present in the spec's `TestBed.configureTestingModule` imports, so the additional provider warned about below is no longer needed.

### C6 design decision (`EXCLUDED BY USER`)

**Investigation:** `RecurrencePattern` and its four subclasses are **not DI-managed** - they are created with `new` inside `CollisionDetector.getCollisions()`, and `CollisionDetector` itself is created with `new` inside `AppointmentsService.addEventToCalendar()` ([appointments.service.ts:574](file:///Users/Shared/vcs/git/duely/client/app/creator/appointments.service.ts#L574)). Only `AppointmentsService` is DI-managed (`@Injectable`). The subclasses declare **no own constructor** (they inherit the base one), and the existing `language` parameter is **still required** for public-holiday localisation (`hd.setLanguages([this.language])`, [RecurrencePattern.ts:46](file:///Users/Shared/vcs/git/duely/client/app/DatesAndCollisions/Recurrence/RecurrencePattern.ts#L46)) - so it could not simply be repurposed.

**Decision - "pass the already-translated reason in from the DI-managed caller":**
1. `AppointmentsService` now injects `TranslateService` and resolves `this.translate.instant('EXCLUDED BY USER')` (`.instant()` again because collision detection runs synchronously).
2. That resolved string is passed as a **new optional 4th constructor argument** into `CollisionDetector`, which forwards it to each `*RecurrencePattern`.
3. `RecurrencePattern` stores it in `excludedByUserReason` and uses it directly, replacing the old `this.language === 'de' ? ... : ...` ternary. The locale JSON files are now the single source of truth.

**Why optional with an English default (`= 'excluded by user'`):** [CollisionDetector.spec.ts](file:///Users/Shared/vcs/git/duely/client/app/DatesAndCollisions/CollisionDetector.spec.ts#L32) constructs `new CollisionDetector(undefined, userExcludedDates, 'de')` with only 3 arguments and asserts `reason === 'excluded by user'`. Keeping the parameter optional means the spec still compiles (no new `TS2554`) and its assertion now holds regardless of the `'de'` argument (under the old ternary it would actually have produced the German text). The default is a **fallback for direct, non-DI instantiation only** - the real app always passes the locale-driven value.

**Runtime implications:**
- `AppointmentsService` gained a `TranslateService` dependency, satisfied app-wide by `TranslateModule.forRoot()` in `AppModule`.
- [appointments.service.spec.ts](file:///Users/Shared/vcs/git/duely/client/app/creator/appointments.service.spec.ts#L10-L13) provides only `[AppointmentsService, StorageService]`; once the suite can build it will need `TranslateModule.forRoot()` (or a mock) added. Reported, not fixed - consistent with the existing NG8004/TranslateModule cluster.
- No recurrence-pattern spec files exist; `CollisionDetector.spec.ts` is unaffected and still compiles.

---

## Section C? - Uncertain items

| # | Item | Status | Reason |
|---|---|---|---|
| U1 | `Open Source` ([about.component.html:11](file:///Users/Shared/vcs/git/duely/client/app/about/about.component.html#L11)) | **NOT changed** | Loan term, identical in DE; out of scope for this pass. |
| U2 | `Mozilla Public License v2.0` ([about.component.html:12](file:///Users/Shared/vcs/git/duely/client/app/about/about.component.html#L12)) | **NOT changed** | Proper licence name; conventionally not translated. |
| U3 | Developer names ([about.component.html:19-23](file:///Users/Shared/vcs/git/duely/client/app/about/about.component.html#L19-L23)) | **NOT changed** | Proper nouns; never translated. |
| U4 | `Deutsch` / `English` ([settings.component.ts:80,82](file:///Users/Shared/vcs/git/duely/client/app/settings/settings.component.ts#L78-L83)) | **NOT changed** | Language endonyms; each language is shown in its own spelling by convention. |
| U5 | `Duely - iCal generator` document title ([index.html:5](file:///Users/Shared/vcs/git/duely/client/index.html#L5)) | **NOT changed** | Static title outside the Angular app; not covered by `@ngx-translate`. |
| U6 | iCal product metadata literals | **DONE - made user-configurable** | See Part below. |

---

## U6 - iCal product metadata is now user-configurable (DONE)

The three literals previously hardcoded in [appointments.service.ts:66-68](file:///Users/Shared/vcs/git/duely/client/app/creator/appointments.service.ts#L64-L72) are now editable in Settings and persisted through the existing storage layer.

### New settings fields (model shape)

Added to the `settings` object in [storage.service.ts](file:///Users/Shared/vcs/git/duely/client/app/storage/storage.service.ts#L19-L34):

| Field | Default value (= the exact former literal) | iCal property |
|---|---|---|
| `calendarName` | `Duely` | `name` |
| `calendarProdId` | `//TU Braunschweig//Duely//EN` | `prodId` |
| `calendarUrl` | `https://duely.tu-braunschweig.de` | `url` |

### Where / how they are persisted

- **Storage keys:** the fields live inside the existing single `localStorage` entry `'settings'` (JSON blob) - no new storage key was introduced.
- **Both web and Electron paths:** `WebStorageService` and `ElectronStorageService` both **inherit** the base `StorageService.loadSettings()` / `saveSettings()` (they only override `saveText`). Adding the fields to the base class therefore covers **both** paths from one place.
- **Loading:** [storage.service.ts `loadSettings()`](file:///Users/Shared/vcs/git/duely/client/app/storage/storage.service.ts#L47-L82) reads each new field behind a `hasOwnProperty` guard, mirroring the existing pattern.
- **Saving:** [settings.component.ts `save()`](file:///Users/Shared/vcs/git/duely/client/app/settings/settings.component.ts#L178-L195) now includes the three fields in the object written to storage; [`createForm()`](file:///Users/Shared/vcs/git/duely/client/app/settings/settings.component.ts#L61-L76) seeds them from the stored settings.
- **Consumption:** [appointments.service.ts `initializeCalendar()`](file:///Users/Shared/vcs/git/duely/client/app/creator/appointments.service.ts#L64-L72) reads `this.StorageService.settings.calendarName` / `.calendarProdId` / `.calendarUrl`.

### Backwards compatibility (mandatory requirement - satisfied)

Existing users' persisted `'settings'` JSON does **not** contain the new fields. On load, the `hasOwnProperty` guards leave them at the **default object values**, which are **byte-for-byte the former literals**. Therefore old stored data produces **identical iCal output** (`NAME:Duely`, `PRODID:-//TU Braunschweig//Duely//EN`, `URL:https://duely.tu-braunschweig.de`). The defaults are the single source of the fallback (no duplicated literals in the consuming code).

### New i18n keys for the settings UI labels

Added to both locales following the `UPPER CASE WITH SPACES` convention.

| Key | EN | DE | Confirmation |
|---|---|---|---|
| `CALENDAR NAME` | Calendar name | Kalendername | **EN + DE proposed by the agent - please confirm** |
| `CALENDAR PRODUCT ID` | Product ID | Produkt-ID | **EN + DE proposed by the agent - please confirm** |
| `CALENDAR URL` | Calendar URL | Kalender-URL | **EN + DE proposed by the agent - please confirm** |

The user did not supply any wording for these three labels, so **all six values (3 EN + 3 DE) are agent-proposed and need user confirmation.** They are used in the three new fields added to [settings.component.html](file:///Users/Shared/vcs/git/duely/client/app/settings/settings.component.html#L67-L84).

> **TS2564 note:** `settings.component.ts` already has 6 pre-existing TS2564 errors (uninitialised properties). The U6 changes add only form controls inside `createForm()` and fields inside object literals - **no new class properties** - so no new TS2564 was introduced (count stayed at 7 total).

---

## Ready-to-paste JSON that was applied

The following keys were **added** to each locale (values shown are now live in the files).

### `client/assets/i18n/en.json` (added)

```json
{
  "SELECT DATE": "Select date",
  "DEBUG OUTPUT": "Debug output",
  "LEGAL DEFAULT MESSAGE": "This is the default legal notice message.",
  "LEGAL EDIT HINT": "To add your own, please edit the 'content' variable in static/main.bundle.js!",
  "EXCLUDED BY USER": "excluded by user",
  "CALENDAR NAME": "Calendar name",
  "CALENDAR PRODUCT ID": "Product ID",
  "CALENDAR URL": "Calendar URL"
}
```

### `client/assets/i18n/de.json` (added)

```json
{
  "SELECT DATE": "Datum auswählen",
  "DEBUG OUTPUT": "Debug Ausgabe",
  "LEGAL DEFAULT MESSAGE": "Dies ist der Standardtext für die rechtlichen Hinweise.",
  "LEGAL EDIT HINT": "Um ihren eigenen Text hinzuzufügen, ändern Sie bitte die Variable 'content' in static/main.bundle.js!",
  "EXCLUDED BY USER": "vom Benutzer ausgeschlossen",
  "CALENDAR NAME": "Kalendername",
  "CALENDAR PRODUCT ID": "Produkt-ID",
  "CALENDAR URL": "Kalender-URL"
}
```

Reused (unchanged, already present): `REQUIRED25` (C1), `LEGAL NOTICE` (C3).

---

## Section D - Unused locale keys (DELIBERATELY UNTOUCHED)

**Status note only - content unchanged.** The 12 orphaned keys below were **NOT removed** from `en.json` / `de.json`, and this section is otherwise identical to the original audit. Removing them is optional future cleanup, out of scope for this task.

| # | Unused key | EN value | DE value | Likely origin |
|---|---|---|---|---|
| D1 | `TIME` | `time` | `Zeit` | superseded by `TIMEZONE` / `TIMES` / `TIME COUNT` |
| D2 | `UNTIL YEAR` | `Until year` | `Bis zum Jahr` | old recurrence "ends" UI (now uses `UNTIL`) |
| D3 | `TODAY` | `Today` | `Heute` | old date-picker button |
| D4 | `CLEAR` | `Clear` | `Entfernen` | old date-picker button |
| D5 | `SELECT YEAR` | `Select Year` | `Jahr auswählen` | old date-picker year view |
| D6 | `MO` | `Mo` | `Mo` | old date-picker weekday header (the `'MO'` literals in `appointments.service.ts` are iCal `byDay` constants, not translate keys) |
| D7 | `TU` | `Tu` | `Di` | old date-picker weekday header |
| D8 | `WE` | `We` | `Mi` | old date-picker weekday header |
| D9 | `TH` | `Th` | `Do` | old date-picker weekday header |
| D10 | `FR` | `Fr` | `Fr` | old date-picker weekday header |
| D11 | `SA` | `Sa` | `Sa` | old date-picker weekday header |
| D12 | `SU` | `Su` | `So` | old date-picker weekday header |

---

## Deliberately NOT done (out of scope)

- **U1-U5** (Open Source, licence name, developer names, language endonyms, document title) - proper nouns / conventions / outside `@ngx-translate`; left as-is per instructions.
- **All of Section D** (12 orphaned keys) - informational only; keys kept in both locales.
- Standalone-components migration, moment-timezone import fix, ical-generator typing fix, `async`→`waitForAsync`, `@angular/http`, `rxjs/Subscription`, TS2564/TS1272/TS2872 cleanups, Bootstrap→Material migration, Protractor/ESLint dead-config cleanup, upgrade-docs consolidation - all explicitly out of scope and untouched **at the time of this i18n pass**.
  - **Update (2026-09-14):** every technical item in the bullet above was subsequently completed by the Bootstrap→Material migration (Phases 0-8). `@angular/http` and the `async`→`waitForAsync` rewrite are gone from the client sources, the TS2305/TS2307/TS7006/TS2564 clusters are at zero, and Bootstrap itself has been removed. Only the i18n records in this document are still current.

---

## Verification (all inside Docker, `duely-dev`)

> **Historical numbers.** The measurements below are the pre-migration baseline recorded on 2026-09-11 (tsc TOTAL 154, NG8004 103, bundle build failing). They are kept as the audit trail of this i18n pass only. Current state after Phases 0-8: tsc app 0 errors, tsc spec 0 errors, 0 NG8xxx in `npm test`.

Commands:
- `docker compose run --rm duely-dev npx tsc --noEmit -p client/tsconfig.spec.json` - exit 2, TOTAL **154 -> 154** (no change). **TS2322 = 0, TS2531 = 0** (both unchanged).
- `docker compose run --rm duely-dev npm test` - bundle generation still fails (pre-existing).

| Code | Before | After | Delta | Explanation |
|---|---:|---:|---:|---|
| tsc TOTAL | 154 | 154 | 0 | No new type errors introduced. |
| TS2322 | 0 | 0 | 0 | Requirement met. |
| TS2531 | 0 | 0 | 0 | Requirement met. |
| TS2564 | 7 | 7 | 0 | U6 added no new uninitialised class properties. |
| all other TS codes | - | - | 0 | Unchanged (TS2339=90, TS2345=10, TS2351=7, TS2349=7, TS7006=4, TS2872=4, TS2307=4, TS2305=4, TS18047=4, TS1272=4, TS2769=3, TS2709=2, TS7009=1, TS2740=1, TS2454=1, TS2352=1). |
| NG8004 | 98 | 103 | **+5** | Expected: 5 new `| translate` usages - +3 in `settings.component.html` (CALENDAR NAME / PRODUCT ID / URL), +1 in `appointment-form.component.html` (C1 REQUIRED25), +1 in `creator.component.html` (C2 DEBUG OUTPUT). |
| NG8002 | 69 | 69 | 0 | Unchanged. |
| NG8103 | 41 | 41 | 0 | Unchanged (warnings). |
| NG8001 | 21 | 21 | 0 | Unchanged. |
| NG5002 | 2 | 2 | 0 | Unchanged. |

The `SELECT DATE` rename changed existing pipe keys, not pipe counts, so `recurring-settings.component.html` stayed at 35 NG8004.

## Could NOT be verified

Because the application bundle does not build (pre-existing NG8xxx / TS errors from the standalone-components + TestBed cluster), **no runtime or browser verification was possible**: the actual rendered date-picker labels, the legal-notice page text, the collision "excluded by user" reason, and the new Settings fields could not be exercised in a running app or by unit tests. These were verified by static analysis and by the type-check/compiler deltas only.
