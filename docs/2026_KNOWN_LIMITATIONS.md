# Duely — Known Limitations

**Status:** living record of accepted, deferred and upstream-owned limitations.
**Branch:** `dev-v2`. **Authored:** 2026-11-09 by Phase 13 (task #38), the closing phase of the
Bootstrap-to-Material migration.

This file is the durable home for everything the migration deliberately did **not** fix. It was
created when `docs/2026_MIGRATION_BACKLOG.md` was retired, then expanded on 2026-11-09 when the
completed execution plan, Material migration reference and local working-state handoff were
consolidated and retired. Unresolved work and items closed *by decision rather than by repair* remain
here. Tracked history stays in Git; the git-excluded task board retains local session records.
Current developer guidance is in `README.md`, setup/build guidance in `INSTALL.md`, and recorded
verification results in `docs/TESTING_GUIDE.md` §4.

**Every entry states four things:** WHAT the limitation is · WHY it is accepted · WHAT the risk is ·
WHAT WOULD CHANGE THE DECISION.

Sections **(a)–(g)** are the prescribed spine. Sections **(h)–(k)** carry (h) architectural deferrals,
(i) accepted UI defects and user-gated follow-ups, (j) the i18n backlog from the deleted
`docs/TODO-untranslated-strings.md`, and (k) remaining visual and functional verification gaps.
The plan/reference retirement additions were checked against source at `f527f26`; the local handoff
was reviewed against source at `889b3e5` and existing verification records. These documentation reviews
did not rerun tests or browser checks.

> **Line-number note.** Citations were re-verified against the working tree at `1f6fd97`. A handful
> drifted from the figures recorded during Phases 11–12; the current verified numbers are used here
> and the drift is listed in the Phase 13 closure record (`docs/2026_MIGRATION_TASKBOARD.md` §42).

---

## (a) DEFERRED TO THE TEST-AND-DATE PHASE

Locked decision 3 ("no test work inside the migration cycle") and locked decision 9 ("no
modernisation") keep the following loud and red. They are deferred to a future, user-initiated
test-and-date phase, not lost. The unit-test baseline is **24 failed / 49 passed (73 total)**,
failing-name md5 `172d78996b50c84e38211b529d76ab0b`; that partition must neither improve nor regress
until the deferred phase owns it.

These restrictions describe the completed migration, not a permanent prohibition: decisions 1–2 in
`docs/TODO_UPGRADES.md` allow test work and necessary modernisation in the separately authorized
upgrade cycle. Unrelated documentation work does not authorize fixes or baseline changes.

### (a.1) `saveAs` — 3 tests, `TypeError: Cannot redefine property: saveAs` (backlog §1(a), Q1)

- **WHAT.** `web-storage.service.spec` (2 tests) and `electron-storage.service.spec` (1 test) fail
  because `file-saver@2.0.5` is CJS-only (`main: dist/FileSaver.min.js`, no `module`/`exports`/`type`
  field). esbuild inlines it and synthesises the module namespace with `defineProperty` omitting
  `configurable`, so `vi.spyOn` cannot redefine the property. This is not a test-ordering defect.
  Three options are recorded, none chosen:
  1. validate `vi.mock('file-saver', …)` empirically before relying on it;
  2. assert an observable side effect instead of the call;
  3. introduce a thin injectable wrapper service around `saveAs`, shared by `WebStorageService` and
     `ElectronStorageService` — better design, trivially mockable via TestBed providers, and it
     removes a pattern the two specs currently duplicate.
- **WHY ACCEPTED.** It is test work, barred by locked decision 3. The failures are loud, classified
  and stable, so they cannot silently rot.
- **RISK.** `vi.mock` may be **inert**: esbuild has already inlined the CJS module, so there may be no
  module boundary left to intercept. An inert mock would produce a **silent false green** — strictly
  worse than today's loud failure. Any future fix must validate the mock empirically before trusting
  it.
- **WHAT WOULD CHANGE THE DECISION.** A user waiver of decision 3 for these two spec files, plus
  empirical proof that whichever option is chosen does not pass vacuously.

### (a.2) `CollisionDetector.spec` — 1 test with TWO independent defects (backlog §1(b), Q2)

- **WHAT.** One spec, two separate bugs:
  1. **Provably stale expectation.** `date-holidays` computes in the country's timezone identically
     under `TZ=UTC` and `TZ=Europe/Berlin`, and `RecurrencePattern.ts` deliberately re-stamps the
     holiday date with the event's time of day, while the spec asserts the raw library date. **No
     `TZ` setting can satisfy the assertion** — it is not a timezone artefact.
  2. **The assertion loops iterate `i` but assert on index `[0]`.** In
     `client/app/DatesAndCollisions/CollisionDetector.spec.ts:49-52,82-85`, the user-date loop
     checks only the first date and the holiday loop repeats one comparison 15 times, never checking
     14 of the 15 expected holidays — including **Augsburger Friedensfest**, the entire reason the
     second fixture location `{ country: 'de', state: 'by', region: 'a' }` exists.

  A separate parked follow-up proposes refreshing the German-holiday fixtures from **2017 to 2037**.
  The current seed and expected dates still use 2017 (`:15-20,55-71`). Changing the year alone fixes
  neither defect above; expected holidays and timezone offsets need independent verification.
- **WHY ACCEPTED.** Test work (decision 3). Fixing the index-0 loop will likely expose *more*
  failures, so it needs a budget decision, not a drive-by fix. The fixture refresh was recorded in
  the retired local handoff, not authorized for this documentation review.
- **RISK.** The loop bug means 14 of 15 holiday assertions have never actually executed; the spec
  gives false confidence about multi-location collision coverage. Blind year replacement can also
  preserve invalid holiday dates or offsets.
- **WHAT WOULD CHANGE THE DECISION.** A user-authorized test-and-date review with an agreed failure
  budget for the newly-exposed assertions and independently checked fixtures for the chosen year.

### (a.3) `creator.component.spec` `saveText` — decided option C (backlog §1(d))

- **WHAT.** A genuine stale expectation, never green in this repo's history: "expected `saveText` to
  have been called at least once". `generateAndSaveICAL()` early-returns because `appointment.valid`
  is `[false, true, true, true]`, and `valid[0]` is only recomputed by
  `AppointmentFormComponent.endValidation()` on form `valueChanges` — a component this spec never
  instantiates; setting `summary = 'test'` on the model alone cannot flip it. The `937a920`
  conversion to `async it()` + `await` exposed it (previously it passed vacuously in a
  fire-and-forget `.then()`).
- **WHY ACCEPTED.** **User decision 2026-09-12: option C — accept reduced coverage.** Drop the
  positive test and keep the passing negative test; the app code is NOT reworked. Implementation is
  deliberately **deferred to a user-initiated general test-coverage review**; until then the test
  stays LOUD/RED and no phase may silently fix, drop or skip it.
- **RISK.** The happy-path ICS-generation flow has no positive unit coverage.
- **WHAT WOULD CHANGE THE DECISION.** The coverage review. Rejected alternatives on record:
  **A** — test-side `valid = [true, true, true, true]` one-liner (keeps happy-path coverage; may
  resurface in the review); **B** — app-side model re-validation in `generateAndSaveICAL`
  (a Phase 3.x-class behavioural rework, barred by decision 9).

### (a.4) Mixed `Moment | Date | string` representation of `untilDate` (backlog §2(g)-12, deviation D4)

- **WHAT.** The `untilDate` value is polymorphic across the code path: a `string` seed at rest
  (`'YYYY-MM-DD'`), a local-midnight `Date` after any datepicker auto-snap, and a `Moment` in the
  recurrence computation. It has zero current consumers that normalise it.
- **WHY ACCEPTED.** Consolidating it is a date-handling refactor barred by decision 9 within the
  migration cycle; it is a natural companion to the test-and-date phase that owns (a.1)–(a.3).
- **RISK.** A future consumer that assumes one concrete type will mis-handle the other two; the
  dual `formControlName="untilDate"` + `[(ngModel)]="enddate"` binding on the same control is the
  same dual-binding debt class recorded as deviation D4.
- **WHAT WOULD CHANGE THE DECISION.** The test-and-date phase normalising `untilDate` to a single
  representation with a regression test.

### (a.5) Model-band anomaly: start time shifts 22:00 → 23:00 (backlog §2(g)-14)

- **WHAT.** During a reverse end-date operation the start wall-clock time can shift from 22:00 to
  23:00. Full diagnosis: `endDateListener`'s recompute-start branch compares **stale**
  `appEnd`/`appStart` values captured *before* the preceding branch mutated the start, so the guard
  fires on out-of-date inputs.
- **WHY ACCEPTED.** Pre-existing — byte-identical in `98f603f` and its parent, **not** a `5a219bc`
  regression. The candidate owner was the Phase 3.x appointment-form rework; that phase did not
  absorb it, so it is deferred to the test-and-date phase.
- **RISK.** A one-hour model-band error on a specific reverse-date interaction path. It is a model
  defect that may not always be visible in the rendered view.
- **WHAT WOULD CHANGE THE DECISION.** The appointment-form rework re-reading the post-branch-A start
  inside branch B's guard, with a model-level (not view-level) regression test.

### (a.6) Nineteen deferred `appointments.service.spec` failures (Phase 6)

- **WHAT.** Phase 6 commit `201f166` unmasked 19 failures in this spec file, all still part of the
  24-failure baseline. Together with the five tests in (a.1)–(a.3), these account for all 24:

  | Group | Tests | Current failure |
  |---|---|---|
  | Recurring-event JSON expectations | 10 | `ical-generator` serializes `start`/`end` as ISO strings rather than `Date` objects; event-level timezone is `null` rather than inherited from the calendar. |
  | Ordinal-weekday recurrence | 7 | Source constructs `byDay` values such as `'-3WE'`, which the current library rejects. The inverse branches also pass day-of-month, not month, to `getDaysInMonth()`. |
  | ICS-string and simple-event expectations | 2 | Expected UTC `Z` suffix is absent; expected event-level `Europe/Berlin` timezone is `null`. The null-repeating crash that originally masked these assertions was **fixed** by `be16352`. |

  Source sites: `client/app/creator/appointments.service.ts:273,296,405,451` (ordinal strings) and
  `:294,449` (month argument). Representative assertions are in
  `client/app/creator/appointments.service.spec.ts:170,233,252-254,294-296`.
- **WHY ACCEPTED.** Tests and recurrence-behaviour changes are deferred under decisions 3 and 9.
  The original Phase 6 classification survives in `201f166`; the two null-guard failures are
  reclassified here from the recorded post-repair test output, not counted as an unresolved crash.
- **RISK.** Ordinal-weekday recurring events can fail in production. Blindly changing JSON or ICS
  expectations to match library output could hide timezone or recurrence regressions; the ten
  serialization assertions also expose the production boundary issue in (a.7).
- **WHAT WOULD CHANGE THE DECISION.** A user-initiated test-and-date phase that fixes ordinal
  encoding/calculation and reviews date/timezone expectations against intended exported ICS
  semantics, with non-vacuous regression coverage.

### (a.7) Serialized event dates passed to Date-based collision code

- **WHAT.** `client/app/creator/appointments.service.ts:577` casts `ev.toJSON()` to
  `EventCollisionData` without converting serialized dates back to `Date`. Collision code calls
  `eventData.start.getHours()` and other Date methods in
  `client/app/DatesAndCollisions/Recurrence/RecurrencePattern.ts:72-75,108-111`. Task #63 recorded
  `TypeError: eventData.start.getHours is not a function` for recurring events carrying exclusions
  (`docs/2026_MIGRATION_TASKBOARD.md` §32.10). This is a production defect, **not only stale tests**.
- **WHY ACCEPTED.** Pre-existing serialization drift, unchanged by the holiday-catalogue extraction;
  its repair belongs to the deferred test-and-date phase. The type cast is not runtime conversion.
- **RISK.** Affected recurring/exclusion exports can throw instead of producing ICS. Tests using
  manually constructed Date-valued collision inputs do not cover this serialization boundary.
- **WHAT WOULD CHANGE THE DECISION.** Normalize the event-to-collision boundary and verify real
  `getICalString()` calls with recurring events, holiday exclusions and explicit excluded dates.

### (a.8) UNTIL picker initially empty instead of restoring the model

- **WHAT.** `RecurringSettingsComponent` initializes `enddate` to `null` and later assigns
  `appointment.recurringSettings` without hydrating the picker from `untilDate`
  (`client/app/creator/appointment-form/recurring-settings/recurring-settings.component.ts:101,133`).
  The template binds both `formControlName="untilDate"` and `[(ngModel)]="enddate"` to the input
  (`recurring-settings.component.html:145-149`). The first reveal can therefore be empty despite a
  seeded or saved model date. This initialization defect is separate from the mixed types in (a.4).
- **WHY ACCEPTED.** The original Phase 3.4 obligation was explicitly deferred by the recurrence
  conversion (`8b1d40a`); date-model synchronization remains outside the completed migration.
- **RISK.** The displayed UNTIL date does not reliably reflect the recurrence model; opening the
  control can disturb the value through the retained dual binding.
- **WHAT WOULD CHANGE THE DECISION.** Restore the picker from the model with calendar-day-safe
  conversion, and test first reveal and reopening a saved appointment without changing its UNTIL.

### (a.9) Load-bearing reactive-form / `ngModel` dual bindings

- **WHAT.** The creator-family forms still combine `formControlName` and `[(ngModel)]` across
  advanced, alarm, appointment and recurrence settings. For example,
  `client/app/creator/appointment-form/appointment-form.component.html:6` binds the summary through
  both mechanisms. This synchronization keeps the `Appointment` model used for ICS generation in
  step with form edits. The retired plan's historical "53 bindings" is not a current inventory.
  The recorded UNTIL update at `appointment-form.component.ts:227` also relies on the paired
  `ngModel` binding's `NgModel._updateValue()` calling `markForCheck()` under OnPush;
  `FormControlName` supplies no such notification. The Phase 11 review corrected that attribution
  in `c24818c` after inspecting Angular 20.3.18.
- **WHY ACCEPTED.** Consolidating into explicit model/form synchronization is a separate behavioural
  refactor, not a mechanical Material migration. The UNTIL issue in (a.8) is one symptom, not the
  whole scope. The Phase 13 browser pass recorded the Angular dual-binding deprecation warning.
- **RISK.** Deprecated binding behaviour and divergent model/form state if the bindings are removed
  without replacing their synchronization; removing the implicit OnPush notification can also leave
  imperative updates visually stale. A view-only check can miss broken exported values.
- **WHAT WOULD CHANGE THE DECISION.** A dedicated refactor supplying explicit change-detection
  notification and regression coverage for model values, form validation, imperative date updates,
  alarms, recurrence settings and generated ICS.

### (a.10) `initializeCalendar()` remains public solely for a test spy (deviation D5)

- **WHAT.** `client/app/creator/appointments.service.ts:63` exposes `initializeCalendar()` so
  `vi.spyOn(service, 'initializeCalendar')` type-checks in `appointments.service.spec.ts:157`.
  The planned Phase 6 private-method revert was explicitly deferred in commit `201f166`.
- **WHY ACCEPTED.** Restoring privacy now would break spec compilation without repairing the
  deferred-red consuming test; unsafe casts were rejected.
- **RISK.** An implementation detail remains in the public service API. There is no demonstrated
  runtime defect from its visibility.
- **WHAT WOULD CHANGE THE DECISION.** Rewrite the spec through storage configuration and the public
  `getICalString()` API during the test-and-date phase, then restore `private initializeCalendar()`.

---

## (b) ACCEPTED RISKS

### (b.1) Hardcoded TU Braunschweig calendar defaults + the sebbo.net PRODID leak

- **WHAT.** `storage.service.ts:34-36` hardcodes `calendarName: 'Duely'`,
  `calendarProdId: '//TU Braunschweig//Duely//EN'` and
  `calendarUrl: 'https://duely.tu-braunschweig.de'`, consumed by `appointments.service.ts` (~`:64-66`,
  `name` / `prodId` / `url`). Separately, **clearing the Product ID field** in Settings makes
  `ical-generator` substitute its own default `PRODID:-//sebbo.net//ical-generator//EN` into the
  exported `.ics`.
- **WHY ACCEPTED.** User decision: multi-hoster configurability is deferred. The three defaults are
  already user-overridable through the Settings form; the hardcoded values only reproduce the
  previously-hardcoded literals so pre-existing persisted settings keep producing identical iCal
  output.
- **RISK.** An empty Product ID leaks a third-party (`sebbo.net`) identifier into a user's calendar
  export; the TU Braunschweig defaults are institution-specific.
- **WHAT WOULD CHANGE THE DECISION.** A decision to make the defaults hoster-neutral, and a guard
  (or a non-empty default) that prevents `ical-generator` from substituting its own PRODID when the
  field is cleared.

### (b.2) 44 icon-registration stderr warnings — TEST-HARNESS ONLY (decision D19)

- **WHAT.** `npm test` prints exactly **44** `Error retrieving icon duely:*` messages.
  `provideDuelyIcons()` runs from `app.config.ts:49`, which spec TestBeds never load, so each
  `<mat-icon svgIcon="duely:...">` render logs a lookup warning.
- **WHY ACCEPTED.** **Decision D19 SUPERSEDES the earlier decision 12.** This is a **test-harness
  artefact, NOT a user-facing defect.** In a real browser the count is **0**:
  `client/app/shared/icons/icon.provider.ts` registers every literal via
  `registry.addSvgIconLiteralInNamespace('duely', name, …)` inside a `provideAppInitializer`, so no
  icon HTTP request is ever made (verified during the Phase 5 browser pass: all 7 `mat-icon` elements
  on `/` contain a real `<svg>` child).
- **RISK.** None for users. The only risk is mis-reading the 44 as a production defect. It must
  **never** be documented as a user-facing limitation.
- **WHAT WOULD CHANGE THE DECISION.** Nothing needs to. **G4's `npm test` icon count must still be
  exactly 44** — the baseline contract is about not moving the test partition, and that is unchanged.
  Adding `provideDuelyIcons()` to the 10 spec TestBeds would only silence cosmetic output and is
  barred by decision 3.

### (b.3) Six CommonJS/AMD optimization-bailout specifiers (backlog §2(c))

- **WHAT.** The production build reports CommonJS/AMD optimization bailouts for **six dependency
  specifiers**: `moment-timezone`, `moment`, `file-saver`, `jalaali-js` (via `date-holidays-parser`
  `Jalaali.js`), `deepmerge` (via `date-holidays-parser` `utils.js`) and `uuid-random` (via
  `node_modules/ical-generator/dist/index.js`, which Webpack never reported). **Cite the dependencies,
  never a count.**
- **WHY ACCEPTED.** All six are upstream CJS packages with no ESM entry point; nothing in this
  repository can convert them. The esbuild message text is
  `▲ [WARNING] Module '<dep>' used by '<file>' is not ESM`.
- **RISK.** A slightly larger, less-tree-shaken bundle. No correctness impact.
- **WHAT WOULD CHANGE THE DECISION.** Upstream shipping ESM builds, or replacing the dependency.
  **The count is nondeterministic and must never be gated on:** the CLI dedups per specifier over a
  nondeterministic traversal order, and the *named* importing file varies run to run
  (`creator.component.ts` vs `settings.component.ts` for `moment-timezone`; `web-storage.service.ts`
  vs `electron-storage.service.ts` for `file-saver`). A single `ng build` reports 6; `build:prod`
  (two builds) reports 12.

### (b.4) Four retained unreachable environment files — with ZERO compiler warnings

- **WHAT.** `client/environments/environment.electron.ts`, `environment.electron-prod.ts`,
  `environment.server.ts` and `environment.server-prod.ts` are unreachable dead code: only
  `environment.ts` (development) and `environment.prod.ts` (production `fileReplacements`) are ever
  compiled into a bundle.
- **WHY ACCEPTED.** **User decision 17** keeps the four variants. The esbuild
  `@angular/build:application` builder **does not emit** the "part of the TypeScript compilation but
  it's unused" diagnostic at all (measured **0 prod / 0 dev**; it was 5 prod / 6 dev under the retired
  Webpack builder), so there is **no warning count to cite** — the backlog's old "5 → 4" closure
  criterion is unreachable and was superseded by Phase 7.
- **RISK.** Cosmetic only: four files that no build reaches can drift from the two live ones. There
  are zero compiler warnings, so nothing is noisy.
- **WHAT WOULD CHANGE THE DECISION.** A user decision to delete the four variants (they would need to
  be proven unreachable by a zero-import grep, as `client/polyfills.ts` and `client/typings.d.ts`
  were in Phase 7).

### (b.5) The Express catch-all returns 200 for every unmatched path

- **WHAT.** `server/app.ts:69-71` ends with an **unconditional**
  `app.use((req, res) => res.sendFile(...index.html))` — no `Accept` header test, no extension test.
  Against a running `node dist/server/app.js`, **every** unmatched path returns **200 with
  `index.html`**: `/definitely-not-here.txt` → 200 and even `/assets/does-not-exist.png` → 200, where
  the `@angular/build:dev-server` correctly returns 404 for the same missing asset.
- **WHY ACCEPTED.** Pre-existing behaviour, not introduced by the migration; deep links work in both
  servers (the Angular router renders `notFound` for unknown routes). Only genuine missing-asset
  detection differs, and nothing in the app fetches a bare asset URL expecting a 404.
- **RISK.** It defeats any production 404 assertion. A monitoring or SEO check that expects a real
  404 will be fooled. The recorded `/3rdpartylicenses.txt` probe returned `index.html`, not licence
  text: production `extractLicenses` writes the file at `static/3rdpartylicenses.txt`, one level above
  the served `static/browser/` root (recorded size 52,007 B). Packaging only `browser/` can omit
  notices. The current Docker image copies **all** of `dist/server`, including the licence file;
  no compliance violation is established by this review.
- **WHAT WOULD CHANGE THE DECISION.** Adding an `Accept`/extension test to the catch-all so genuine
  asset 404s pass through — a server behaviour change outside the migration's scope. A release must
  explicitly retain/distribute the parent-root licence artefact; changing its HTTP exposure is a
  separate packaging/server decision. Output paths are documented in `INSTALL.md`.

### (b.6) No tracked explicit browser-target policy

- **WHAT.** The retired `postcss.config.js` contained the only explicit browser-target declaration:
  `['last 2 versions', '> 1%', 'not dead']`. There is no `.browserslistrc` on disk (the filename is
  ignored by `.gitignore`) and no `browserslist` key in `package.json`. The declaration was already
  inactive when the Angular esbuild builder replaced the Webpack CSS pipeline.
- **WHY ACCEPTED.** Deleting that inactive config did not change the recorded production CSS bytes.
  Restoring browser support intent would require a tracked configuration and a user policy decision,
  not a documentation-only migration closure.
- **RISK.** The repository does not state its supported-browser intent. Generic Browserslist defaults
  must not be presented as verified Angular build targets or as a tested support matrix.
- **WHAT WOULD CHANGE THE DECISION.** Agree supported browsers, add a tracked target configuration,
  and verify the builder's effective targets and application behaviour on those browsers.

### (b.7) Invalid-input feedback remains a native blocking alert

- **WHAT.** `client/app/creator/creator.component.ts:70` still calls
  `alert(this.translate.instant('INVALID INPUTS'))` rather than a Material snackbar.
- **WHY ACCEPTED.** The creator conversion (`0d53dfb`) deliberately retained native feedback;
  replacing it was not required for the structural migration.
- **RISK.** The alert blocks interaction and uses browser/OS presentation rather than the app theme;
  no new validation defect is demonstrated.
- **WHAT WOULD CHANGE THE DECISION.** A user-authorized feedback/UI change with invalid-form and
  accessibility verification; do not introduce `MatSnackBar` merely to close this record.

### (b.8) Two non-blocking build-script robustness findings remain unauthorized

- **WHAT.** `scripts/build.mjs:397-402` awaits context disposal in an asynchronous signal handler
  without catching rejection (S1). Its Angular child-process close handler at `:247-253` records only
  the exit code, dropping the signal argument (S2); a signalled exit has a null code.
- **WHY ACCEPTED.** The Phase 6 review recorded both findings, but the user chose documentation fixes
  explicitly instead of build-script fixes. They remain deferred, not completed by that review.
- **RISK.** A rejected disposal can produce an unhandled rejection during watch shutdown. A signalled
  Angular exit still rejects the build, but its diagnostic loses the termination signal. Neither is
  evidence of a newly observed build failure or a false successful build.
- **WHAT WOULD CHANGE THE DECISION.** Explicit authorization for build-script changes, with Docker
  verification of watch shutdown, rejected disposal and signalled child termination.

### (b.9) The global Sass header still describes removed imports

- **WHAT.** `client/styles.scss:2-4` says `@use` must precede the legacy `@import`s below, although
  the three directives at `:5-7` are all `@use`. Phase 4 assigned this wording correction to Phase 13,
  but the current source still contains it.
- **WHY ACCEPTED.** Comment-only wording was excluded from the functional Sass conversion and was
  not repaired by closure. This review changes documentation, not source comments.
- **RISK.** Misleading guidance for a future stylesheet edit; no runtime or Sass compilation impact.
- **WHAT WOULD CHANGE THE DECISION.** A scoped comment correction retaining the actual module-order
  requirement without referring to nonexistent imports.

### (b.10) Unused palette helper families remain alongside live label classes

- **WHAT.** `client/_palette.scss:26-88` retains eight bare-colour background classes and eight
  `.border-*` classes. Current `storage.getColor()` template interpolation constructs `.label-*`
  names, not these two families; `.label-*` definitions at `:90-120` remain actively used.
- **WHY ACCEPTED.** Phase 7 deliberately retained the helpers under a cleanup deferral until the
  final colour interpolation disappeared. That scope decision is not proof that unused background
  helpers are required by the live label bindings.
- **RISK.** Redundant emitted CSS and misleading helper names (`.border-*` sets background colour).
  Deleting the whole palette or live label family would break current appearance.
- **WHAT WOULD CHANGE THE DECISION.** A scoped cleanup proving each candidate has no static or
  dynamically generated consumers, preserving the accent map, live labels and actual swatches.

### (b.11) Express 4 runtime uses Express 5 type declarations

- **WHAT.** `package.json:66,84` declares `express ^4.21.2` and `@types/express ^5.0.0`.
  `server/package.json:36` also declares Express 4; its source is checked using root-installed
  typings, with strict checking enabled in `server/tsconfig.json`.
- **WHY ACCEPTED.** The skew was recorded as pre-existing by the Phase 6 review. Track C1 in
  `docs/TODO_UPGRADES.md` plans to align it by upgrading Express; that change has not landed.
- **RISK.** Type-check success does not prove that APIs described by another major behave the same
  at runtime. The recorded server type-check passed; this review establishes no new compiler or
  runtime failure from the mismatch.
- **WHAT WOULD CHANGE THE DECISION.** Align the runtime and typings during the server upgrade and
  verify static serving, fallback behaviour and error paths in Docker.

---

## (c) DECLINED MODERNISATION (locked decision 9)

Decision 9's declined-modernisation list is **closed and exhaustive**. Each item below was verified
as *not deprecated* or *not worth the churn*; none is a defect.

### (c.1) The class-based `CanActivate` guard

- **WHAT.** `auto-redirect.guard.ts` uses a class-based `CanActivate` guard rather than a functional
  guard.
- **WHY ACCEPTED.** `CanActivate` is **NOT deprecated** — it carries no `@deprecated` tag at
  `node_modules/@angular/router/router_module.d.ts`. Functional guards are an alternative, not a
  replacement.
- **RISK.** None. **WHAT WOULD CHANGE IT.** A future Angular major actually deprecating the
  interface.

### (c.2) Redundant explicit `standalone: true` on all 10 components

- **WHAT.** Every component still spells `standalone: true` even though it is the default in
  Angular 20.
- **WHY ACCEPTED.** Harmless and explicit; removing it is churn with no benefit.
- **RISK.** None. **WHAT WOULD CHANGE IT.** Nothing.

### (c.3) Zero signal usage across 42 non-spec client files

- **WHAT.** No Angular signals are used anywhere.
- **WHY ACCEPTED.** A signals migration is a large behavioural refactor, squarely barred by decision
  9.
- **RISK.** Missing out on finer-grained reactivity. **WHAT WOULD CHANGE IT.** A dedicated,
  user-authorised modernisation phase.

### (c.4) `storage.factory.ts:22,25` instantiating services with `new`

- **WHAT.** The storage factory returns `new ElectronStorageService()` / `new WebStorageService()`
  rather than using DI.
- **WHY ACCEPTED.** Deliberate: the factory selects an implementation at the provider boundary, and
  both services have no-arg constructors.
- **RISK.** None functional. **WHAT WOULD CHANGE IT.** A DI refactor of the storage layer.

### (c.5) Two missed `import type` opportunities

- **WHAT.** `appointment.ts:5` (`import { RecurringSettings }`) and `appointments.service.ts:18`
  (`import { AlarmData }`) import types without the `type` keyword.
- **WHY ACCEPTED.** Cosmetic; `verbatimModuleSyntax` is not enabled, so there is no runtime cost.
- **RISK.** None. **WHAT WOULD CHANGE IT.** A lint rule or a tidy-up pass.

### (c.6) `@angular-eslint/prefer-inject` DECLINED and turned OFF

- **WHAT.** The constructor-injection → `inject()` DI modernisation is not adopted; the rule is
  `off` in `eslint.config.js:244`.
- **WHY ACCEPTED.** **User decision 2026-10-30** (decision 9 extension). Declining it eliminated 34
  errors (baseline 607 → 573) without a rule-downgrade campaign on real violations.
- **RISK.** None. **WHAT WOULD CHANGE IT.** A user reversal of the decision.

### (c.7) The 8 `no-deprecated` warnings deliberately left untouched

- **WHAT.** `@typescript-eslint/no-deprecated` is severity `warn` and reports **8** advisories:
  `RouterTestingModule` ×4, the `ApplicationConfig` import path, `provideAnimationsAsync` (v23
  intent-to-remove), and `saveAs` `autoBom` ×2.
- **WHY ACCEPTED.** Warnings do not affect the lint exit code (`npm run lint` exits 0). Each is
  either a not-yet-removed API or a spec-side usage barred by decision 3.
- **RISK.** Advisory only — these APIs will need attention at a future Angular major.
- **WHAT WOULD CHANGE IT.** The Angular 21/22 phase (see (e)), or a spec waiver for
  `RouterTestingModule`.

### (c.8) The template-accessibility lint tier (11 rules) left DISABLED

- **WHAT.** `@angular-eslint/template/accessibility` (11 rules) is **not** enabled; template linting
  runs only the 3-rule `recommended` tier.
- **WHY ACCEPTED.** **User decision 2026-10-30.** Task #33's spec scoped template linting to the
  parser + recommended tier and never named accessibility; enabling an unscoped tier would have
  inflated the baseline Phase 10 inherited.
- **RISK.** **The 0 findings across the 11 templates must NEVER be cited as evidence of
  accessibility.** Template accessibility is effectively unlinted.
- **WHAT WOULD CHANGE IT.** A user decision to enable the tier — a one-line spread of
  `ngTemplatePlugin.configs.accessibility.rules` into the template block of `eslint.config.js`.

---

## (d) UPSTREAM-OWNED

### (d.1) `moment` / `moment-timezone` in maintenance mode, never replaced

- **WHAT.** `moment-timezone ^0.5.47` is live in **18** client source files (13 literally
  `from 'moment-timezone'`, 5 bare `'moment'`). Moment is officially in maintenance mode.
- **WHY ACCEPTED.** Replacing it is a large date-handling refactor barred by decision 9 and coupled
  to the deferred test-and-date phase (see (a.4), (a.5)).
- **RISK.** No new features or DST-data updates upstream; a slowly-growing bundle. No correctness
  defect today (see (h.3) — the full timezone dataset is verified correct 1980–2200).
- **WHAT WOULD CHANGE IT.** The date-handling phase migrating to a maintained library.

### (d.2) Deprecated `boolean@3.2.0` in the lock tree (`rimraf@2.6.3` REMOVED)

- **WHAT.** `boolean@3.2.0` (dev, optional; via `electron → @electron/get → global-agent`) is
  npm-deprecated and remains in `package-lock.json`. **Correction:** `rimraf@2.6.3` — which the
  backlog also listed — is **no longer present**: it sat inside the win32-only `electron-builder`
  optional subtree that Phase 2 pruned. The only `rimraf` in the tree today is **6.1.3**, a direct
  devDependency (`package.json` `clean` script), which is not deprecated.
- **WHY ACCEPTED.** `boolean` is a transitive optional dependency of the Electron toolchain with no
  direct upgrade path.
- **RISK.** A deprecation warning at install; no runtime surface (it is dev/optional).
- **WHAT WOULD CHANGE IT.** An upstream `global-agent`/`@electron/get` release that drops it — the
  dependency-upgrade cycle's territory (`docs/TODO_UPGRADES.md`).

### (d.3) `@angular/animations` npm-deprecated but a MANDATORY peer on v20

- **WHAT.** `@angular/animations ^20.3.18` (`package.json:53`) is npm-deprecated, yet it is a
  **mandatory peer** of `@angular/platform-browser@20.3.18` and therefore cannot be removed while on
  Angular 20.
- **WHY ACCEPTED.** Not removable on v20 without breaking the peer contract.
- **RISK.** A deprecation warning; the package is still functionally required.
- **WHAT WOULD CHANGE IT.** The Angular 21/22 migration (see (e)) — animations is folded into the
  platform in later majors.

### (d.4) `engines.node ">= 24.0.0"` is too lax for a future Angular 22

- **WHAT.** `package.json` `engines.node` is `">= 24.0.0"`. Angular 22 will require
  `^22.22.3 || ^24.15.0 || >=26.0.0`.
- **WHY ACCEPTED.** Correct for Angular 20 today; tightening it now would be premature.
- **RISK.** An unguarded `npm install` on a too-old Node could pass the engine check yet break a
  future Angular 22 install.
- **WHAT WOULD CHANGE IT.** The Angular 21/22 phase tightening `engines.node`.


---

## (e) ROADMAP POINTER — the Angular 20 → 21 → 22 migration is a SEPARATE FUTURE PHASE

- **WHAT.** The framework major-version migration is **not** part of the Bootstrap-to-Material cycle
  and is deliberately deferred to its own future phase. The gates below were verified during planning
  so the discovery work is not repeated.
- **WHY ACCEPTED.** It is a distinct, large effort; bundling it into the Material migration would
  have made the closing phase unbounded.
- **RISK.** Staying on Angular 20 accrues deprecation advisories (see (c.7), (d.3)).
- **WHAT WOULD CHANGE IT.** A user decision to open the migration phase.

**Verified gates for the future phase:**

- `ng update` offers **one major at a time** — the path is 20 → 21 → 22, not 20 → 22.
- **TypeScript peer ranges:** Angular 20.3.31 requires `>=5.8 <6.0`; 21.2.23 requires `>=5.9 <6.1`;
  22.1.6 requires `>=6.0 <6.1`. The repo's `typescript ~5.9.3` satisfies 20 and 21 but **not** 22 —
  a TS 6.0 bump is on the critical path to 22.
- **`zone.js ~0.15.0 || ~0.16.0`** and **`rxjs ^6.5.3 || ^7.4.0`** survive both hops unchanged; the
  repo's `zone.js ~0.15.0` and `rxjs ~7.8.1` need no change.
- **`@angular-devkit/build-angular` becomes npm-deprecated at 22.0.0.** This obligation is **already
  discharged**: task #52 removed it (`aed844b`); `angular.json` uses only the esbuild
  `@angular/build:application` / `:dev-server` / `:unit-test` builders. Current pipeline/output
  guidance is in `INSTALL.md`.
- **The `mat.theme()` / `mat.theme-overrides()` M3 token API survives unchanged to 22.1.6**, so
  `client/styles/_theme.scss` needs **no rewrite** across both hops.
- **`engines.node`** must be tightened at 22 (see (d.4)).

**Companion cycle.** Dependency upgrades (the `boolean`/`@angular/animations` deprecations in (d),
the Electron revival in (f), and the trimmed-timezone prerequisite in (h.3)) are tracked separately
in `docs/TODO_UPGRADES.md`; that cycle should begin **after** this migration closes.

---

## (f) ELECTRON DESKTOP STORAGE — UNRESOLVED, DELIBERATELY DEFERRED

> **User decision 2026-11-02:** task #58 (Electron launch verification) is **deferred out of this
> cycle** and filed here as a limitation. It was **attempted and blocked**, not "never attempted",
> and it is **not** a verified result. A fresh dependency-upgrade cycle is coming and Node itself
> will be part of it, which moves the Node half of the blocker anyway.

- **WHAT.** Two distinct facts:
  1. **`isElectron` has always compiled to `false`** (locked decision 17), so `ElectronStorageService`
     has never been active in a shipped desktop build; the web `StorageService` path is the only one
     ever exercised.
  2. **The `openSaveDialog` IPC handler is a stub.** `electron/main.ts:74-76` handles
     `ipcMain.on('openSaveDialog', …)` by only replying
     `event.sender.send('asynchronous-reply', 'pong')` — it opens no dialog and writes no file.
     **Correction:** the `console.log('ping')` Quick-Start leftover the backlog described was
     **deleted by Phase 6**; the handler is now pong-only. Wiring up a real save dialog is unfinished
     feature work, deliberately not undertaken.
- **WHY ACCEPTED.** Desktop-storage wiring is a feature, not a migration deliverable; and the launch
  could not be verified in-container (blocker below), so any wiring would be unverifiable.
- **RISK.** The packaged desktop app has no working "save to disk" dialog, and the Electron storage
  path is untested at runtime.
- **WHAT WOULD CHANGE THE DECISION.** The dependency-upgrade cycle: install `libgtk-3-0`, extract
  Electron manually, launch it, then implement and verify the dialog.

**Three disproved beliefs — do NOT re-litigate them:**

1. **The Electron zip is NOT damaged.** It has **76 entries** and `unzip -o` extracts all of them,
   including the 176 MB `v34.5.8` binary.
2. **The `libnss3.so` attribution carried for months was WRONG.** `libnss3` **is** present at
   `/lib/aarch64-linux-gnu/libnss3.so`; the real missing library is **`libgtk-3.so.0`**.
3. **The extraction failure is NOT a trixie/OS problem.** It is the
   `extract-zip@2.0.1 → yauzl@2.x → fd-slicer` **deadlock on Node ≥ 24.16 / 26.x**
   (`docs/2026_MIGRATION_TASKBOARD.md` §25.9).

**Electron `file://` dynamic-import risk (Phase 11.1 lazy loading).** Lazy loading introduced
**THREE new route chunks** (`about`, `legal`, `settings`) plus **ONE pre-existing animations vendor
chunk** — **not** "four new chunks" (corrected figure, TASKBOARD §35.3 / task #69). Under Electron's
`file://` origin, dynamic `import()` of these chunks is a theoretical load risk that has never been
exercised because the desktop build has never launched.

**Note for the revival.** The deadlock affects only the **installer**; manual `unzip -o` already
works. A future attempt may therefore need only `libgtk-3-0` plus manual extraction — **not** a
second Node runtime.

---

## (g) REJECTED ALTERNATIVES

Preserved **verbatim** from the retired `docs/2026_MIGRATION_BACKLOG.md` §2(h) so the rationale
survives the deletion. This table also preserves the completed execution plan's rejected-alternative
summary; that duplicate plan has now been retired. Do not re-litigate without new evidence.

| Alternative | Rationale |
|---|---|
| `MatTable` for the collisions table | ~178 KB (component plus CDK table) for a 2-column, unsorted, unpaginated, non-interactive table; the largest single saving in the migration; rejected independently by all three planning passes. |
| `MatExpansion` for collapse sections | `@if` destroys the collapsed subtree — 0 retained DOM, 0 change detection — whereas `mat-expansion-panel` keeps content in the DOM and animates it; destruction is strictly cheaper for 3 nested panels × N appointments. |
| Self-hosted Material Icons woff2 or a Google Fonts CDN | only 8 icons are needed; inline SVG literals are ~2 KB, and a CDN fetch fails under Electron's `file://` origin with no network guarantee. |
| Roboto | the pinned system font stack costs zero bytes, zero `@font-face`, no FOUT and no visual type-shift; Roboto is ~40–60 KB gzip plus a render-blocking request that fails offline. |
| `all-component-themes()` | unnecessary — verified that Material components ship their own structural CSS inside their `fesm2022` bundles. |
| `MatGridList` for layout | JS-driven absolute positioning that re-measures on resize; a performance regression versus ~600 B of CSS Grid. |
| `MatDialog`, `MatChips`, `MatTooltip`, `MatSidenav`, `MatMenu` | no modal, badge, tooltip, sidenav or menu exists anywhere in the repo; speculative imports are exactly the unused surface that erodes maintainability. (`MatTooltip` is a genuine accessibility win for the 6 icon-only buttons — deferred, not rejected.) |
| Extracting an `exclusion-row` component | unnecessary — template reference variables inside `*ngFor` are already per-iteration scoped (verified twice, including empirically in gate 4). |
| `standalone: false` as the end state | it is the unblock, not the destination — rejected by the user's sequencing decision. |
| Mirroring Bootstrap's 12-column grid or drop-in identical class names | rejected by the user's layout decision in favour of seven intention-revealing classes; drop-in names would leave Bootstrap vocabulary in the codebase permanently, contradicting "remove Bootstrap entirely". |
| Webpack/`ts-loader transpileOnly` JIT → `ng build` esbuild AOT, plus its neighbours (route-level lazy loading, shared `HolidayCatalogService`, `OnPush`, trimmed moment-timezone build, Playwright service) | all excluded by the "blocking fixes only" scope decision; the AOT item is the most consequential — see backlog (e). **The AOT/Webpack-retirement half was subsequently DONE by backlog-emptying Phases 5–6, so (e) is CLOSED; the neighbours listed with it were each closed or deferred on their own merits (lazy loading → Phase 11.1 FIXED, `HolidayCatalogService` → Phase 11.2 FIXED, `OnPush` → Phase 11.4 FIXED, trimmed moment-timezone → DECLINED see (h.3), Playwright service → Phase 9 FIXED).** |
| ESLint flat config, dead Protractor/tslint deletion, the missing `environment.prod.ts`, an en/de key-parity test, the 7 unused ngx-bootstrap i18n keys, the 4 `aria-label="Left Align"` copies | excluded by the same scope decision; **all subsequently closed** (ESLint → Phase 8, Protractor/tslint → Phase 7, `environment.prod.ts` → Phase 8, key-parity test → Phase 12, unused keys + aria-labels → Phase 10). |

---

## (h) PHASE 11 ARCHITECTURAL DEFERRALS

Recorded by tasks #63 (Phase 11.2) and #64 (Phase 11.3), user-approved for transcription rather than
repair.

### (h.1) Two deferred `date-holidays` construction sites (task #63, commit `57f0932`)

- **WHAT.** `settings.component.ts:61` and `recurring-settings.component.ts:100` still each do their
  own `new Holidays()` for dropdown population via `getCountries()` / `getStates()` / `getRegions()`,
  and were deliberately **not** folded into the new `HolidayCatalogService`
  (`client/app/DatesAndCollisions/HolidayCatalogService.ts`, which owns the collision-path
  construction). Three construction sites remain, so the "shared service" is shared only across the
  four recurrence subclasses.
- **WHY ACCEPTED.** They use a **different API surface with no `init()` at all**, while the collision
  path re-initialises one **stateful** instance inside nested loops. Sharing ONE instance across both
  purposes would create a **cross-contamination channel that does not exist today**. A three-site
  consolidation was briefly chosen by the user, then reverted before any code was written.
- **RISK.** Three sites instead of one; drift if the holiday-catalogue construction logic changes.
- **WHAT WOULD CHANGE THE DECISION.** Evidence that `getCountries()` / `getStates()` / `getRegions()`
  read no state set by `init()` / `setLanguages()`, or a design where the service owns **separate
  internal instances per purpose**.

### (h.2) The five-way duplicated `HolidaysCountry` type alias (task #63)

- **WHAT.** `type HolidaysCountry = { country: string; state?: string; region?: string }` is declared
  verbatim in **FIVE** files: `CollisionDetector.ts:7`, `CollisionDetector.spec.ts:1`,
  `RecurrencePattern.ts:1`, `appointments.service.ts:15` and `HolidayCatalogService.ts:4` (the fifth
  copy **added by task #63**). `type HolidaysHoliday` is likewise duplicated in
  `HolidayCatalogService.ts:5` and `RecurrencePattern.ts:2`.
- **WHY ACCEPTED.** Type-only and structurally identical — zero runtime and zero bundle effect.
  Consolidating would require touching `CollisionDetector.ts` (explicitly out of #63 scope) and
  `CollisionDetector.spec.ts` (forbidden by locked decision 3).
- **RISK.** Cosmetic drift only — if one copy is edited the others silently diverge.
- **WHAT WOULD CHANGE THE DECISION.** A user waiver of decision 3 for that one spec file, allowing a
  shared types module under `DatesAndCollisions/`.
- **HONEST NOTE (the irony).** This five-way alias duplication is the **real** duplication in these
  files, and the backlog never mentioned it. The duplication the plan *claimed* — a duplicated
  catalogue **construction** between `CollisionDetector.ts` and `RecurrencePattern.ts` — **never
  existed at all**: `git log -S'new Holidays()' -- CollisionDetector.ts` returns nothing; that file
  only ever used `date-holidays` as a **type**. Task #63 was therefore a **single-site extraction,
  not a deduplication.**

### (h.3) The trimmed `moment-timezone` build is DECLINED and unavailable (task #64, no source commit)

- **WHAT.** The ~25 KB gzip saving from switching to
  `builds/moment-timezone-with-data-10-year-range.js` is **DECLINED**. This is the disposition for the
  retired backlog bullet "The trimmed `moment-timezone` build (−25 KB gzip)".
- **WHY (measured — four separate node processes, one build per process).** The trimmed build carries
  correct Europe/Berlin DST data only for **2020–2030** and returns `utcOffset` **60** instead of the
  correct **120** for every summer date from **2031 onward** and for dates before its lower bound
  (1980). The wider `builds/moment-timezone-with-data-1970-2030.js` variant (147,623 B) does not help
  — it fixes 1980 but still returns 60 from 2031. Duely's default recurrence UNTIL is
  `moment(new Date()).add(100, 'y')` = **2126** (`recurring-settings.component.ts:129` and `:313`),
  and there is **zero** validator/`max`/`min`/cap on `untilDate` anywhere in the client, so post-2030
  summer recurrences are reachable in the **DEFAULT** flow and would be silently shifted one hour.
- **RISK OF THE STATUS QUO: none.** `require('moment-timezone')` resolves to `index.js` carrying the
  **FULL** data, verified correct against OS tzdata via `Intl.DateTimeFormat` continuously **1980 to
  2200**. There is **no latent defect today**.
- **WHAT WOULD CHANGE THE DECISION.** Bounding the UNTIL date first (a datepicker `max` plus a
  validator) — itself an unauthorised behaviour change under locked decision 9.
- **METHODOLOGY WARNING (transcribed alongside it).** All `moment-timezone` data builds wrap the
  **SAME** moment instance and register packed zone data into **ONE shared registry**, so loading two
  builds in a single process makes one silently overwrite the other and **BOTH report identical
  offsets**. The symptom is "the builds agree everywhere", which **hides** the real difference and can
  manufacture a false alarm about a pre-existing defect — this session produced three such false
  probes before the isolation was replicated. **Correct method:** one build per process, specifier via
  argv, cross-validated against `Intl.DateTimeFormat` (OS tzdata, no moment involved). **Unreliable
  load probes — do not use:** `tz.zoneExists()` (deprecated, warns), `tz.names.length` (returns 0),
  `tz.zone(...).untils` (throws "Invalid time value"). Full local record:
  `docs/2026_MIGRATION_TASKBOARD.md` §33 (Ivo) and §34 (leader verification).

### (h.4) `date-holidays` and its catalogue remain eagerly loaded

- **WHAT.** Secondary-route lazy loading is complete, but holiday-data lazy loading is not.
  `app.routes.ts:21,40-44` keeps Creator eager; its recurrence component statically imports
  `date-holidays` and constructs `Holidays` (`recurring-settings.component.ts:22,100`).
  `HolidayCatalogService.ts:2,38` also imports/constructs it synchronously. The recorded production
  initial graph includes the catalogue; the retired reference's lazy "holiday catalogue" chunk label
  was misleading.
- **WHY ACCEPTED.** Phase 11.1 scoped lazy loading to route components. Service extraction in Phase
  11.2 changed construction ownership, not data loading. Making synchronous holiday consumers
  asynchronous is a separate behavioural/architectural change.
- **RISK.** Catalogue download/parse cost remains in the initial payload despite the smaller entry
  chunk; no new functional defect or measured runtime slowdown is established here. This differs
  from the instance-sharing decision in (h.1).
- **WHAT WOULD CHANGE THE DECISION.** A user-authorized asynchronous loading design with initial
  payload measurements and location/recurrence/collision regression coverage. The declined trimmed
  timezone build in (h.3) is not a substitute.

---

## (i) PRE-EXISTING UI DEFECTS AND USER-GATED FOLLOW-UPS

Logged by the Phase 5 Playwright browser pass and **accepted as pre-existing and out of scope** by
user decision D20 (2026-09-14). Every colour/contrast/visibility claim derives from `getComputedStyle`
and SVG source, **not** from pixels — that pass produced zero screenshots because `visibilityState`
stayed `hidden` (decision D21 accepted the computed-style evidence and left the visual claims
labelled unconfirmed-by-pixels). **`/legal`'s raw-i18n-keys-on-cold-load defect is NOT here** — it was
fixed by Phase 10 commit 10.3(a). Source detail: TASKBOARD §14.6, §14.7, §14.9.

- **(i.1) Dark theme only half-applies.** `body { background: #ddd }` and `.card { background:
  #ffffff }` are **hardcoded**, so the page background and cards never invert in dark mode. *Risk:*
  a light page shell around dark content. *Changes when:* the hardcoded hexes are replaced with
  `--mat-sys-*` tokens.
- **(i.2) 9 labels at contrast 1.29 in dark theme.** Nine Material radio/field labels land at
  contrast **1.29** once Recurrence is expanded with a Monthly/Yearly pattern. *Risk:* effectively
  illegible text. *Changes when:* the label colour is token-derived.
- **(i.3) `on-primary` never accent-derived.** Filled-button labels and their icons land at
  **2.14–2.96** contrast because `--mat-sys-on-primary` is never re-derived per accent. *Risk:* low
  button-label contrast under some accents. *Changes when:* the theme emits a per-accent `on-primary`.
- **(i.4) `color-scheme` never set to `dark`.** Native checkbox/time/select popups stay light in dark
  mode. *Risk:* jarring native widgets. *Changes when:* `color-scheme: dark` is emitted under
  `[data-theme='dark']`.
- **(i.5) White-on-white brand logo in the light theme.** `assets/duely_only_white.svg` is invisible
  against the default light toolbar (`color="primary"` is inert on `mat-toolbar` under Material 20 and
  `--mat-toolbar-container-background-color` is undefined). *Risk:* the brand mark disappears.
  *Changes when:* the toolbar container colour is defined or a theme-appropriate logo variant is used.
- **(i.6) An 8 px horizontal scrollbar on every route at every viewport.** `html, body { width: 100% }`
  combined with the UA default `body { margin: 8px }` (never reset). *Risk:* a permanent spurious
  scrollbar. *Changes when:* the body margin is reset.
- **(i.7) Hardcoded `label-red` on the remove-appointment icon.** `creator.component.html` hardcodes
  `class="label-red"`, so the icon stays red even under a blue accent. *Risk:* accent-inconsistent
  icon. *Changes when:* the class is token-derived.
- **(i.8) Dead `showWeekNumbers` markup.** `<mat-datepicker showWeekNumbers="true">` is dead markup —
  `MatDatepicker` has no such `@Input`. *Risk:* none functional (inert attribute); misleading intent.
  *Changes when:* the attribute is removed or week numbers are implemented properly.

### (i.9) The missing `<base href="/">` (backlog item e / decision D20) — evaluated and SKIPPED

- **WHAT.** `client/index.html` has **no `<base href="/">`** and references its assets **relatively**.
  At a **multi-segment** bogus path the SPA history fallback serves `index.html` at the wrong
  directory depth, every relative asset resolves against the wrong directory, and the result is a
  **blank white page** with 404s instead of the app's not-found view. Single-segment bogus paths work
  (`/bogus` → wildcard → `/404`).
- **WHY ACCEPTED.** Task #35 (Phase 10) **evaluated and SKIPPED** the fix: **neither** mechanism is
  safe. A literal `<base href="/">` makes every relative asset URL resolve to the **filesystem root**
  under Electron's `file://` origin (`electron/main.ts` does `loadURL('file://…/index.html')`), which
  would blank the desktop window; `angular.json` `baseHref` carries the same `file://` hazard. The
  markup defect is pre-existing (the stale Webpack-era artefact had it too); Phase 5's SPA fallback
  only made it reachable.
- **RISK.** A blank page (not a friendly 404) when a user lands on a deep multi-segment URL. Users
  navigating in-app never hit it.
- **WHAT WOULD CHANGE THE DECISION.** An Electron-safe base mechanism — e.g. switching the desktop
  build to `HashLocationStrategy` (which needs no `<base>`) once `isElectron` can actually be turned
  on (see (f)), or a build-time `<base>` injection that differs per target.

### (i.10) Native time controls remain; `ngx-mat-timepicker` follow-up is parked

- **WHAT.** Appointment start/end controls remain `<input matInput type="time">`
  (`client/app/creator/appointment-form/appointment-form.component.html:51,72`). The user selected
  `ngx-mat-timepicker` for a future replacement, but the dependency is not installed and the parked
  task was not implemented. That choice is preserved here from the retired local handoff. Alarm
  controls may be considered in that user-initiated follow-up; its scope is not decided by this
  consolidation.
- **WHY ACCEPTED.** Native controls completed the Material form conversion. The timepicker task was
  deliberately parked pending a user request, not silently folded into migration closure.
- **RISK.** Time-entry presentation/interaction varies by browser; native dark-mode mismatch is
  separately recorded in (i.4). This is an unimplemented UI choice, not proof of broken time values.
- **WHAT WOULD CHANGE THE DECISION.** The user opens the follow-up; then add the dependency and
  standalone imports, rebuild the Docker image, and verify keyboard/time-entry and exported values.

### (i.11) Icon-action help is deferred and accessible names are incomplete

- **WHAT.** `MatTooltip` was deferred, not rejected; no tooltip binding or import exists in the client.
  Icon-only buttons lack explicit accessible labels at `creator.component.html:14`,
  `alarm-settings.component.html:14-16,80-82` and `recurring-settings.component.html:19-22`; the
  latter alarm/recurrence icons are explicitly hidden from assistive technology. Other actions,
  including Settings, advanced settings and add/remove exclusion, already have `aria-label`s.
  The historical "six icon-only buttons" is not a verified current inventory.
- **WHY ACCEPTED.** The migration avoided adding unused Material modules and parked tooltip/help work
  as a separate follow-up. Removing copied "Left Align" labels did not complete an accessible-name
  audit; the accessibility lint tier also remains disabled, as recorded in (c.8).
- **RISK.** Some icon actions can be unclear visually and unnamed to assistive technology. Tooltips
  alone do not establish accessible names, keyboard usability or overall accessibility.
- **WHAT WOULD CHANGE THE DECISION.** A user-authorized accessibility/help pass that inventories all
  icon actions, supplies meaningful translated names and appropriate help, and verifies keyboard,
  focus and assistive-technology behaviour in a browser.

---

## (j) i18n CARRY-FORWARD

Carried forward from `docs/2026_MIGRATION_BACKLOG.md` §3, which was itself the only surviving record
of the deleted `docs/TODO-untranslated-strings.md`. Losing an OPEN item here would be the worst
outcome of the consolidation, so all are preserved.

### (j.1) Three Settings labels with conflicting confirmation records (§3(b), OPEN)

- **WHAT.** The iCal-metadata pass (source U6, commit `dd11df7`) added three UI labels with
  agent-proposed values, still present in `client/assets/i18n/en.json:86-88` and `de.json:86-88`:

  | Key | EN | DE |
  |---|---|---|
  | `CALENDAR NAME` | Calendar name | Kalendername |
  | `CALENDAR PRODUCT ID` | Product ID | Produkt-ID |
  | `CALENDAR URL` | Calendar URL | Kalender-URL |

  The retired execution plan's step 1.11 and assumption 9 explicitly called this wording
  **confirmed**, contradicting the carried-forward backlog's "never confirmed" claim. Step 1.11
  also prescribed lowercase EN initials (`calendar name`, `product ID`, `calendar URL`), unlike
  the unchanged current values. The plan's claim is preserved here, not treated as direct user
  confirmation or permission to change capitalization.
- **WHY ACCEPTED.** The documentation conflicts; matching source values or agent-authored plan prose
  alone cannot establish the user's intended wording. No locale values were changed by this review.
- **RISK.** Labels or capitalization may not match the intended terminology; either blanket
  "confirmed" or "never confirmed" wording would hide the conflicting provenance.
- **WHAT WOULD CHANGE THE DECISION.** The user confirms the six current values as-is or supplies
  replacements, including capitalization (edit both locales together to preserve key parity).

### (j.2) The i18n pass was never fully verified at runtime (§3(c), partly OPEN)

- **WHAT.** The 2026-09-11 i18n pass was verified by static analysis and type-check deltas only.
  Four runtime checks were listed. Their state now: (1) rendered date-picker labels — **partly moot**,
  the audited `ng2-datepicker` was replaced by the Material datepicker, so what needs checking is
  Material's own locale-driven labels; (2) legal-notice page text — **CLOSED** by Phase 10.3, which
  rebuilt `legal.component.ts` on `translate.onLangChange`; (3) the collision "excluded by user"
  reason (`translate.instant('EXCLUDED BY USER')`, `appointments.service.ts`) — **no owner, never
  exercised**; (4) the three new Settings fields (U6) — **no owner, never exercised in a running
  app**.
- **WHY ACCEPTED.** The original blocker (the bundle did not build) is gone — `npm run build:prod`
  exits 0 and the artefact is runtime-probed — but items 1, 3 and 4 remain unowned runtime checks
  that a key-parity unit test cannot discharge.
- **RISK.** Three locale-driven strings have never been seen rendered in a running app.
- **WHAT WOULD CHANGE THE DECISION.** A runtime/browser verification pass over the collision reason
  and the three Settings fields in both locales.

### (j.3) Five strings deliberately left untranslated (§3(d), CLOSED BY DECISION — U5 is permanent)

- **WHAT.** Five user-visible strings are intentionally not translated:

  | # | String | Location | Reason |
  |---|---|---|---|
  | U1 | `Open Source` | `about.component.html:12` | loan term, identical in DE |
  | U2 | `Mozilla Public License v2.0` | `about.component.html:13` | proper licence name |
  | U3 | Developer names (Affeldt, Braun, Bernier, Kammer, Richard) | `about.component.html:22-26` | proper nouns, never translated |
  | U4 | `Deutsch` / `English` | `settings.component.ts:105,107` | language endonyms, shown in their own spelling |
  | U5 | `Duely - iCal generator` document title | `client/index.html:5` | **permanent architectural gap** — a static title outside the Angular app; `@ngx-translate` can never translate the browser tab title under the current mechanism |

- **WHY ACCEPTED.** U1–U4 are conventional non-translations. **U5 above all** is a permanent
  architectural gap, not a pending fix.
- **RISK.** The browser tab title is always English.
- **WHAT WOULD CHANGE THE DECISION.** For U5, a runtime `title` service driven by `translate.onLangChange`
  (a feature, not a migration item). U1–U4 need no change.

### (j.4) The stale `LEGAL EDIT HINT` path (§3(e) observation)

- **WHAT.** The user-visible `LEGAL EDIT HINT` tells the reader to "edit the 'content' variable in
  **`static/main.bundle.js`**" in **both** locales (`en.json:11`, `de.json:11`). That path is a
  Webpack-era artefact: `find dist -name "*main.bundle*"` returns nothing, and Phase 6 retired the
  Webpack pipeline for `scripts/build.mjs` + esbuild with hashed asset names.
- **WHY ACCEPTED.** Correcting it is a content change to two locale values; the migration was
  documentation- and code-scoped, not copy-editing. Phase 10.3's `/legal` rebuild was the natural
  moment but did not touch the wording.
- **RISK.** The hint sends users to a file that no longer exists.
- **WHAT WOULD CHANGE THE DECISION.** A copy edit of the two `LEGAL EDIT HINT` values to reference
  the current build output (or, better, to describe editing the legal notice through the app).

### (j.5) Legal-key provenance — preserved answer (§3(e), former plan Correction 11)

`LEGAL DEFAULT MESSAGE` and `LEGAL EDIT HINT` were inside the deleted untranslated-strings
inventory: Section C, items C4/C5, commit `dd11df7`. Their EN values were the previously-hardcoded
strings, so the raw-key rendering was **not** a new translation gap. It resulted from the
`.instant()`-in-the-constructor decision and was **fixed by Phase 10.3** (rebuilt on
`translate.onLangChange`). The stale hint wording remains separately open in (j.4); this provenance
answer survives retirement of both the inventory and execution plan.

---

## (k) REMAINING VISUAL AND FUNCTIONAL VERIFICATION GAPS

### (k.1) Screenshot counts do not establish the full interaction / density matrix

- **WHAT.** The original Phase 2.7/8 contract covered six route states at 375/800/1440 px, light/dark,
  at least two accents, and density evaluation at Electron's **800×600** window size. Pilot sign-off
  was recorded as approved, 72 after-shots were captured, and Phase 13 explicitly used a reduced
  10-shot pass at 1440×900. None of those records should be rewritten as "never attempted".
  However, `e2e/capture-after-shots.cjs:51` fixes height at **900**, and its empty-storage redirect
  branch (`:104-129`) never applies the named theme/accent: those filenames label the same default
  Settings state, not four different theme states. Static captures do not demonstrate dropdown,
  expanded-form or save/cancel interactions at 800×600.
- **WHY ACCEPTED.** The migration closed with recorded pilot approval and the user-approved reduced
  final pass. This is a remaining coverage gap, not a revoked sign-off or proof of a new UI defect.
- **RISK.** Compact-window usability and interactions may be missed even when every PNG exists;
  filename/count-based claims can overstate theme coverage. Accepted appearance defects remain in
  (i), and actual Electron launch / `file://` chunk loading remain unverified in (f).
- **WHAT WOULD CHANGE THE DECISION.** A dedicated browser pass covering the six route states and
  requested widths, light/dark and two accents where settings exist, plus actual 800×600
  interactions with expanded creator forms, dropdowns, persistence and cancel. Check the
  empty-storage redirect as the default state, not as falsely labelled theme/accent variants.

### (k.2) Green E2E counts do not prove date/timezone/recurrence/collision semantics

- **WHAT.** The recorded 16 Playwright passes execute eight tests against two server projects, but
  `e2e/app.e2e.spec.ts` contains coverage gaps:
  - `:101-113` looks for nonexistent `select[name="timeZone"]` and conditionally skips selection/
    assertions when none exists; the actual Settings control is named `timezone` via `formControlName`.
  - `:144-148` is a collision placeholder with only logging, no setup or assertion.
  - `:40-65` checks a download filename and saves the file, but never reads/asserts ICS contents.
  - `:119-139` checks the daily-recurrence selector/panel, not recurring export semantics.
  Thus neither the green E2E count nor static screenshots close all historical date/exclusion/
  holiday, timezone, recurrence-pattern, collision and locale verification obligations.
- **WHY ACCEPTED.** Migration verification restored executable tests and checked routing/rendering;
  substantive test/date and coverage work remains user-gated. This review records the gap without
  altering tests or their reported partition.
- **RISK.** Vacuous tests and view-only checks give false confidence about settings persistence and
  exported calendar values; known production issues in (a.6)–(a.8) can coexist with green E2E output.
- **WHAT WOULD CHANGE THE DECISION.** A user-initiated coverage/test-and-date phase with unconditional
  control assertions, saved/reloaded timezone checks, actual collision fixtures and ICS-content
  assertions for recurring and excluded dates, plus locale checks from (j.2).

### (k.3) General test-coverage and dead-code audit remains parked

- **WHAT.** The retired local handoff recorded a broader test-coverage/dead-code audit in addition to
  the individual red tests and E2E gaps above. No completed general audit is recorded. Phase 7's
  scoped deletion of known dead code is not evidence that the entire application has been audited.
- **WHY ACCEPTED.** The user must initiate and scope the coverage review. The `saveText` option C
  decision in (a.3) is one input, not authorization to delete tests or application code now; the user
  may reconsider option A or widen the review.
- **RISK.** Untested behaviour, vacuous assertions and unreachable code may remain outside the known
  findings. This is an outstanding review obligation, not a claim that unspecified code is defective.
- **WHAT WOULD CHANGE THE DECISION.** A user-authorized audit with non-vacuous behaviour coverage and
  evidence for each dead-code candidate. Any approved test changes must explicitly update the
  recorded baseline through Docker verification rather than silently dropping or skipping failures.
