# Duely — Known Limitations

**Status:** living record of accepted, deferred and upstream-owned limitations, with an approved
remediation plan in [section (n)](#remediation-plan). KL01 is individually approved and ready for
acceptance; all successor tasks remain unapproved.
**Branch:** `dev-v2`. **Authored:** 2026-11-09 by Phase 13 (task #38), the closing phase of the
Bootstrap-to-Material migration.

This file is the durable home for everything the migration deliberately did **not** fix. It was
created when `docs/2026_MIGRATION_BACKLOG.md` was retired, then expanded on 2026-11-09 when the
completed execution plan, Material migration reference, local working-state handoff and migration
task board were consolidated and retired. Unresolved work and items closed *by decision rather than
by repair* remain here. Tracked implementation history stays in Git; the retired local handoff and
task board were git-excluded, so their full session records are not recoverable from Git.
Current developer guidance is in `README.md`, setup/build guidance in `INSTALL.md`, and recorded
verification results in `docs/TESTING_GUIDE.md` §4.

**Every entry states four things:** WHAT the limitation is · WHY it is accepted · WHAT the risk is ·
WHAT WOULD CHANGE THE DECISION.

Sections **(a)–(g)** are the prescribed spine. Sections **(h)–(m)** carry (h) architectural deferrals,
(i) accepted UI defects and user-gated follow-ups, (j) the i18n backlog from the deleted
`docs/TODO-untranslated-strings.md`, (k) remaining visual and functional verification gaps,
(l) the deferred macOS packaging acceptance that moved here from the retired upgrade board, and
(m) what the 2026-11-11 dependency cycle deliberately left held. Section **(n)** owns the
2026-11-11 remediation plan, its task blocks, decision gates, dependencies and issue-coverage ledger.
The plan/reference retirement additions were checked against source at `f527f26`; the local handoff
was reviewed against source at `889b3e5`. The complete 6,276-line local task board was reviewed at
`74a271d`, including its terminal Phase 13 closure and later corrections to earlier OPEN records.
Both migration cycles are complete. The dependency cycle that repaired most of (a), (b.11), (d.4),
(j.2) and (k.2) ran from P0 to R2 and closed on 2026-11-11; its task board
(`docs/TODO_UPGRADES.md`) was retired with it, its measured gate results are in
`docs/TESTING_GUIDE.md` §4, and what it deliberately did not settle is recorded in (m).
The remediation tasks in [section (n)](#remediation-plan) are tracked **here only**, as explicitly
requested by the user; they are not duplicated in `docs/AI_TASKBOARD.md`. That board remains the
existing home for unrelated future work. Accepted and unrelated deferred work remains here.
Those earlier documentation reviews and the remediation-plan publication used existing records;
they did not execute tasks, rerun gates or authorize Git operations. The subsequent individual KL01
approval and its fresh Docker baseline are recorded [below](#kl01-evidence). That reconciliation
supersedes old live-sounding counts, locations and blockers without erasing their historical
provenance. No application/dependency change or successor execution follows from KL01.

> **Line-number note.** Original closure citations were re-verified at `1f6fd97`; subsequent
> consolidations have their own source checkpoints above. Line numbers can drift. The preserved
> Phase 13 verification snapshot is in `docs/TESTING_GUIDE.md` §4, not a live migration task board.

---

## (a) TEST-AND-DATE WORK — REPAIRED OR CLOSED BY THE 2026-11-11 CYCLE

The migration's locked decisions 3 and 9 barred test work and modernisation within that completed
cycle. The separately authorized dependency cycle allowed both, and executed them: A3 replaced the
`saveAs` seam, P1C/P1F/P1E/P1W added the regression guards, D1 repaired the export and ordinal
defects, and D2 converted the date library and repaired the form/UNTIL defects. What remains in this
section is (a.2)'s retained time policy, (a.3)'s coverage decision, and the two untouched refactors
(a.9) and (a.10).

The recorded migration-closure baseline was **24 failed / 49 passed (73 total)**, failing-name md5
`172d78996b50c84e38211b529d76ab0b`. That is historical evidence now: the current gate target is
**2 failed / 131 passed (133)** with exactly two accepted names (see (m)), and the measured record of
every gate is in `docs/TESTING_GUIDE.md` §4.

### (a.1) `saveAs` test seam — REPAIRED by A3 (2026-11-10)

Remediation: [KL06](#kl06), [KL21](#kl21), [KL31](#kl31); preserve repaired history in [KL01](#kl01).

The three storage specs now pass under Vitest 4 without a production seam, and an isolated negative
control still kills them, so the pass is not a declared or inert mock. No injectable `saveAs` boundary
was added, so the no-argument storage factory is unchanged. Assertions cover the call, filename, MIME
type and content; see the A3 record in `docs/TESTING_GUIDE.md` §4.

### (a.2) Collision assertion loops — repaired by P1C; the 2032 oracle stays red by policy

Remediation: [KL08](#kl08) contract decision, then [KL09](#kl09); loop repair remains historical.

Both loops now assert cardinality and every indexed date and reason, and the preserved 15-date
Niedersachsen/Augsburg 2032 union is checked entry by entry. Repairing the loops exposed what the old
index-0 loop hid: the holiday test compares raw country-midnight instants while `RecurrencePattern`
copies the event's **host-local** time of day onto the holiday Dates. That time policy was
deliberately retained (D1 and D2 changed neither the collision nor the holiday policy), so this one
test remains red and is one of the two accepted failing names in (m). Making it green is a contract
decision, not a test fix; the fixtures must not be rewritten to match the policy.

### (a.3) `creator.component.spec` `saveText` — decided option C (backlog §1(d))

Remediation: [KL06](#kl06), [KL07](#kl07). The new planning decision selects realistic positive
coverage instead of deletion under option C; the historical record below is preserved, not a repair claim.

**KL01 factual correction:** the current spec imports the appointment-form components. It does not
settle/render the asynchronously seeded form and drive its validation after changing only the model
summary, so the old "never instantiates" wording is too absolute. The AppointmentsService provided
by CreatorComponent is also separate from the TestBed service targeted by `getICalString`'s spy.
The test remains red; KL06 owns realistic positive coverage at the actual injector/form boundary.

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
- **STATUS 2026-11-11.** The dependency cycle did not change this decision, so the test is one of the
  two accepted failing names in (m).

### (a.4) Mixed `untilDate` representations — REPAIRED by D2 (2026-11-10)

Remediation: [KL08](#kl08), [KL10](#kl10) for unresolved semantics; representation repair is retained.

`untilDate` now crosses one explicit date-only boundary instead of mixing a `YYYY-MM-DD` seed, a
local-midnight picker Date and a Moment computation value, and the default 100-year value is emitted
as the date-only `2126-11-10`. P1F's characterization guards the first reveal, reopening and exported
values.

Two boundary semantics remain **characterized rather than resolved**. The exported rule keeps the
selected day's **midnight** cutoff (`UNTIL=20320210T000000`), so a 09:00 occurrence on that last day is
excluded, and a supplied all-day boundary is passed through as an exclusive DTEND per RFC 5545. The
guard is deliberately named "not an invented end-of-day policy": inclusive last-day or whole-day
semantics would be a product decision no task has taken.

### (a.5) Reverse-date start-time anomaly — REPAIRED by D2 (2026-11-10)

Remediation: [KL01](#kl01) preserves the repair; [KL10](#kl10)/[KL12](#kl12) retain regression guards.

The reverse-end-date branch now re-reads the start after the same-month day correction, so the
22:00 → 23:00 model shift is gone. P1F's guard ("moving the end date backward must retain an already
valid 22:00 start") passes in UTC and in Europe/Berlin.

### (a.6) Nineteen appointments-service failures — REPAIRED by D1 (2026-11-10)

Remediation: [KL01](#kl01) preserves history; [KL06](#kl06)/[KL39](#kl39) retain public-export guards.

All nineteen historical failures left the red set with `ical-generator` 11.1.3: the `'floating'`
sentinel maps onto the library flag instead of a literal `TZID=floating`, ordinals are emitted as
`BYDAY` + `BYSETPOS` (v11 rejects the `2WE` prefix at runtime), alarms use
`repeat: {times, interval}`, and an empty exclusion set emits no `EXDATE`. 48 baseline failures were
repaired with none added. The package bump alone would not have done it: the boundary and ordinal
repairs are application changes, and P1E's public-flow guards prove them.

### (a.7) Serialized dates at the collision boundary — REPAIRED by D1 (2026-11-10)

Remediation: [KL01](#kl01) preserves the adapter repair; [KL09](#kl09) guards the evolving boundary.

`appointments.service.ts` no longer casts `ev.toJSON()` to Date-valued `EventCollisionData`; the
values pass through a typed `toCollisionData()` adapter, so recurrence code receives Dates and
`eventData.start.getHours is not a function` is gone. P1E's exclusion, holiday and COUNT guards cover
that boundary.

### (a.8) UNTIL picker hydration — REPAIRED by D2 (2026-11-10)

Remediation: [KL01](#kl01) preserves history; [KL10](#kl10)/[KL12](#kl12) retain hydration guards.

The recurrence settings hydrate the saved UNTIL through `pickerDayFromWallValue`, so first reveal and
reopening show the saved calendar day (April 3, 2032 in the guard) without a timezone shift, and the
explicit OnPush notification is retained.

### (a.9) Load-bearing reactive-form / `ngModel` dual bindings

Remediation: [KL12](#kl12); optional reactivity choices [KL35](#kl35).

**KL01 current classification:** synchronization remains load-bearing. Six shell/page components
use `ChangeDetectionStrategy.Eager`; the four creator-family forms still use OnPush and the app
explicitly provides zone-based change detection. Current parent-driven recurrence updates/marks
are at `appointment-form.component.ts:185–186,226–227`; UNTIL model/control updates at `:218–219`;
`ngAfterViewChecked()` calls `updateRepeatsBy()` at `recurring-settings.component.ts:168–169`.
These locations supersede the older citations below; KL01 does not refactor notification ownership.

- **WHAT.** The creator-family forms still combine `formControlName` and `[(ngModel)]` across
  advanced, alarm, appointment and recurrence settings. For example,
  `client/app/creator/appointment-form/appointment-form.component.html:6` binds the summary through
  both mechanisms. This synchronization keeps the `Appointment` model used for ICS generation in
  step with form edits. The retired plan's historical "53 bindings" is not a current inventory.
  The recorded UNTIL update at `appointment-form.component.ts:227` also relies on the paired
  `ngModel` binding's `NgModel._updateValue()` calling `markForCheck()` under OnPush;
  `FormControlName` supplies no such notification. The Phase 11 review corrected that attribution
  in `c24818c` after inspecting Angular 20.3.18. Parent-driven `updateRepeatsBy()` calls at
  `appointment-form.component.ts:188-189,234-235` explicitly mark the recurrence view afterward.
  Keep that notification outside `updateRepeatsBy()`: `recurring-settings.component.ts:155-156`
  also calls it from `ngAfterViewChecked()`, so an unconditional mark inside it would repeatedly
  dirty the view during change detection. This placement safeguard survives the retired task board.
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

Remediation: [KL07](#kl07), [KL15](#kl15) for public-behavior testing and method privacy.

**KL01 current classification:** the public implementation detail remains at
`appointments.service.ts:100`, with its spy at `appointments.service.spec.ts:435`. The consuming
spec now passes; the old "deferred-red consuming test" rationale is historical. Privacy still
requires separately approved public-behavior coverage, not a cast or an unverified modifier edit.

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

Remediation: [KL23](#kl23), with defaults and blank-field behavior decided separately.

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

Remediation: [KL21](#kl21) meaningful harness coverage, not a production icon repair.

**KL01 current count:** 74 messages, matching R2's raw unit log. The 44/73 figures below remain
historical; `provideDuelyIcons()` is currently at `app.config.ts:72`. No providers or warnings were
changed to silence the capture.

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
- **WHAT WOULD CHANGE THE DECISION.** No production repair is needed. The exact **44** count belongs
  to the historical migration baseline, not a permanent gate; A3 measured **73** once more specs
  executed and attributed the change to real renders, suppressing nothing. Adding icon providers
  solely to silence output is still not a repair.

### (b.3) CommonJS/AMD optimization-bailout specifiers — historical five, current three

**KL01 current classification:** current dependency/bundle limitation. The original five-specifier
WHAT/WHY and I2/A4 records below describe earlier trees, not the post-D2 application. Importing-file
attribution may vary; package identities, not a warning-row count, are the comparison boundary.

Remediation: [KL13](#kl13), [KL14](#kl14), [KL15](#kl15), [KL16](#kl16) for holiday architecture;
[KL31](#kl31) for FileSaver; [KL01](#kl01) reconciles historical specifier descriptions.

- **WHAT.** The production build reports CommonJS/AMD optimization bailouts for **five dependency
  specifiers**: `moment-timezone`, `moment`, `file-saver`, `deepmerge` (via `date-holidays-parser`
  `utils.js`) and `uuid-random` (via `node_modules/ical-generator/dist/index.js`, which Webpack never
  reported). The historical sixth, `jalaali-js`, left the list in D3/I2 because 2.0.1 ships an ES
  module. **Cite the dependencies, never a count.**
- **WHY ACCEPTED.** All five are upstream CJS packages with no ESM entry point; nothing in this
  repository can convert them. The esbuild message text is
  `▲ [WARNING] Module '<dep>' used by '<file>' is not ESM`.
- **RISK.** A slightly larger, less-tree-shaken bundle. No correctness impact.
- **WHAT WOULD CHANGE THE DECISION.** Upstream shipping ESM builds, or replacing the dependency.
  **The count is nondeterministic and must never be gated on:** the CLI dedups per specifier over a
  nondeterministic traversal order, and the *named* importing file varies run to run
  (`creator.component.ts` vs `settings.component.ts` for `moment-timezone`; `web-storage.service.ts`
  vs `electron-storage.service.ts` for `file-saver`). A single `ng build` reports 5; `build:prod`
  (two builds) reports 10.
- **MEASURED STATE.** I2 dropped `jalaali-js` and kept the other five. A4 (Angular 22.2.5 / build
  22.2.6) reports the same five specifiers in both production builds, unchanged, with zero budget
  warnings at a 2.40 MB initial total. `moment-timezone` is still one 0.6.6 copy, so the
  `caldate`/`Equinox` import sites recorded in (h.5) still surface under a single specifier.
- **D2 STATE (2026-11-10).** The production list is now **three** specifiers — `deepmerge`, `file-saver`
  and `moment-timezone` — because no application file imports `moment` any more, so its bailout
  disappears; the development build reports none. The client's own date library
  (`date-fns` 4.4.0 / `@date-fns/tz` 1.5.0) ships ESM, so it never appears here. `moment-timezone`
  remains solely because `date-holidays` → `date-holidays-parser` → `caldate` requires it; the count is
  still nondeterministic in the importing-file field and must not be gated.

### (b.4) Four retained unreachable environment files — with ZERO compiler warnings

Remediation: [KL33](#kl33) desktop design, then [KL34](#kl34) approved retention/deletion.

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

Remediation: [KL40](#kl40) fallback/status policy and licence distribution/exposure.

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

Remediation: [KL02](#kl02) targets/support policy and [KL36](#kl36) actual coverage.

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

Remediation: [KL32](#kl32), including the option to retain native feedback explicitly.

- **WHAT.** `client/app/creator/creator.component.ts:70` still calls
  `alert(this.translate.instant('INVALID INPUTS'))` rather than a Material snackbar.
- **WHY ACCEPTED.** The creator conversion (`0d53dfb`) deliberately retained native feedback;
  replacing it was not required for the structural migration.
- **RISK.** The alert blocks interaction and uses browser/OS presentation rather than the app theme;
  no new validation defect is demonstrated.
- **WHAT WOULD CHANGE THE DECISION.** A user-authorized feedback/UI change with invalid-form and
  accessibility verification; do not introduce `MatSnackBar` merely to close this record.

### (b.8) Two non-blocking build-script robustness findings remain unauthorized

Remediation: [KL22](#kl22) termination/disposal contracts and diagnostics.

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

Remediation: [KL34](#kl34) separately approvable low-risk comment scope.

- **WHAT.** `client/styles.scss:2-4` says `@use` must precede the legacy `@import`s below, although
  the three directives at `:5-7` are all `@use`. Phase 4 assigned this wording correction to Phase 13,
  but the current source still contains it.
- **WHY ACCEPTED.** Comment-only wording was excluded from the functional Sass conversion and was
  not repaired by closure. This review changes documentation, not source comments.
- **RISK.** Misleading guidance for a future stylesheet edit; no runtime or Sass compilation impact.
- **WHAT WOULD CHANGE THE DECISION.** A scoped comment correction retaining the actual module-order
  requirement without referring to nonexistent imports.

### (b.10) Unused palette helper families remain alongside live label classes

Remediation: [KL34](#kl34) proved helper cleanup; live token/palette behavior [KL27](#kl27).

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

### (b.11) Express runtime/type skew — REPAIRED by C1 (2026-11-10)

Remediation: [KL01](#kl01) preserves repaired history; [KL40](#kl40) retains server regression evidence.

Root and server runtime manifests and the root typings now agree: Express **5.3.0** in both, with
`@types/express` 5.0.6 and compression 1.8.2 unchanged. No `server/app.ts` edit was needed — the
accepted fallback and missing-asset policies are Express-5 compatible as written — and the 18-case
probe matrix (routes, deep links, absent assets, error responses, compression, licence artefact)
matched the pre-upgrade status, bytes and body hashes. The only differences are four `mime-types@3`
header spellings, e.g. `charset=UTF-8` → `utf-8`, `application/javascript` → `text/javascript` and
`image/x-icon` → `image/vnd.microsoft.icon`. The `proxy-addr` critical advisory left the tree with the
upgrade.

### (b.12) The lint presets now come from the `angular-eslint` umbrella package (recorded 2026-11-10 by A4)

**KL01 current classification:** supported configuration, not an outstanding ESLint-10 upgrade.
Root ESLint is already 10.14.0. The config header's ESLint-9 and `node10` descriptions and the
"future A5" wording below are historical; live Node-side configs use `node16`. No rule changes
or source-comment edits are included in KL01.

Remediation: [KL05](#kl05), [KL19](#kl19) coherent dependency/configuration compatibility;
[KL01](#kl01) checks historical ESLint-version wording.

- **WHAT.** In angular-eslint **22.6.0** the plugin packages
  (`@angular-eslint/eslint-plugin`, `-template`, `template-parser`) export **only** `{rules}`. The
  `configs.recommended` shape that v21 still carried is gone, so `eslint.config.js` raised
  `TypeError: Cannot read properties of undefined (reading 'recommended')` until it switched to
  `require('angular-eslint')` and read `configs.tsRecommended.rules` /
  `configs.templateRecommended.rules`. `angular-eslint` is therefore a new **direct devDependency**,
  pinned to the same 22.6.0 as the plugins.
- **WHY ACCEPTED.** The move is upstream-owned; the alternative is re-declaring the same rule lists by
  hand, which would silently drift from the published preset. Rule outcomes are unchanged: 0 errors
  and the same 7 `no-deprecated` warnings as I2.
- **RISK.** The lint config now has a fourth pinned package that must move in lockstep with the three
  plugins; a partial bump will fail at config load rather than at lint time, which is loud but abrupt.
- **WHAT WOULD CHANGE IT.** An angular-eslint release that restores presets on the plugin packages, or
  a future A5 (ESLint 10 + typescript-eslint) rewrite that builds its own flat config from the
  plugin's `rules`/`tsPlugin`/`templatePlugin` exports.

### (b.13) TypeScript 6 resolution conventions for the Node-side projects (recorded 2026-11-10 by A4)

Remediation: [KL05](#kl05), [KL19](#kl19); preserve supported resolution, not a rollback task.

- **WHAT.** TypeScript 6 removes the `node10` module resolver (`TS5107`) and deprecates `baseUrl`
  (`TS5101`). A4 aligned the three affected places instead of silencing the diagnostics:
  `server/tsconfig.json` and `electron/tsconfig.json` now use `"module": "node16"` /
  `"moduleResolution": "node16"` while keeping CommonJS output, the empty `baseUrl` in
  `client/tsconfig.spec.json` is deleted (nothing used it), and the E2E type gate passes
  `--ignoreConfig` when it compiles a bare file list next to a `tsconfig.json` (`TS5112`).
  **No `ignoreDeprecations`, `as any` or `@ts-ignore` was added.**
- **WHY ACCEPTED.** These are the compiler-supported migration paths for the removed/deprecated
  options; keeping the old resolver required a suppression that the task forbids, and staying on
  `node10` would silently break at TypeScript 7.
- **RISK.** `node16` resolution is stricter about self-referencing and `exports` maps than `node10`.
  Both Node-side projects build cleanly today, but a future import that relies on legacy resolution
  will fail at type-check time rather than at runtime (the louder, preferred failure).
- **WHAT WOULD CHANGE IT.** D4/E1 changing the server/Electron build tool or module format, or a
  TypeScript release that replaces `node16` with a `nodenext`-only story. Re-run the four `tsc`
  project gates plus the E2E file-list check whenever those configs move.

### (b.14) Vitest 5.1.0 mock hoisting false-positives on async arrows (recorded 2026-11-10 by A2)

Remediation: [KL21](#kl21) builder-path reproduction/conditional removal; [KL05](#kl05) runner maintenance.

- **WHAT.** `@vitest/mocker` now validates that `vi.mock` / `vi.hoisted` calls are registered at a
  module's top level and rejects the file at transform time with `Error: N calls in "<file>" were
  defined outside of the module's top level scope` when they are not. Under the Angular 22.2.6
  `@angular/build:unit-test` pipeline this validation **false-positives**: a module whose hoisted calls
  are correctly top-level is still rejected if the same module also declares an **async arrow function**
  (for example an `it('…', async () => …)` callback). Async **function declarations** and async
  **function expressions** pass, and removing the `async` keyword makes an arrow pass. A2 measured this
  with 21 probe variants before changing any product code; both `storage/*.service.spec.ts` files were
  affected because they combine `vi.mock('file-saver')` + `vi.hoisted` with async assertions.
- **WHY ACCEPTED.** The workaround keeps every assertion: the awaited body moved into a module-level
  `async function verifySavedFile(...)` and the `it` callback is synchronous and returns that promise.
  This is ordinary test code, not a suppression — no `as any`, no `@ts-ignore`, no reduced assertion.
  5.1.0 is the newest published 5.x at the time of the upgrade, so there is no patch release to wait
  for; staying on Vitest 4 was not an option because A2's task is the runner upgrade itself.
- **RISK.** Any future spec that registers `vi.mock`/`vi.hoisted` and uses an async arrow will fail at
  transform time with a misleading "outside the module's top level scope" message that points at the
  correct calls. The failure is loud (the whole file fails to load), never silent, so it cannot pass as
  green. A reader who trusts the message could waste time restructuring correctly-placed mocks.
- **WHAT WOULD CHANGE IT.** A Vitest release that fixes the scope analysis (check
  `@vitest/mocker`'s hoisting validation against a minimal async-arrow plus `vi.mock` reproduction, run
  through the Angular builder rather than a bare Vitest config, before removing the helper). If a future
  spec must use an async arrow, prefer an `async function` declaration for the awaited part; do not
  disable `vi.mock` hoisting or move mocks into the test body.

---

## (c) DECLINED MODERNISATION (locked decision 9)

Decision 9's declined-modernisation list is **closed and exhaustive**. Each item below was verified
as *not deprecated* or *not worth the churn*; none is a defect.

### (c.1) The class-based `CanActivate` guard

Remediation: [KL35](#kl35) evidence-based keep/change/defer reconsideration.

- **WHAT.** `auto-redirect.guard.ts` uses a class-based `CanActivate` guard rather than a functional
  guard.
- **WHY ACCEPTED.** `CanActivate` is **NOT deprecated** — it carries no `@deprecated` tag at
  `node_modules/@angular/router/router_module.d.ts`. Functional guards are an alternative, not a
  replacement.
- **RISK.** None. **WHAT WOULD CHANGE IT.** A future Angular major actually deprecating the
  interface.

### (c.2) Redundant explicit `standalone: true` on all 10 components

Remediation: [KL35](#kl35); retaining harmless explicitness remains a valid decision.

- **WHAT.** Every component still spells `standalone: true` even though it is the default in
  Angular 20.
- **WHY ACCEPTED.** Harmless and explicit; removing it is churn with no benefit.
- **RISK.** None. **WHAT WOULD CHANGE IT.** Nothing.

### (c.3) Zero signal usage across 42 non-spec client files

Remediation: [KL35](#kl35) optional reactivity choices; actual form state ownership [KL12](#kl12).

- **WHAT.** No Angular signals are used anywhere.
- **WHY ACCEPTED.** A signals migration is a large behavioural refactor, squarely barred by decision
  9.
- **RISK.** Missing out on finer-grained reactivity. **WHAT WOULD CHANGE IT.** A dedicated,
  user-authorised modernisation phase.

### (c.4) `storage.factory.ts:22,25` instantiating services with `new`

Remediation: [KL35](#kl35) optional DI reconsideration; actual desktop/save needs [KL33](#kl33).

- **WHAT.** The storage factory returns `new ElectronStorageService()` / `new WebStorageService()`
  rather than using DI.
- **WHY ACCEPTED.** Deliberate: the factory selects an implementation at the provider boundary, and
  both services have no-arg constructors.
- **RISK.** None functional. **WHAT WOULD CHANGE IT.** A DI refactor of the storage layer.

### (c.5) Two missed `import type` opportunities

Remediation: [KL35](#kl35) reconsideration; approved small type-only cleanup [KL34](#kl34).

- **WHAT.** `appointment.ts:5` (`import { RecurringSettings }`) and `appointments.service.ts:18`
  (`import { AlarmData }`) import types without the `type` keyword.
- **WHY ACCEPTED.** Cosmetic; `verbatimModuleSyntax` is not enabled, so there is no runtime cost.
- **RISK.** None. **WHAT WOULD CHANGE IT.** A lint rule or a tidy-up pass.

### (c.6) `@angular-eslint/prefer-inject` DECLINED and turned OFF

Remediation: [KL35](#kl35); no framework-wide DI rewrite is automatically authorized.

- **WHAT.** The constructor-injection → `inject()` DI modernisation is not adopted; the rule is
  `off` in `eslint.config.js:244`.
- **WHY ACCEPTED.** **User decision 2026-10-30** (decision 9 extension). Declining it eliminated 34
  errors (baseline 607 → 573) without a rule-downgrade campaign on real violations.
- **RISK.** None. **WHAT WOULD CHANGE IT.** A user reversal of the decision.

### (c.7) The `no-deprecated` warnings deliberately left untouched

Remediation: [KL21](#kl21) router tests, [KL20](#kl20) animations, [KL31](#kl31) autoBom,
[KL19](#kl19) future compatibility; warnings are tracked by identity, not historical totals.

- **WHAT.** `@typescript-eslint/no-deprecated` is severity `warn` and reports, measured on the A4 tree
  (Angular 22.2.5 / TypeScript 6.0.3), **7** advisories: `RouterTestingModule` ×4,
  `provideAnimationsAsync` (intent to remove in v23), and `saveAs` `autoBom` ×2. The eighth —
  the `ApplicationConfig` import path — is gone because the 22 migrations rewrote the import.
- **WHY ACCEPTED.** Warnings do not affect the lint exit code (`npm run lint` exits 0). Each is
  either a not-yet-removed API or a spec-side usage barred by decision 3.
- **RISK.** Advisory only — these APIs will need attention at a future Angular major.
- **WHAT WOULD CHANGE IT.** The Angular 23 phase (see (e)), or a spec waiver for
  `RouterTestingModule`.

### (c.8) The template-accessibility lint tier (11 rules) left DISABLED

Remediation: [KL28](#kl28), including approved standards and real interaction evidence.

- **WHAT.** `@angular-eslint/template/accessibility` (11 rules) is **not** enabled; template linting
  runs only the 3-rule `recommended` tier.
- **WHY ACCEPTED.** **User decision 2026-10-30.** Task #33's spec scoped template linting to the
  parser + recommended tier and never named accessibility; enabling an unscoped tier would have
  inflated the baseline Phase 10 inherited.
- **RISK.** **The 0 findings across the 11 templates must NEVER be cited as evidence of
  accessibility.** Template accessibility is effectively unlinted.
- **WHAT WOULD CHANGE IT.** A user decision to enable the tier — a one-line spread of
  `angularEslint.configs.templateAccessibility.rules` into the template block of `eslint.config.js`
  (angular-eslint 22 keeps the accessibility preset on the umbrella package, see (b.12); the v21
  form `ngTemplatePlugin.configs.accessibility.rules` no longer exists).

---

## (d) UPSTREAM-OWNED

### (d.1) Historical Moment retention — application replaced; upstream footprint remains

**KL01 current classification:** application replacement is repaired; the holiday backend still
carries Moment. The D2 paragraph's open moderate advisory is superseded by R2 in (d.6), not current.
The D2 and pre-D2 measurements below remain historical evidence.

Remediation: [KL13](#kl13), [KL14](#kl14) for the upstream footprint. App replacement is historical;
[KL01](#kl01) reconciles superseding addenda, including R2's repaired Moment advisory.

- **WHAT.** At `74a271d`, **15** client TypeScript files import Moment: 10 from `moment-timezone`
  and 5 from `moment` (12 non-spec files and 3 specs). Moment is officially in maintenance mode.
- **WHY ACCEPTED.** Replacement was excluded from the completed migration under decision 9. The
  separately authorized upgrade cycle first selected Luxon; the user then chose
  `date-fns` + `@date-fns/tz` instead and its D2 task implemented that — see the addendum below.
- **RISK.** Maintenance mode limits new feature development and leaves a large dependency footprint;
  it does not establish that timezone-data updates have stopped. No Europe/Berlin offset mismatch
  was found in the historical probes in (h.3), not an exhaustive correctness guarantee.
- **WHAT WOULD CHANGE IT.** The date-handling phase migrating to a maintained library.
- **D2 ADDENDUM (2026-11-10) — REPLACED, with a reviewed upstream remnant.** D2 converted the
  application to `date-fns` 4.4.0 + `@date-fns/tz` 1.5.0 (the user's decision, superseding the earlier
  Luxon wording) and removed `moment-timezone` from the root `dependencies`;
  the lock gained exactly `date-fns` and `@date-fns/tz` and lost no entry. No file under `client/`,
  `server/`, `electron/` or `e2e/` imports Moment any more (66 sources scanned, 0 imports; the 16
  remaining mentions are comments). `moment` 2.30.1 and `moment-timezone` 0.6.6 stay in the lock only
  through `date-holidays` 3.39.1 → `date-holidays-parser` 3.7.0 → `caldate` 2.1.0, which declares
  `"moment-timezone": "^0.6.6"`; the production build still reports `moment-timezone` via
  `caldate/src/CalDate.js`, so the moderate
  `moment` locale-path advisory stays open as an upstream-owned remnant. The Settings timezone list moved
  from `moment.tz.names()` (**597**) to `Intl.supportedValuesOf('timeZone')` (418 canonical + `UTC` =
  **419**, plus a saved alias when the stored value is one), and every persisted name still resolves.
  See (h.3)'s D2 addendum for the trimmed-build question.

### (d.2) Deprecated `boolean@3.2.0` in the lock tree (`rimraf@2.6.3` REMOVED)

Remediation: [KL05](#kl05) optional tooling; [KL17](#kl17) may alter Electron's chain.

**KL01 current classification:** optional-tooling constraint, not a runtime repair. The live direct
`rimraf` pin/resolution is 6.1.4; the 6.1.3 figure below is historical. KL01 did not reinstall or
restore pruned Windows nodes.

- **WHAT.** `boolean@3.2.0` (dev, optional; via `electron → @electron/get → global-agent`) is
  npm-deprecated and remains in `package-lock.json`. **Correction:** `rimraf@2.6.3` — which the
  backlog also listed — is **no longer present**: it sat inside the win32-only `electron-builder`
  optional subtree that Phase 2 pruned. The only `rimraf` in the tree today is **6.1.3**, a direct
  devDependency (`package.json` `clean` script), which is not deprecated.
- **WHY ACCEPTED.** `boolean` is a transitive optional dependency of the Electron toolchain with no
  direct upgrade path.
- **RISK.** A deprecation warning at install; no runtime surface (it is dev/optional).
- **WHAT WOULD CHANGE IT.** An upstream `global-agent`/`@electron/get` release that drops it. The
  closed dependency cycle did not touch it.

### (d.3) Deprecated animations package — retention depends on actual usage, not a mandatory peer

Remediation: [KL20](#kl20) actual provider/runtime contract and targeted acceptance.

- **WHAT.** `@angular/animations ^20.3.18` is npm-deprecated. The lockfile marks its
  `@angular/platform-browser@20.3.18` peer **optional**, correcting the former mandatory-peer claim.
  The app still supplies `provideAnimationsAsync()` (`client/app/app.config.ts:22,46`).
- **WHY ACCEPTED.** Removing an optional peer is not proof that the current animation/provider path
  works without it; retention must follow actual application and Material usage.
- **RISK.** A deprecation warning; premature removal can break the configured runtime path.
- **WHAT WOULD CHANGE IT.** Reviewing the selected versions' peer/API contract and exercising the
  Material controls before changing packages or providers. A3/A4 did exactly that and kept the package
  (see the addendum). Do not assume later majors automatically fold this API into the platform.
- **A4 ADDENDUM (2026-11-10).** A3/A4 answered the question the other way: the package is **retained**
  at `@angular/animations` **22.2.5** because `client/app/app.config.ts` still supplies
  `provideAnimationsAsync()` and the Material controls it drives are exercised by the E2E gates. npm
  marks it deprecated in v22, naming `animate.enter`/`animate.leave` as the successor; adopting that
  API would change animation behaviour across every Material overlay and is **not** part of A4. The
  dependency stays a direct pin until a task explicitly owns that migration.

### (d.4) Runtime engine alignment — RESOLVED by B0/A4/D4/E1 (2026-11-10)

Remediation: [KL02](#kl02), [KL17](#kl17), [KL19](#kl19) future support/runtime compatibility;
[KL01](#kl01) preserves repaired alignment and historical measurements.

All three manifests declare `node ^26.0.0` / `npm ^11.20.0`, which already satisfies Angular 22's
`^22.22.3 || ^24.15.0 || >=26.0.0`, so A4 needed no engine edit; `npm ci --engine-strict` accepts the
regenerated lock in both image stages on container Node 26.13.0. D4 aligned the root Node typings
(`@types/node` 26.6.6, both `types: ["node"]` gates 0), and E1 measured the two runtimes separately:
Electron 45.2.3 embeds Node 24.22.2 / Chromium 156.0.8078.80, which `engines` neither covers nor can
cover because the `electron` devDependency pins it, while the packaged main process needs only
`electron`, `fs`, `path` and `url` from that runtime. The Windows optional-node pruning was never
authorized and stays conditional.

### (d.5) The `date-holidays` low advisory has no upstream fix (recorded 2026-11-10 by D3)

Remediation: [KL03](#kl03) exposure assessment, [KL13](#kl13)/[KL14](#kl14) strategy/remedy.

**KL01 current classification:** the low `date-holidays`/parser/`deepmerge` finding remains in the
fresh audits. The old "only real remedy" upstream claim is not an architectural restriction:
KL13 may compare retention, replacement or a narrowly owned compatible patch, with parity and
maintenance evidence. No new remedy, override or residual-risk acceptance is approved in KL01.

- **WHAT.** `npm audit` reports `date-holidays` (low) → `date-holidays-parser` (low) → `deepmerge` (low,
  `GHSA-gcqx-w48m-w2h4`, prototype poisoning in `mergeObject()`). Upgrading date-holidays 3.27.0 →
  3.39.1 leaves the chain intact: the full audit reads 48 → 48, and npm's only proposed "fix" is
  `date-holidays@1.8.4`, a semver-major **downgrade** that is not executable. The upgrade does clear an
  unrelated `js-yaml` high from the production scope (8 → 7), because date-holidays-parser 3.7.0 pins a
  non-affected nested `js-yaml@5.5.0`.
- **WHY ACCEPTED.** The merge operates on the package's own bundled rule data; Duely only passes
  country/state/region codes, a language and a year into `Holidays.init()`/`getHolidays()`, so no
  application-level object is merged.
- **RISK.** A future date-holidays release that updates `deepmerge` is the only real remedy; until then
  the low finding stays visible in every audit and must not be "fixed" by a downgrade or an override
  pinning deepmerge across unrelated consumers.
- **WHAT WOULD CHANGE THE DECISION.** An upstream date-holidays/parser release that moves off
  `deepmerge`, or independent evidence that untrusted data can reach the merge path.

### (d.6) Residual advisories, container findings and platform scope (recorded 2026-11-11 by E2)

Remediation: [KL03](#kl03), [KL04](#kl04), [KL05](#kl05), [KL17](#kl17) for npm/image/runtime risks;
[M1](#m1), [KL37](#kl37), [KL38](#kl38) platform scope. R2 repairs remain historical.

- **WHAT.** E2 reproduced the accepted tree from scratch and measured three separate surfaces.
  **Development tree:** `npm audit` reads `0 critical / 4 high / 17 moderate / 3 low = 24`, the same set
  I3 accepted; the four highs are transitive tool findings — `browserslist` (two unbounded-stats
  advisories), `fast-uri` (authority/path parsing), `immutable` (hash-collision DoS) and `js-yaml`
  (merge-key DoS) — reached through `@angular/build`, `eslint` and `electron-builder`. **Shipped set:**
  `npm audit --omit=dev` reads `0 critical / 0 high / 1 moderate / 3 low = 4` (the `date-holidays` chain of
  (d.5) plus a `moment` moderate), and the audit run inside the production image returns the same shape.
  **Container:** `aquasec/trivy` on the production image reports `0 critical` and 54 high — 48 rows for
  Debian 13.7 base packages (Debian lists a fixed version for 2 of them) and 6 for `undici@6.28.0` and
  `brace-expansion@5.0.9` inside `/usr/local/lib/node_modules/npm`, i.e. npm's own bundled modules in the
  base image, not the application's dependencies.
- **WHY ACCEPTED.** E2's scope is the accepted lock and accepted images; it may not change either. The
  four development highs are tool-only and unreachable from the shipped application; the container rows
  belong to the base image (`node:26-slim`), where only a refreshed tag or Debian/npm release can move
  them. `npm` reports a fix path inside its own ranges for the tool highs, and no override exists for any
  of them.
- **RISK.** The development findings are visible in every audit and will resurface in reviews; the
  container rows mean the image carries known high-severity base-system and npm-bundled packages, even
  though nothing from the application's dependency tree is high or critical. Both are supply-chain noise
  around the shipped code rather than a defect in it, but they are not zero.
- **WHAT WOULD CHANGE THE DECISION.** A later task that may touch the lock and can show a clean install
  after updating the tool chain (`browserslist`, `fast-uri`, `immutable`, `js-yaml` parents), or a base
  image refresh that carries the Debian and npm fixes. `docker scout` needs a Docker ID login in this
  environment, so a second scanner is available only with credentials.
- **TRIGGERED 2026-11-11 by R2.** The decision above was exercised: a lockfile-only refresh
  (`npm audit fix --package-lock-only`, no manifest key changed) reinstalled cleanly with no peer
  override and moved the **development tree to `0 critical / 0 high / 15 moderate / 3 low = 18`** and
  the shipped set, including the audit inside the production image, to **`0 critical / 0 high /
  0 moderate / 3 low = 3`**. The four high findings and the `moment` moderate are gone; what remains
  is the dev-only ESLint/electron-builder tooling chain whose only offered fix is a downgrade, and the
  `date-holidays` chain of (d.5). The container rows stand unchanged, because the base image did not
  move (the production image's base layers are byte-identical to E2's), so the recorded "re-scan on the
  next base-image bump" rule still governs them. The refresh was lockfile-only: `package.json` stayed
  byte-identical and exactly ten transitive patch bumps entered the lock, with no additions or
  removals. The full gate record is in `docs/TESTING_GUIDE.md` §4.
- **PLATFORM SCOPE.** Linux arm64 in the container images is measured end to end. Electron 45.2.3 embeds
  Node 24.22.2 / Chromium 156.0.8078.80, which `engines` (`^26.0.0`) cannot cover because the `electron`
  devDependency pins it; the packaged main process needs only `electron`, `fs`, `path` and `url`. macOS
  packaging stays with the deferred task **M1** in (l) and Windows stays unverified.

---

## (e) ROADMAP POINTER — the framework upgrade path is closed

Remediation: [KL01](#kl01) preserves closed history; future compatibility [KL19](#kl19),
native macOS acceptance [M1](#m1). No duplicate framework-upgrade task is opened.

The Material migration is complete, and so is the Angular 20 → 21 → 22 path that followed it: the
dependency cycle ran from P0 to R2 and closed on 2026-11-11. The delivered state is Angular 22.2.5 /
build 22.2.6, TypeScript 6.0.3, Vitest 5.1.0 + jsdom 31, `date-fns` 4.4.0 + `@date-fns/tz` 1.5.0 and
Express 5.3.0, on Node 26.13.0. Gate evidence is in `docs/TESTING_GUIDE.md` §4; the deliberate version
holds and the deb-only packaging scope are in (m).

The Webpack/build-angular retirement was completed earlier by task #52 (`aed844b`); do not restore it
to make a new runner work. Unrelated signals/DI, accessibility and theme rewrites remain deferred in
(c), (i) — the cycle did not touch them.

The board's one deferred item, macOS packaging acceptance (task **M1**), moved out of it and is
recorded in (l): it needs a macOS host and runs interactively with the user, so it was never part of
the numbered sequence.

---

## (f) ELECTRON DESKTOP STORAGE — UNRESOLVED, DELIBERATELY DEFERRED

**KL01 current classification:** native save remains unresolved and decision-gated in KL33, but
Linux launch/protocol/packaging are historically verified by B12/E1/E2/R2. The old installer and
`file://`/"never launched" descriptions below are superseded, not live launch blockers. Current
`createWindow()` loads `app://duely/`; `openSaveDialog` remains pong-only at `electron/main.ts:271–273`.
No native save bridge exists; web FileSaver behavior is not evidence of an Electron save dialog.

Remediation: [KL01](#kl01) distinguishes old launch/file:// blockers from superseding Linux evidence;
[KL33](#kl33) owns the actual native-save feature. Disproved beliefs require new evidence to reopen.

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
- **WHAT WOULD CHANGE THE DECISION.** B0, B12 and E1 completed the clean-install bootstrap, the
  `app://duely` protocol, the Xvfb launch and the Linux deb packaging, so the "runtime cannot be
  exercised" blocker is retired. None of them activated the inactive desktop-storage path or
  implemented the save dialog: those need separate feature authorization, now against a runtime that
  can actually be launched on Linux.

**Three disproved beliefs — do NOT re-litigate them:**

1. **The Electron zip is NOT damaged.** It has **76 entries** and `unzip -o` extracts all of them,
   including the 176 MB `v34.5.8` binary.
2. **The `libnss3.so` attribution carried for months was WRONG.** `libnss3` **is** present at
   `/lib/aarch64-linux-gnu/libnss3.so`; the real missing library is **`libgtk-3.so.0`**.
3. **The extraction failure is NOT a trixie/OS problem.** The retired task board recorded the
   `extract-zip@2.0.1 → yauzl@2.x → fd-slicer` **deadlock on Node ≥ 24.16 / 26.x**.

**Electron `file://` dynamic-import risk (Phase 11.1 lazy loading).** Lazy loading introduced
**THREE new route chunks** (`about`, `legal`, `settings`) plus **ONE pre-existing animations vendor
chunk** — **not** "four new chunks" (corrected by task #69). Under Electron's `file://` origin,
dynamic `import()` of these chunks is a theoretical load risk that has never been exercised because
the desktop build has never launched.

**Note for the revival.** The deadlock affects only the **installer**; manual `unzip -o` already
works. A future attempt may therefore need only `libgtk-3-0` plus manual extraction — **not** a
second Node runtime.

### Conditional Windows-packaging prerequisite

Remediation: [KL37](#kl37), separately gated by [KL02](#kl02) support/native authority.

- **WHAT.** Linux lockfile regeneration pruned 13 Windows-only optional electron-builder nodes
  (recorded in commit `48989b0`); the current lockfile still names the Squirrel Windows peer without
  its package entry. The attempted npm 11.20.0 multi-platform flags produced a byte-identical lockfile,
  not proof that Windows dependencies were restored.
- **WHY ACCEPTED.** Docker execution is Linux; the existing desktop packaging configuration targets
  Linux/macOS, and no Windows packaging verification is recorded. This is a future prerequisite,
  not a demonstrated Windows build failure.
- **RISK.** Trusting this lockfile unchanged for future Windows packaging could omit required optional
  tooling. Existing electron-builder configuration does not establish verified platform support.
- **WHAT WOULD CHANGE THE DECISION.** If Windows packaging is authorized, re-resolve the lockfile in
  an authorized Windows environment or with empirically effective platform handling, audit the restored
  optional nodes and verify actual packaging. Do not hand-craft entries or assume the old flags worked.

---

## (g) REJECTED ALTERNATIVES

Remediation: [KL35](#kl35) explicitly reconsiders **every row** below against present requirements;
[KL28](#kl28) help/accessibility, [KL13](#kl13) trimmed-zone policy and [KL12](#kl12) form lifecycle
own the related cross-cutting decisions. The original table remains verbatim historical provenance.

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

Remediation: [KL13](#kl13) strategy, then [KL15](#kl15) safe purpose-specific ownership.

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

Remediation: [KL07](#kl07) inventory and [KL15](#kl15) shared types/public-test boundaries,
following [KL13](#kl13)'s backend strategy; original extraction is not mislabeled deduplication.

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

Remediation: [KL08](#kl08) recurrence/exclusion horizon and [KL13](#kl13)/[KL14](#kl14)
correctness-preserving backend choices; no automatically approved trim or date cap.

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
- **RISK OF THE STATUS QUO.** No offset mismatch was found in the recorded Europe/Berlin probes:
  `require('moment-timezone')` resolves to `index.js` carrying the **FULL** data, matching independent
  `Intl.DateTimeFormat` results at the 13 timestamps spanning **1980–2200** preserved in
  `docs/TESTING_GUIDE.md` §5, "The date-library timezone and export oracle". These sampled results do
  not establish every instant/zone or guarantee future timezone legislation.
- **WHAT WOULD CHANGE THE DECISION.** Bounding the UNTIL date first (a datepicker `max` plus a
  validator) — itself an unauthorised behaviour change under locked decision 9.
- **I2 ADDENDUM (2026-11-10).** The resolved specifier is now **`moment-timezone` 0.6.6** instead of
  0.5.48 (single-version decision under (h.5)). It is the same CJS entry point
  (`main: ./index.js`, no `module`/`exports`) and still carries the full packed database — 728,880 B
  against 0.5.48's 727,104 B — so the DECLINED trimmed build stays declined and the "full data" premise
  above still holds. The 2126 default UNTIL is untouched, and the recurrence specs keep their identical
  52F/74P status with the same failure names on the combined tree.
- **METHODOLOGY WARNING (transcribed alongside it).** All `moment-timezone` data builds wrap the
  **SAME** moment instance and register packed zone data into **ONE shared registry**, so loading two
  builds in a single process makes one silently overwrite the other and **BOTH report identical
  offsets**. The symptom is "the builds agree everywhere", which **hides** the real difference and can
  manufacture a false alarm about a pre-existing defect — this session produced three such false
  probes before the isolation was replicated. **Correct method:** one build per process, specifier via
  argv, cross-validated against `Intl.DateTimeFormat` (runtime timezone data, no moment involved).
  **Unreliable load probes — do not use:** `tz.zoneExists()` (deprecated, warns), `tz.names.length`
  (returns 0), `tz.zone(...).untils` (throws "Invalid time value"). The reusable 13-timestamp table
  and expected offsets from the retired local measurement record are preserved in
  `docs/TESTING_GUIDE.md` §5, "The date-library timezone and export oracle".
- **D2 ADDENDUM (2026-11-10) — the question moves upstream.** No application file imports
  `moment-timezone` any more, so the DECLINED build choice is no longer the application's: the remaining
  copy is `caldate`'s (see (d.1)), which needs a real zone database for holiday arithmetic, and its
  2.79 MB holiday chunk still ships. The 2126 default UNTIL now runs through `date-fns` `addYears` and is
  emitted as a date-only value, so the "trimmed build would shift 2126" argument no longer applies to
  client code. The declaration above still stands — the trimmed build stays declined, and no new
  evidence reopens it. The 13-timestamp table was re-measured in D2 in both images (150 offsets, 0
  `Intl` mismatches).

### (h.4) `date-holidays` and its catalogue remain eagerly loaded

Remediation: [KL16](#kl16), after explicit form/export state and holiday-backend outcomes.

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

### (h.5) The integrated holiday upgrade pushes the initial bundle over budget — RESOLVED IN I2 (recorded 2026-11-10 by D3)

Remediation: [KL01](#kl01) preserves the repaired duplication record;
[KL14](#kl14)/[KL16](#kl16) guard the dependency/data graph without widening budgets.

**KL01 current classification:** repaired duplication/budget incident, not an outstanding budget
failure. D2 removed the application's direct Moment/timezone dependencies; the installed remaining
versions are transitive Moment 2.31.0 / moment-timezone 0.6.6. Fresh production initial size is
2,460,981 B with zero budget warnings. I2's direct-pin and 2.42 MB figures below remain historical.

- **WHAT.** In the D3 candidate the production initial bundle grows from **2.32 MB to 3.86 MB raw**
  (gzip 372.75 kB → 384.71 kB) and exceeds the configured **2.55 MB** initial budget by 1.31 MB, so
  `ng build --configuration production` emits an `initial exceeded maximum budget` **warning** and still
  exits 0. Measured cause: date-holidays 3.39.1's parser (3.7.0) and `caldate` (2.1.0) both require
  `moment-timezone ^0.6`, so npm installs nested `0.6.6` copies under each while the application's own
  direct dependency stays hoisted at `0.5.48`; webpack bundles two timezone databases. The holiday data
  itself only grew from 722,917 to 820,738 bytes, so the bulk of the increase is duplicated code, not
  extra catalogue rows.
- **WHY DEFERRED.** Resolving it means either a single `moment-timezone` version across the tree (an
  npm `overrides` dependency decision) or a budget change; both are outside D3's authorized scope and
  belong to I2. Nothing is repaired or silently widened yet — the warning is recorded as evidence.
- **RISK.** Until I2 decides, the shipped initial payload carries a duplicated timezone database, and a
  future budget enforcement change would turn the warning into a build failure.
- **RESOLVED IN I2 (approved Option 1, single version).** `moment-timezone` is now a direct pin at
  **0.6.6**, so the lock resolves exactly one entry (`node_modules/moment-timezone`) instead of the
  hoisted 0.5.48 plus two nested copies. 0.6.6 keeps the shape (h.3) depends on: CommonJS,
  `main: ./index.js`, full packed data (728,880 B against 0.5.48's 727,104 B). Measured on the combined
  tree, the production initial total is **2.42 MB / gzip 388.83 kB** with **zero** budget warnings in
  all four build logs, and the initial total stays below the unchanged 2.55 MB budget. The gzip figure
  remains 16 kB above A1's 372.75 kB because 0.6.6's packed data is slightly larger and (h.4) still
  ships it eagerly — that is the recorded (h.4) decision, not a new regression.
- **WHAT WOULD REOPEN IT.** A future dependency that reintroduces a second `moment-timezone` range
  (the lock review must keep resolving one entry), or a payload redesign under (h.4) that changes the
  initial graph. The 2126 default `UNTIL` behaviour is unchanged: the recurrence specs hold the same
  red/green set before and after (52F/74P, identical failure names), and the 2032 holiday fixture is
  verified in UTC and Europe/Berlin on the combined tree.

### (h.6) The Compose healthcheck could never pass in the shipped image — REPAIRED AND INTEGRATED IN I2

Remediation: [KL01](#kl01) preserves repaired history; [KL04](#kl04) retains the healthcheck negative control.

- **WHAT.** `docker-compose.yml` probed readiness with `curl -f http://127.0.0.1:8000/`, but the
  production stage installs neither `curl` nor `wget`; the command therefore exited **127** in every
  container, so the service could never become healthy. The C1 candidate replaces it with an explicit
  Node `fetch` probe, verified in a Compose override pinned to the prebuilt image (status `healthy`,
  `ExitCode 0`) and proven non-vacuous (a container with no server returns 1).
- **WHY ACCEPTED FOR NOW.** The candidate is frozen and not integrated; the accepted A1 tree still
  carries the broken command, so the limitation stays true of the working tree until I2 lands it.
- **RISK.** Any deployment that relies on the current health status observes a permanently unhealthy
  container; orchestrators that restart on unhealthy would loop.
- **I2 STATE.** The reviewed `docker-compose.yml` is now part of the working tree (one of C1's two
  integrated paths, unchanged by the merge), so the entry is historical rather than current. The probe
  behaviour itself keeps C1's measured evidence; I2 re-ran the container gates but did not repeat the
  Compose healthcheck experiment.

---

## (i) PRE-EXISTING UI DEFECTS AND USER-GATED FOLLOW-UPS

Logged by the Phase 5 Playwright browser pass and **accepted as pre-existing and out of scope** by
user decision D20 (2026-09-14). Every colour/contrast/visibility claim derives from `getComputedStyle`
and SVG source, **not** from pixels — that pass produced zero screenshots because `visibilityState`
stayed `hidden` (decision D21 accepted the computed-style evidence and left the visual claims
labelled unconfirmed-by-pixels). **`/legal`'s raw-i18n-keys-on-cold-load defect is NOT here** — it was
fixed by Phase 10.3. The observations below survive the retired task board; the later reduced
Phase 13 visual pass is preserved separately in `docs/TESTING_GUIDE.md` §4.

- **(i.1) Dark theme only half-applies.** `body { background: #ddd }` and `.card { background:
  #ffffff }` are **hardcoded**, so the page background and cards never invert in dark mode. *Risk:*
  a light page shell around dark content. *Changes when:* the hardcoded hexes are replaced with
  `--mat-sys-*` tokens. Remediation: [KL27](#kl27).
- **(i.2) 9 labels at contrast 1.29 in dark theme.** Nine Material radio/field labels land at
  contrast **1.29** once Recurrence is expanded with a Monthly/Yearly pattern. *Risk:* effectively
  illegible text. *Changes when:* the label colour is token-derived. Remediation: [KL27](#kl27).
- **(i.3) `on-primary` never accent-derived.** Filled-button labels and their icons land at
  **2.14–2.96** contrast because `--mat-sys-on-primary` is never re-derived per accent. *Risk:* low
  button-label contrast under some accents. *Changes when:* the theme emits a per-accent `on-primary`.
  Remediation: [KL27](#kl27).
- **(i.4) `color-scheme` never set to `dark`.** Native checkbox/time/select popups stay light in dark
  mode. *Risk:* jarring native widgets. *Changes when:* `color-scheme: dark` is emitted under
  `[data-theme='dark']`. Remediation: [KL27](#kl27).
- **(i.5) White-on-white brand logo in the light theme.** `assets/duely_only_white.svg` is invisible
  against the default light toolbar (`color="primary"` is inert on `mat-toolbar` under Material 20 and
  `--mat-toolbar-container-background-color` is undefined). *Risk:* the brand mark disappears.
  *Changes when:* the toolbar container colour is defined or a theme-appropriate logo variant is used.
  Remediation: [KL27](#kl27).
- **(i.6) An 8 px horizontal scrollbar on every route at every viewport.** `html, body { width: 100% }`
  combined with the UA default `body { margin: 8px }` (never reset). *Risk:* a permanent spurious
  scrollbar. *Changes when:* the body margin is reset. Remediation: [KL34](#kl34), [KL36](#kl36).
- **(i.7) Hardcoded `label-red` on the remove-appointment icon.** `creator.component.html` hardcodes
  `class="label-red"`, so the icon stays red even under a blue accent. *Risk:* accent-inconsistent
  icon. *Changes when:* the class is token-derived. Remediation: [KL27](#kl27), with destructive
  versus accent semantics explicitly decided rather than treating red as inherently defective.
- **(i.8) Dead `showWeekNumbers` markup.** `<mat-datepicker showWeekNumbers="true">` is dead markup —
  `MatDatepicker` has no such `@Input`. *Risk:* none functional (inert attribute); misleading intent.
  *Changes when:* the attribute is removed or week numbers are implemented properly.
  Remediation: [KL34](#kl34); a real week-number feature needs separate scope/approval.

### (i.9) The missing `<base href="/">` (backlog item e / decision D20) — evaluated, SKIPPED, then RESOLVED by B12

Remediation: [KL01](#kl01) preserves repaired app://duely/base history;
[KL33](#kl33) and platform tasks retain that routing contract.

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
- **B12 RESOLUTION (2026-11-10).** The second condition was met by a different mechanism than the one
  sketched above: the desktop no longer runs on `file://`. `electron/main.ts` serves the bundle from
  the fixed origin `app://duely` (a privileged *standard* scheme), where `/` **is** the application
  root, and `angular.json` now sets the shared, target-independent build option
  `baseHref: "/"`. The emitted document carries `<base href="/">` before every script and link in
  **both** builds (`dist/server/static/browser/index.html` and `dist/electron/static/browser/index.html`),
  so relative chunk URLs resolve from the origin root on `http(s)` and on `app://` alike. Verified by
  B12: the production image returns `/`, `/settings`, `/about`, `/legal`, `/404`,
  `/bogus/deep/path` and `/bogus/deep/path/with/many/segments` as byte-identical documents with the
  base tag first; the `server` Playwright project still loads `/settings` directly under Chromium
  (22/0 E2E, unchanged); the desktop window renders `/settings`, `/about`, `/legal`, `/404`, a deep
  unknown path (route fallback → `/404`) and the creator from `app://duely`; and the desktop build
  contains no `file://` load path any more. Evidence:
  `.git/duely-batch-20261110/b12/web.json`, `desktop.json` and `quality.json`.

### (i.10) Native time controls remain; `ngx-mat-timepicker` follow-up is parked

Remediation: [KL30](#kl30) reevaluates current native/first-party/previous picker options and scope.

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

Remediation: [KL28](#kl28) names, help, keyboard/focus and assistive-technology evidence.

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

### (i.12) Three interactions the desktop run documented instead of changing

Remediation: (i.12.1) [KL26](#kl26) live date locale; (i.12.2) [KL08](#kl08)/[KL11](#kl11)
named-zone contract/VTIMEZONE; (i.12.3) [KL29](#kl29) removal propagation, coordinated with [KL28](#kl28).

- **WHAT.** E1's 800×600 desktop interaction run recorded three pre-existing behaviours and left them
  alone. (1) `MAT_DATE_LOCALE` is resolved when the first date picker is created, so after a language
  change typed dates parse in the previous locale until the app is reloaded; the export proves the
  parsed day, so this is a locale-format mismatch, not a lost value. (2) A named-zone export
  emits `TZID` parameters without a `VTIMEZONE` block. (3) The remove button's click bubbles to the
  card-header toggle, so removing an appointment also collapses the survivor.
- **WHY ACCEPTED.** All three are pre-existing provider/template/export behaviour, not regressions from
  the cycle, and each fix is a behavioural change outside an upgrade's scope: (1) needs locale
  re-resolution on language change, (2) needs VTIMEZONE generation plus a decision about which payloads
  ship zone definitions, (3) needs event propagation stopped in the template.
- **RISK.** A user who switches language and immediately types a date can get a differently parsed day
  until reload; an ICS consumer without its own zone database cannot resolve a named `TZID` from the
  export alone; a removal also hides the remaining card, which reads as data loss until it is reopened.
- **WHAT WOULD CHANGE THE DECISION.** A user-authorized UI/export pass that reproduces each behaviour in
  a browser or parser, fixes it with the semantics above, and updates the affected E2E assertions
  rather than deleting them.

---

## (j) i18n CARRY-FORWARD

Carried forward from `docs/2026_MIGRATION_BACKLOG.md` §3, which was itself the only surviving record
of the deleted `docs/TODO-untranslated-strings.md`. Losing an OPEN item here would be the worst
outcome of the consolidation, so all are preserved.

### (j.1) Three Settings labels with conflicting confirmation records (§3(b), OPEN)

Remediation: [KL24](#kl24) obtains explicit six-value/capitalization approval and preserves provenance.

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

### (j.2) Upgrade-sensitive locale verification — VERIFIED by P1W/D2 (2026-11-10)

Remediation: [KL26](#kl26) live-locale gap; [KL01](#kl01)/[KL39](#kl39) preserve existing guards.

The remaining runtime checks were implemented rather than relocated: Settings metadata and Material
date labels run in EN and DE, and the exclusion reason with its `EXDATE` was verified through real
downloads and a bounded collision setup. The German Material day-label guard flipped green when D2
supplied `MAT_DATE_LOCALE` from the saved language, without editing the E2E spec. The one remaining
locale quirk is recorded in (i.12): `MAT_DATE_LOCALE` is resolved when the first picker is created, so
a language change needs one reload before typed dates use the new locale. Wording questions from
(j.1) and (j.4) remain untouched.

### (j.3) Five retained untranslated strings — U5 runtime title is decision-gated

**KL01 current classification:** U1–U4 are conventional retention decisions; U5 is an unimplemented
feature, not an architectural impossibility. Angular's `Title.setTitle()` can update the document
title after bootstrap and on `TranslateService.onLangChange`. The current static English title
is retained pending KL25; no title service or translation change is implemented here. The original
table and "permanent" rationale below are preserved as superseded historical conclusions.

Remediation: U1–U4 conventional retention/copy decisions [KL24](#kl24); U5 runtime-title choice
[KL25](#kl25). The "permanent" wording below is preserved history, not a new feasibility conclusion.

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

Remediation: [KL24](#kl24) accurate bilingual instructions; no current in-app legal editor exists.

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

Remediation: [KL01](#kl01), [KL24](#kl24) preserve repaired cold-load/provenance history.

`LEGAL DEFAULT MESSAGE` and `LEGAL EDIT HINT` were inside the deleted untranslated-strings
inventory: Section C, items C4/C5, commit `dd11df7`. Their EN values were the previously-hardcoded
strings, so the raw-key rendering was **not** a new translation gap. It resulted from the
`.instant()`-in-the-constructor decision and was **fixed by Phase 10.3** (rebuilt on
`translate.onLangChange`). The stale hint wording remains separately open in (j.4); this provenance
answer survives retirement of both the inventory and execution plan.

---

## (k) REMAINING VISUAL AND FUNCTIONAL VERIFICATION GAPS

### (k.1) Screenshot counts do not establish the full interaction / density matrix

**KL01 current classification:** broader visual/browser-support coverage remains incomplete in
KL02/KL36. B12/E1 already exercised the Linux desktop, including 800×600 interactions; the final
sentence of the historical RISK below is superseded. These bounded records do not establish the
full route/theme/accent/density matrix or macOS/Windows support.

Remediation: [KL36](#kl36) truthful matrix and 800×600 interaction evidence; [KL02](#kl02) support scope.

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

### (k.2) Vacuous timezone/collision/export checks — REPLACED by real guards (2026-11-10)

Remediation: [KL01](#kl01) preserves history; affected task gates and [KL39](#kl39) retain/extend guards.

P1W removed the conditional timezone bypass, replaced the assertion-free collision placeholder with a
bounded real exclusion setup (date and reason), and made the download assertions read the ICS content.
It also required real save/reload persistence and a fixed-date `DAILY COUNT 3` export, and verified
Settings metadata plus Material date labels in both locales. The guards are now 22 E2E executions on
both server projects, and the nine deliberate negative controls show they die when the behaviour they
describe is broken. Historical 16/0 is no longer cited as a gate. The broader visual matrix in (k.1)
and the audit in (k.3) remain separate follow-ups.

### (k.3) General test-coverage and dead-code audit remains parked

Remediation: [KL06](#kl06), [KL07](#kl07), with individually approved follow-ups for new findings.

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

### (k.4) The Material 22 datepicker toggle icon rasterises differently (measured, not a defect)

Remediation: [KL36](#kl36) preserves bounded rendering interpretation without weakened assertions.

- **WHAT.** The only artifact the A4 integration audit could not attribute to capture noise is
  `e2e-results/…-reason-and-EXDATE-in-de-server/exclusion-de.png`, 64,838 B under I2 and 64,475 B
  under Angular 22. A pixel diff of the two PNGs confines the whole difference to the **40×40 px
  Material datepicker toggle-icon box** at (1073,1063): **324 of 1,922,984 pixels** differ, the
  largest channel delta is **20/255**, and no pixel moves more than 32 levels. Field content, labels,
  dates, borders and layout are identical.
- **WHY ACCEPTED.** Each image is reproducible per image (`e2e-control-results` reproduces the A4
  bytes, `e2e-base-control-results` reproduces the I2 bytes), so this is a deterministic rendering
  change inside Material's own icon rasterisation, not a layout or data regression. The dev-page
  capture of the same test differs between two runs of the *same* image, which is why only the
  server-side capture is treated as layer-attributable.
- **RISK.** Byte-level screenshot comparison of Material datepicker captures will keep failing across
  this layer boundary. Do not treat a small PNG delta in that region as a functional regression, and
  do not "fix" it by loosening a capture assertion.
- **WHAT WOULD CHANGE THE DECISION.** A Material release that changes the icon again, or a capture
  whose diff leaves that box (size, position or text change indicates a real regression and must be
  investigated).

---

## (l) MACOS PACKAGING ACCEPTANCE — DEFERRED, RUNS INTERACTIVELY WITH THE USER

Remediation: [M1](#m1), retaining the existing identifier, deferral and separate native/user approval gate.

> **Relocated 2026-11-11** from the upgrade board's §4, where it was task **M1**, at the user's
> request to move it here and deal with it later. The board itself was retired the same day. The
> identifier **M1** is kept so the B12/E1/E2/R1/R2 records that name it stay readable in Git history
> and in `docs/TESTING_GUIDE.md` §4. Nothing about the task changed in the move, and no earlier
> approval carries over to it.

- **WHAT.** The macOS target of the electron manifest has never been built, installed or launched. B12
  covered Linux only, and `electron-builder`'s macOS targets need a macOS host, so this cannot be
  measured in the Linux arm64 container — the same reason Windows is unverified (see (d.6)). The
  unmeasured scope: build the manifest's macOS target (`dmg`, arm64 first; universal only if asked),
  install or mount the artifact, launch it, and confirm that `app://duely` serves the routes exactly as
  it does on Linux — the five route states plus the empty-storage redirect and both locales — together
  with the base resolution that closes (i.9). The sandbox/entitlement state, the code-signing and
  notarization status, and what Gatekeeper does with an unsigned build are all unrecorded.
- **WHY ACCEPTED.** macOS distribution is not a supported claim, so the missing evidence is not a
  contradiction in the record. No approval authorizes the work, and the Linux container is the wrong
  host: a cross-build would produce a weaker artifact and a weaker claim than running it properly later.
  This is a separate platform verification, not a closure gate, so E2 and the numbered upgrade sequence
  closed without it.
- **RISK.** The configuration can be read as support that has never been observed —
  `electron/package.json`'s target list, the `app://duely` protocol registration and the root base href
  all look complete. An unsigned build will very likely be refused by Gatekeeper, and macOS
  entitlements may behave differently from the Linux sandbox measured at `Seccomp: 2` /
  `NoNewPrivs: 1`. Those behaviours are unknown, not known-good.
- **WHAT WOULD CHANGE THE DECISION.** An explicit request to start, on the user's macOS machine with
  the user present: the user starts and observes each build and launch, and the coordinator records the
  output, step by step, in conversation. Capture `codesign --verify`, `spctl --assess` and the launch
  output verbatim; do not summarise them into a pass. **Exit:** either a launched macOS artifact with
  its limits recorded, or an explicit statement that macOS distribution stays unsupported. Do not claim
  macOS support from configuration alone, do not cross-build macOS artifacts in a Linux container, and
  do not let this task block anything else.

---

## (m) THE 2026-11-11 DEPENDENCY CYCLE — CLOSED, AND WHAT STAYS HELD

The Angular 20 → 22 cycle ran from P0 to R2 and closed on 2026-11-11. Its task board
(`docs/TODO_UPGRADES.md`) was retired with it; the measured gate record is in
`docs/TESTING_GUIDE.md` §4. The closing baseline is **16/16 gates at the expected status** — units
**2F/131P (133)** with exactly the two accepted names, Europe/Berlin **1F/23P (24)**, E2E **22/0**
twice, lint **0E/7W** — so the suite is *not* green and must not be described as such. The two names
are the 2032 holiday oracle in (a.2) and `CreatorComponent.saveText` under option C in (a.3).

Everything else the cycle repaired is recorded in (a), (b.11), (d.1), (d.4), (j.2) and (k.2). The
date-model boundary it established is documented in the code: `Appointment.start`/`end` stay native
`Date`s whose **UTC fields** carry the picked wall clock, and `client/app/shared/wall-clock.ts` is the
only converter between the wall-clock and instant views.

### (m.1) Three deliberately unpulled versions

Remediation: Electron [KL17](#kl17), Sass [KL18](#kl18), peer-gated TypeScript [KL19](#kl19);
registry facts are rechecked when individually approved, not assumed permanently current.

- **WHAT.** At closure, 43 of the 46 root-manifest entries, both `server/` entries and the `electron/`
  entry were at the newest published version. Three were not pulled: `electron` **45.2.3** (45.3.0
  published the day before), `sass` **1.108.1** (1.108.2 published that morning) and `typescript`
  **6.0.3**, whose 7.0.2 release is excluded by `@angular/build` 22.2.6's peer range
  `typescript: ">=6.0 <6.1"`. `electron-builder` 26.18.1 sits on the `v26` dist-tag and is *ahead* of
  `latest` (26.18.0), not behind. Node 26.13.0 is Active LTS ("Lithium") and `npm ls --all` reports
  0 problems with no invalid peer.
- **WHY ACCEPTED.** Each is a compatibility or evidence decision, not an oversight: an Electron bump
  changes the shipped deb and invalidates the desktop launch/packaging measurements, a `sass` bump
  moves the CSS the production build is pinned to byte-for-byte, and TypeScript cannot move until the
  build peer range does. Pulling them inside a security-only refresh would have required rerunning
  desktop and packaging evidence that refresh did not own.
- **RISK.** Two patch-level bug-fix releases stay unapplied, and this record must not be read as
  "everything is current". A later Electron bump has to re-measure the desktop and packaging evidence
  rather than reuse the B12/E1/E2/I4/R2 numbers.
- **WHAT WOULD CHANGE THE DECISION.** An authorized task per package: Electron with a rebuilt image, a
  relaunched `app://duely` window, a re-measured deb and a re-scanned container; `sass` with a
  byte-comparison of the production stylesheet plus the build gates; TypeScript when `@angular/build`
  widens its peer range.

### (m.2) Linux packaging scope is the deb only

Remediation: [KL38](#kl38) deb/optional formats, [M1](#m1) macOS, [KL37](#kl37) Windows;
configuration and historical artifact existence do not establish verified support.

- **WHAT.** `electron/package.json` declares `build.linux.target: ["deb"]`. B12 measured an `arm64`
  AppImage as part of its one-off acceptance evidence (127,595,082 B, verified by `--appimage-extract`
  and an unpacked-tree launch, never by a FUSE mount). The user decided on 2026-11-10 that the project
  does not need AppImage packaging, and E1a then reduced the target to the deb. macOS is recorded in
  (l); Windows was never built, installed or launched.
- **WHY ACCEPTED.** The deb is the artifact every measured build ships — installed, payload read back,
  `postinst`-verified and launched — while the AppImage was never executed in its normal mounted form.
  Shipping an artifact whose acceptance is weaker than the deb's would overstate support.
- **RISK.** Anyone reading the older B12 output finds an AppImage that no current build produces.
  Linux arm64 in the container images is the only measured platform; no claim about macOS or Windows
  follows from `electron-builder` configuration.
- **WHAT WOULD CHANGE THE DECISION.** An explicit, per-platform packaging request that rebuilds and
  actually installs or mounts each artifact and repeats the route, locale and sandbox checks the deb
  received.

---

<a id="remediation-plan"></a>
## (n) APPROVED REMEDIATION PLAN — INDIVIDUAL TASK APPROVAL REQUIRED

**Published:** 2026-11-11. **Owner:** coordinator. **Task status:** KL01 is `DONE`,
execution and recorded baseline accepted by the user on 2026-11-11; its Git step is included in
this documentation checkpoint under separate explicit approval.
KL02–KL40 and the retained M1 identifier remain `PROPOSED`; the existing macOS
acceptance remains deferred until separately approved.
This section is the sole execution register for this remediation plan. Existing sections (a)–(m)
remain the historical/risk record, and their plan links do not declare an issue fixed.

### Authorization boundary and decisions already received

The original approval authorized documenting this plan **only**; publication did not start any
remediation task. On 2026-11-11 the user separately requested: "Please start working on KL01 or ask
me, if you need any decision beforehand." This authorized KL01's factual reconciliation and Docker
baseline acceptance workflow, without behavioral or dependency changes. It did not authorize a
successor, staging, commit or push. The published plan and KL01 documentation were held
uncommitted until the separate Git approval recorded below.

**KL01 acceptance — 2026-11-11:** the user stated, "I approve KL01." The factual reconciliation
and recorded expected-red baseline are accepted; KL01 is complete. This was not a new security
risk waiver or authority to stage, commit, push or start a successor. The Git step was initially deferred.

**Documentation Git checkpoint — 2026-11-11:** the user stated, "Please commit the current status."
This separately authorizes staging and committing only `docs/2026_KNOWN_LIMITATIONS.md` and
`docs/TESTING_GUIDE.md`, including the earlier plan publication, accepted KL01 record and audit-plan
amendment. This checkpoint closes KL01's deferred Git step. Local evidence under `.git` remains
preserved but outside the commit; the two documents carry the portable summary. No push, successor
execution, dependency change or new security risk waiver is authorized. Work remains paused.

**Audit-plan amendment — 2026-11-11:** the user requested explicit treatment of the 18 npm
package findings, including the 3 production findings, and closer examination of downgrade
consequences and alternatives. That request authorized the plan amendment and bounded read-only
planning checks only, not KL03/KL05/KL13/KL14 execution, candidate installs, dependency changes or
Git operations. The later Git checkpoint above includes this amendment. At amendment, KL01 was
ready for acceptance; it has since been accepted as recorded
above. Its baseline and earlier preservation checks describe the pre-amendment state, not
unchanged successor blocks after this authorized edit.

Motto: **Keep stability, currency, and security in balance.** Severity, exposure, user-visible
correctness and dependency impact precede cosmetic modernization or chasing the newest version.

- Plan realistic positive CreatorComponent export coverage; do not implement old option C by
  dropping that coverage. This is a planning direction, not a repaired-test claim.
- Keep Electron. A Tauri comparison or migration is outside this plan unless the user reopens it.
- Present concrete timezone/collision examples before asking for the replacement time contract.
- Decide UNTIL-day behavior in KL08; inclusive end-of-day semantics are not approved.
- Other behavior, dependency, branding, platform and acceptance-policy choices remain explicit
  task gates. Recommendations are not approvals.

### Execution, attention and commit contract

Each task has a status, owner, dependencies, sources, decision gate, scope, exit/evidence, attention
trigger and commit step. The coordinator owns approvals, integration, manifests and provisioning.
An approved task includes only its named scope and acceptance workflow. Nothing starts because it
is next in the register. After completion, stop and request approval for any successor.

Independent read-only investigations or disjoint source candidates may run in parallel only in a
named, approved batch. Shared-source changes and provisioning stay serialized. Any separately
defined integration task requires separate approval. Agents do not launch successors.

All installation, tests, lint, type checks, builds, audits, scanners and automated browser/desktop
checks run in approved Docker containers. A missing daemon is a blocker, not permission for a host
fallback. M1 and Windows work need an explicit native-platform execution exception or remain
blocked; user-operated native acceptance is distinguished from automated Docker evidence. Audio
notification, source editing and ordinary Git inspection are not build execution.

The **Attention** field in every task means: play `afplay /Users/heg20/Downloads/icq-message.wav`
when approval, a decision or help with a blocker is actually required, and explain the needed
response. Routine progress and completion alone remain silent. If that sound is unavailable, use a
system sound and report the missing configured path.

The **Commit** field in every task is conditional on explicit approval including that Git step and
accepted task gates. Commit only the task's resulting source, tests, configuration and durable
summary; preserve unrelated work and hooks, and do not push. Decision-only, accepted or deferred
outcomes commit their documentation changes, not an empty implementation commit. If approval
excludes or leaves Git authority unclear, ask before staging or committing.

Preserve captures, earlier evidence and historical measurements. Record observations separately
from hypotheses and new decisions. Do not skip failing tests, rewrite fixtures to match the
implementation, suppress diagnostics, widen budgets or weaken assertions merely to pass a gate.

### Why these things come first

1. **Trustworthy facts and safety nets:** separate repaired history from current limitations and
   restore positive export coverage before behavioral refactors.
2. **Security triage and bounded mitigation:** assess runtime-image exposure early; findings are
   not automatically harmless because they are outside the application's npm tree.
3. **Date contracts:** collision meaning, event versus host timezone, UNTIL, all-day boundaries and
   recurrence/exclusion horizons govern multiple UI and export fixes.
4. **Holiday backend:** decide the backend before optimizing its Moment/deepmerge/CJS footprint,
   construction ownership, loading and timezone data.
5. **Forms and async boundaries:** explicit state/validation ownership precedes asynchronous
   holiday loading and native save completion.
6. **Browser, accessibility and theme policy:** targets and standards determine picker, contrast
   and verification choices.
7. **Final packaging evidence:** package updates receive immediate acceptance; final platform
   checks follow relevant client/storage changes. Optional platforms do not block web/Linux fixes.

Task IDs are stable references, not a mandatory execution sequence. Independent low-risk scopes
may proceed early only after their own approval and focused verification.

<a id="audit-remediation"></a>
### Explicit npm audit remediation and downgrade assessment

**Required outcome:** address every one of KL01's **18 package findings: 15 moderate development
findings and 3 low production findings**. The production three are included in the 18, not three
additional vulnerabilities. npm propagates the two root advisories through dependent packages;
remediating a root must account for every affected instance and propagated finding, not just totals.
This is remediation work with explicit owners and approval gates, not automatic acceptance of the
residual findings or a promise that a safe zero-finding solution already exists.

| Root advisory and baseline package findings | Assessment and implementation ownership |
|---|---|
| `minimatch`, `GHSA-g3hv-75wg-m249`, globparts-amplification denial of service: `@electron/universal`, `@eslint/config-array`, `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`, `app-builder-lib`, `dmg-builder`, `electron-builder`, `electron-builder-squirrel-windows`, `eslint`, `minimatch`, `typescript-eslint` (15 moderate, development scope). | [KL03](#kl03) maps versions, callers and input trust; [KL05](#kl05) implements approved tooling remedies. [KL19](#kl19) supplies compatibility constraints, not an automatic framework rollback. Packager changes need renewed Linux package evidence; [KL17](#kl17) applies only if an Electron runtime change is separately selected. |
| `deepmerge`, `GHSA-gcqx-w48m-w2h4`, prototype poisoning of returned objects: `date-holidays`, `date-holidays-parser`, `deepmerge` (3 low, present in full and production audits). | [KL03](#kl03) assesses reachability and remedy choices; [KL13](#kl13) selects the holiday-chain remedy; [KL14](#kl14) implements it. [KL04](#kl04) may reduce unnecessary server-installed dependencies, but must not mislabel their removal from an image as a browser/Electron holiday-backend fix. |

**Alternatives comparison required for each root advisory:** evaluate a fixed upstream release or
compatible parent upgrade; any verified supported backport; a narrowly scoped transitive override;
an owned reproducible security patch/fork; dependency replacement or removal where behavior permits;
and, only after comparing these, a supported older release. Assess security, compatibility, upkeep,
licences, release availability, migration cost and rollback for each candidate. Explain rejected or
unavailable choices with evidence. Monitoring/containment is a residual-risk option requiring explicit
user acceptance, not a repaired dependency. No blind `npm audit fix --force`, global major override,
audit suppression or unapproved downgrade is permitted.

**User hypothesis (unverified):** "If a downgrade is the only viable solution". npm's
`fixAvailable` proposals do not establish this. Before recommending a downgrade, demonstrate why
non-downgrade options are unavailable or less safe and present its complete consequences:

- Exact proposed versions across the affected parent/subpackages, supported engines/peers and
  support/deprecation status. Older-version selection must use current registry/advisory data.
- Lost features, bug/security fixes and data updates; API/configuration changes; additional
  transitive advisories and supply-chain/maintenance burden, not just removal of the target advisory.
- Tooling effects on Angular 22/TypeScript 6, flat-config loading, typed/template lint behavior and
  diagnostics. No ignored peers, weakened rules or compiler/framework cascade without a new decision.
- Packager effects on current Electron 45, Node 26, Linux arm64, configuration, bundled files,
  installer behavior, licences and app:// routing. Packager and embedded Electron versions are
  separate choices; macOS/Windows support cannot be inferred from Linux and remains separately gated.
- Holiday-library effects on APIs/types, country/state/region and multilingual coverage, corrected
  historical/future rules, required timezone/DST coverage, recurrence and EXDATE. Do not settle
  unresolved collision/UNTIL semantics or rewrite the independent 2032 data oracle as a side effect.
- Candidate-versus-baseline clean-install, full/production/image audits and behavioral evidence,
  new/removed findings by identity, a costed recommendation and a reproducible rollback path.

**Bounded planning observations — 2026-11-11, not candidate acceptance:** Docker-only `npm view`
metadata and the unchanged lock show:

- The minimatch advisory range is `>=7.0.0 <11.0.1`; affected lock instances are 9.0.9 and 10.2.6.
  Registry latest is 11.0.8, outside that range. The existing glob subtree already uses 11.0.5;
  that does not repair the other instances. Their parents declare `^9.0.3` or `^10.2.x`, so a
  lock-only update within those ranges cannot select 11.x. A parent upgrade, compatible narrow
  override or patch is a candidate for evaluation, not a proven drop-in solution or blanket safe pin.
- npm proposes ESLint/@eslint/js 9.39.5, typescript-eslint 8.36.0 and electron-builder 25.1.0.
  ESLint 9.39.5 is registry-deprecated as unsupported. typescript-eslint 8.36.0 peers require
  ESLint 8/9 and TypeScript `>=4.8.4 <5.9.0`, incompatible with current ESLint 10/TypeScript 6;
  the Angular build peer is `>=6.0 <6.1`, so there is no shared compiler range. angular-eslint
  22.6.0 itself permits ESLint 9 or 10; do not invent an Angular peer conflict for ESLint alone.
  The old packager's Node engine range alone does not establish Electron 45/package compatibility.
- Latest deepmerge remains 4.3.1, within the reported affected range; date-holidays 3.39.1 and
  parser 3.7.0 remain latest and the parser requires `deepmerge ^4.3.1`. No fixed simple upgrade
  was found in these metadata checks. npm's date-holidays 1.8.4 proposal changes the parser from
  3.x to `^1.5.0` and js-yaml from `^5.5.0` to `^3.14.0`; the resulting resolved tree, advisories,
  API/rule/data regressions and patch/replacement alternatives still need investigation.

The metadata check does not prove exploitability, patch/backport availability, equivalent behavior,
or that a proposed downgrade clears the complete resolved tree. Evidence is retained under
`.git/duely-batch-20261111/audit-plan/remedy-metadata.json`; advisory identities/counts come from
KL01's retained `final-run/audit-facts.json`. Recheck before execution; registry state can change.
No package was installed or changed, and no new audit/scanner or candidate build/test was run.

**Completion rule:** KL03 produces an 18-finding disposition ledger with installed/resolved paths,
root advisory, exposure, candidate comparison, selected remedy, implementation owner/task and
verification gates. Each entry stays open until its approved implementation is verified, or the
user explicitly accepts a documented deferral with mitigation and owner/revisit trigger. KL05 and
KL14 reconcile that ledger using before/after full, production-scope and actual-image audits plus
relevant emitted browser/Electron inventories. Patched-but-still-reported findings need the exact
patch hash, reproducible advisory regression/negative control and explicit user disposition; never
hide them or call an audit green. KL39 checks the complete ledger at closure. OS/base-image and
Electron embedded-runtime findings are separate KL03/KL04/KL17 surfaces, not part of these 18.

This amendment supersedes historical wording that treats npm's offered downgrade as the only
possible remedy, or categorically excludes examining a downgrade. It permits investigation and
recommendation under approved tasks, not automatic installation or a new risk waiver.

### Foundation and security

<a id="kl01"></a>
#### KL01 — Reconcile current facts and establish the execution baseline
- **Status:** DONE; execution and recorded baseline accepted 2026-11-11 ("I approve KL01."); Git step included in this separately authorized documentation checkpoint. **Owner:** coordinator. **Needs:** none. No successors authorized.
- **Sources:** Entire document, especially (a), (b.3/b.12–14), (d.1–6), (e), (f), (h.3–6), (i.9), (k.1), (m).
- **Decision gate:** Approve the baseline/factual-reconciliation scope; pause for unexplained differences.
- **Scope:** Label original descriptions and superseding addenda as repaired, current, decision-gated or conditional. Recheck source/configuration and gate procedures; reproduce the approved Docker baseline without behavioral changes. Assess old never-launched/file:// blockers, removed app Moment imports, R2's repaired Moment advisory, current ESLint-10 manifest versus old ESLint-9 wording, title feasibility, drifted line numbers and warning totals.
- **Exit/evidence:** Record revision/image identities, failing names, warnings, dependency tree, sizes and platform evidence. The recorded 2F/131P baseline is historical until reproduced. Preserve earlier evidence and explain discrepancies; plan links alone are not completed reconciliation.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or unexplained baseline discrepancies; explain the needed response.
- **Commit:** Included in this documentation checkpoint, separately authorized 2026-11-11 ("Please commit the current status."). Scope: this register and Testing Guide, including prior publication and audit-plan amendments. Preserve hooks and local evidence; no push or successor.

<a id="kl01-evidence"></a>
##### KL01 execution record — 2026-11-11

**Outcome:** DONE; factual reconciliation and the recorded baseline accepted by the user on
2026-11-11 ("I approve KL01."). Its separately approved Git step is included in this documentation
checkpoint; work remains paused without push or successor approval.
No behavior, dependency, manifest, configuration or test changed. Old measurements, repaired
history, prior publication and stopped attempts are retained. No successor started; baseline
acceptance does not resolve the remaining test failures or grant a new security risk waiver.

**Current classification and precedence.** The classifications below supersede live-sounding old
prose; the linked original/addendum records retain their dates and measurements. "Repaired" means
previous approved work, not a repair performed in KL01. "Current" does not imply a new risk waiver.
The issue-coverage ledger continues to map every entry to its separately approved follow-up.

| Record family | Current classification |
|---|---|
| (a.1), representation/hydration/start repairs in (a.4–8), (b.11), (d.4), (e) | Repaired/closed by earlier approved cycles; type, unit, build and E2E baseline reproduced. |
| (a.2), remaining UNTIL/all-day/horizon semantics in (a.4)/(h.3), (i.12.2) | Current, decision-gated contracts; raw holiday identity and occurrence timestamps are distinct. No policy or fixture changes. |
| (a.3), (k.3) | Current coverage debt; realistic positive export coverage selected for planning, not old option-C deletion. |
| (a.9–10), (b.1–10), (c), (d.2–3), (g), (h.1–4), (i) except (i.9), (j.1/3–4), (k.1/3) | Current limitations or retained choices; ownership/behavior/modernization/support decisions remain individually gated. Repaired subclaims take precedence as noted here and in their addenda. |
| (d.1) application imports, (d.6) R2 npm highs/Moment advisory | Repaired; zero application Moment imports. The upstream holiday Moment/CJS footprint and remaining advisories are current, not repaired by import removal. |
| (b.12–14) | Supported current configuration plus conditional upstream constraints; ESLint 10 already installed, Node-side resolution is node16, mock-hoisting workaround remains. No new upstream-fix probe was run. |
| (d.5–6), (m.1) | Current dependency/image risk or compatibility holds; npm audits refreshed, old container scan/registry currency retained as historical. KL03–KL05/KL17–KL19 own fresh decisions. |
| (f), (i.9), (m.2) | Linux app://duely launch/base/deb evidence already exists; old installer/never-launched/file:// blockers are superseded. Native save remains unimplemented and decision-gated. |
| (h.5–6), (j.2/5), (k.2) | Prior duplication/healthcheck/cold-load/guard repairs retained. Live DateAdapter locale change remains separate in (i.12.1). |
| (j.3 U5) | Feasible runtime title feature, not permanent architectural impossibility; static English retention/change remains KL25's choice. |
| (k.4) | Bounded historical Material rasterization evidence, not a layout defect or new full visual pass. |
| (f) Windows prerequisite, (l), (m.2) optional formats | Conditional/deferred platform work; configuration does not establish support. No native exception approved. |

**Fresh identity.** Revision `d47b59e2ac059d0c96250d07d491ba519677703d` on `dev-v2` (ahead one at
entry), with the earlier Known Limitations publication already unstaged. Docker 29.9.3; Node
26.13.0 / npm 11.20.0 on Linux arm64. Pinned development image:
`sha256:49ff3eb6511d27a8d7cfdcdab6754dbdd6c0ba584641714897dfcbf0224b9f8d`;
production image: `sha256:8097c30bb0c7395c08ea91825298887d528eb023fb358e3367b61db59ff17bf4`.
Workspace and both image locks have SHA-256
`b1ba02913604cca0838e4def31ce27e4223cb1b3b86eca0cc6611a1d38fd9c68`; root package.json is
`79c5d95a7e27fca8fb9b71e9517666ab559bc47eb77c2b9ae5c9ccd53becbe12`.
Retained direct installations match the lock. No install, image rebuild or host build/test execution occurred.

**Gates:** all sixteen reproduced R2's expected status: dependency tree 0/zero problems; app,
server, Electron, spec and E2E types 0; isolated server negative control 2/TS2322; lint 0/0E/7W;
UTC units 1/2F/131P (133, 18 files); focused Europe/Berlin 1/1F/23P (24); development/production
probes and distributions 0; Chromium dev/server E2E 0/22 passed twice (no skipped/flaky/failed).
This is an expected-red baseline, **not a green suite**. Full audit is exit 1/0C/0H/15M/3L = 18;
production scope and production image each exit 1/0C/0H/0M/3L = 3. The remaining lows are
`date-holidays` → parser → `deepmerge`; development moderates remain tooling-chain findings.
No new acceptance policy, downgrade, override or security remedy was applied.

The two exact failing names remain:

```
client/app/DatesAndCollisions/CollisionDetector.spec.ts > CollisionDetector > should return all holidays of Lower Saxony and the city of Augsburg in Bavaria of the year 2032
client/app/creator/creator.component.spec.ts > CreatorComponent > should call saveText and getICalString if input is valid
```

Canonical sorted newline-terminated SHA-256:
`18a9e5f4b3a02bc697f265cc14e2629f289c7abf79debe832d41ae2b73427b30`.
The holiday catalogue union passes; its collision-time comparison remains incompatible with the
retained host-local policy. The Creator test does not drive settled form validation after its model
edit and spies on a different service scope. No failing expectation or production behavior changed.

**Warning identities/current locations:** RouterTestingModule in About spec `13:34`, App spec
`27:17`, NotFound spec `13:37`, Settings spec `15:58`; `provideAnimationsAsync` at
`app.config.ts:59:5`; deprecated `saveAs` argument at `storage/electron-storage.service.ts:35:16`
and `storage/web-storage.service.ts:34:15`. Units emit 74 missing-icon messages, matching R2,
zero experimental storage warnings and zero NG0xxx/NG8xxx diagnostics. Production CommonJS
specifiers are `deepmerge`, `file-saver`, `moment-timezone`; development has none.

**Source/configuration reconciliation:** 65 TypeScript sources scanned, zero Moment imports,
18 client specs (seven with vi.spyOn), 127 EN/127 DE keys. Framework 22.2.5; build/CLI/Material/CDK
22.2.6; TypeScript 6.0.3; ESLint 10.14.0 / angular-eslint 22.6.0; Vitest 5.1.0 / jsdom 31.0.0;
Playwright 1.65.0 (browser metadata: Chromium revision 1254 / Chrome for Testing 158.0.8127.18);
Electron 45.2.3 (Node 24.22.2 / Chromium 156.0.8078.80). The TypeScript build peer remains `>=6.0 <6.1`. Angular's installed Title declaration exposes `setTitle()`; no runtime
title implementation was added. Current Holidays constructors are Settings `:62`, recurrence
settings `:103`, HolidayCatalogService `:38`; five HolidaysCountry aliases remain. Current
`MAT_DATE_LOCALE` factory is `app.config.ts:66–70`; native save IPC is `electron/main.ts:271–273`.
Other repaired date/form/public-method citations are reconciled in (a.3/9/10). Historical source
comments were not edited; they are not authoritative for the current lint/runtime configuration.

**Sizes and explained deltas:** development initial 5.54 MB; production initial **2,460,981 B**
(displayed 2.46 MB), zero budget warnings. Isolated transfer estimate is 399.78 kB versus R2's
399.85 kB. Both frozen-image and current-input `/app` controls reproduce R2's assets/index exactly;
the `/tmp`/symlink context changes generated names/symbols, not the total bytes or stylesheet.
The image differs from the workspace only in the wall-clock documentation comment and Apple's
`.gitignore` exclusions among selected non-Markdown inputs; transpilation and current-input `/app`
controls prove no executable delta. CSS SHA-256 remains
`0c637f9dd39bc30784b8c5ad15e0c60e1121d2d6a1e8bd36e2c8680ac58340da` (`styles-TLKQQXXL.css`).
Isolated server distribution: 2,739,779 B/29 files; Electron: 2,768,243 B/31 files. Server and
Electron Node bundles: 1,212 B/2,874 B. No new deb/package size is claimed.

**Production/platform limits:** a separate default-user control proves uid/gid 1000, HTTP 200 and
negative/positive readiness exits 1/0. Writable-evidence routes/audit inspection ran as root and
is not that non-root proof. Root, settings, bogus deep path, missing asset and license URL all
return the same 10,933 B index.html/200 with root base href. Actual parent-root license artifact:
56,795 B; HTTP fallback is not license delivery. Electron's Node-mode version probe is not a
GUI launch. Linux launch/deb evidence remains B12/E1/E2/R2 history; no new packaging, native
macOS/Windows, full visual/browser matrix or container scanner run occurred. Production base
layers 1–5 match E2; scanner databases can change, so historical rows are not newly measured or
a new risk waiver. KL03/KL04 own reassessment. M1/Windows remain conditional and separately gated.

**Evidence/preservation:** `.git/duely-batch-20261111/kl01/` retains identities, initial input
inventory/publication diff, all stopped attempts, `final-run/summary.json`, gate logs/codes,
normalized failure captures, audits, distribution inventory and both E2E trace trees;
`source-facts.json`, `asset-facts.json`, production audit/routes and default-user controls;
`build-input-discrepancy.json`, `build-context-input-control.json`, frozen/current `/app` build
controls/logs and `final-verification.json` / `final-document-verification.json`. Initial harness
stops (npm's symlink extraneous
classification, ANSI/soft-assert/project-prefix extraction) are explained and retained, not test
regressions. Completed gates were reused only after unchanged input-hash checks. Evidence under
`.git` is local/uncommitted; this durable summary and
[Testing Guide's KL01 record](TESTING_GUIDE.md#kl01-baseline) carry the portable result.
The workspace was read-only during baseline execution, preserving existing distributions/captures;
only the two scoped documentation files changed. At KL01 verification, the prior publication's
successor blocks were preserved; the subsequently authorized audit-plan amendment is recorded
separately above. Nothing was staged during baseline verification, and unrelated containers were
left running. No unexplained baseline delta remains. User acceptance and separate Git authority
have since been received; this documentation checkpoint closes the deferred Git step. No gate rerun
or successor was triggered by acceptance or this documentation-only commit.

<a id="kl02"></a>
#### KL02 — Decide browser and platform support, then encode the approved policy
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL01's current evidence; does not block independent security mitigation.
- **Sources:** (b.6), (d.4/d.6), (f) Windows prerequisite, (l), (m.2); package.json, angular.json, playwright.config.ts, .gitignore.
- **Decision gate:** Ask which browser families/versions and desktop OS/architectures are commitments versus experimental targets. Separately ask about native exceptions for M1/Windows. Do not infer Safari support from Linux Playwright WebKit or Windows support from targets.
- **Scope:** Encode the approved tracked browser policy, inspect effective Angular targets, and provision approved Docker browser projects. Chromium-only and broader support are both valid choices.
- **Exit/evidence:** Separate support intent from verified support; record effective targets, actual tested matrix, unsupported environments and revisit triggers.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, policy or environment decisions; explain the needed response.
- **Commit:** After approval and acceptance, commit approved targets, test configuration and support records under the commit contract.

<a id="kl03"></a>
#### KL03 — Assess all audit findings and select evidence-based remediation
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL01.
- **Sources:** (d.2/d.5/d.6), (b.3), (m.1); manifests, lockfile, Dockerfile and [explicit 18-finding audit scope](#audit-remediation).
- **Decision gate:** Present current advisory/CVE identities, affected versions, reachability and a costed alternatives/downgrade-impact comparison for both root npm advisories; ask which remedy to implement and about urgency or any residual-risk acceptance. npm fixAvailable is not proof that downgrades are necessary or compatible. Scanner totals alone do not prove exploitability; base-image findings are not all noise.
- **Scope:** Map all 15 moderate tooling and 3 low holiday-chain package findings to affected instances/parents and implementation tasks. Compare upstream/parent upgrades, supported backports, narrow overrides, owned patches/forks, replacement/removal and older releases using the shared assessment requirements. Candidate resolution/reproductions occur only in disposable Docker task areas after task approval; no main-tree install/change. Separate development, installed production dependencies, emitted browser code, Electron's embedded runtime, and OS/npm components; develop choices for KL04/KL05/KL13/KL14/KL17.
- **Exit/evidence:** Complete 18-finding disposition ledger, baseline/candidate dependency and audit identities, documented compatibility/security/data/support consequences and rejected alternatives, recommended implementation/gates and approved decisions. Unselected/blocked entries stay open with owner/mitigation/revisit trigger; assessment completion does not mean remediation completion.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, risk acceptance or remedy choices; explain the needed response.
- **Commit:** After approval and acceptance, commit the security assessment and approved decisions under the commit contract.

<a id="kl04"></a>
#### KL04 — Mitigate production-image exposure
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL03 and approval of the selected mitigation.
- **Sources:** (d.6); Dockerfile, docker-compose.yml, server manifests/build output.
- **Decision gate:** Compare a supported refreshed Node/base image, a smaller compatible runtime without unnecessary npm/tooling, or documented retention. Decide image pinning and refresh cadence; do not assume an alternative base exists.
- **Scope:** Compare the root production install with actual server needs; reduce shipped dependencies only through reproducible locks/installs. Preserve Node features, CA certificates, non-root execution, compression, licences and Node healthcheck.
- **Exit/evidence:** One clean build per approved image target, SBOM/scans before/after, runtime inventory, server probes, healthcheck negative control and route/export acceptance. Record residual findings; do not promise zero CVEs or reuse old base-layer evidence.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, image/install design or unresolved vulnerabilities; explain the needed response.
- **Commit:** After approval and acceptance, commit approved runtime/container changes and evidence summaries under the commit contract.

<a id="kl05"></a>
#### KL05 — Remediate the 15 moderate tooling findings and maintain dependency constraints
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL03 selects the approved tooling remedy.
- **Sources:** (b.12/b.13/b.14), (d.2/d.6), (m.1); manifests/lockfile and [18-finding audit ledger requirements](#audit-remediation).
- **Decision gate:** Obtain explicit approval of the compared remedy before new overrides, patches, replacements, major upgrades or downgrades; reassess existing overrides on evidence too. A downgrade requires the documented consequences, non-downgrade comparison and supported compatibility case, not merely a lower audit count.
- **Scope:** Apply the selected minimatch/ESLint/typescript-eslint/electron-builder-chain remediation across all affected instances. Keep angular-eslint coherent and Angular 22/TypeScript 6 support intact unless a wider migration is separately approved. Check versions, dist-tags, deprecation flags, peers, advisory regressions and optional boolean/tooling chains in Docker; use reproducible strict installs across manifests. No force audit repair, blind global override, unapproved downgrade, handwritten optional nodes or host install.
- **Exit/evidence:** Before/after ledger accounts for all 15 baseline moderate package findings and any new findings; full/production/image audits, clean peer/engine-strict installs, typed/template lint diagnostics and relevant type/build/unit/E2E gates verified against the accepted failing-name baseline. Packager changes additionally require fresh Linux deb build/install/payload/launch evidence without assuming native macOS/Windows support or silently changing Electron. If no safe candidate exists, present exact rejected alternatives and obtain explicit user deferral with owner/mitigation/revisit trigger; no manufactured remedy.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or package-policy decisions; explain the needed response.
- **Commit:** After approval and acceptance, commit approved dependency changes or the conditional outcome under the commit contract.

### Safety nets, date behavior and forms

<a id="kl06"></a>
#### KL06 — Restore realistic positive export coverage
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL01; positive coverage is the selected planning direction.
- **Sources:** (a.3), (k.3), (m); creator.component.spec.ts and Creator/form/storage boundaries.
- **Decision gate:** Approve the realistic positive-test scope; ask before production revalidation or any fixture-versus-product contract change.
- **Scope:** Drive a valid rendered form through validation into generation/saving and keep the invalid case. Await initialization/change detection; spy at the actual component injector scope rather than assuming TestBed's service is the component-provided instance. Cover filename, MIME/content and meaningful ICS fields at appropriate boundaries.
- **Exit/evidence:** Positive behavior passes and an isolated negative control fails when generation/saving breaks. Do not change production just to pass. Explicitly update failing-name inventory; KL08/KL09 independently govern the holiday failure.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or fixture/contract decisions; explain the needed response.
- **Commit:** After approval and acceptance, commit tests and the superseding option-C decision/baseline record under the commit contract.

<a id="kl07"></a>
#### KL07 — Audit broader coverage and dead-code candidates
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06.
- **Sources:** (k.3), (a.10), (b.4/b.10), (c.5), (h.2).
- **Decision gate:** Agree audit breadth and evidence standards; a percentage alone is not assurance.
- **Scope:** Inventory dates, recurrence, alarms, persistence, actions, server/protocol and export coverage; prove vacuous assertions and static/dynamic dead candidates individually. Apply only explicitly included bounded repairs. Add newly discovered implementation tasks here and obtain separate approval before work.
- **Exit/evidence:** Behavior/coverage inventory, demonstrated findings and scoped repair recommendations; no unauthorized deletion or automatic follow-up.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, audit scope or material findings needing input; explain the needed response.
- **Commit:** After approval and acceptance, commit audit results and approved bounded test repairs under the commit contract.

<a id="kl08"></a>
#### KL08 — Choose the date and recurrence contracts from examples
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** relevant KL06/KL07 safety-net findings.
- **Sources:** (a.2/a.4), (h.3), (i.12.2), (m); wall-clock.ts, recurrence/collision and export adapters.
- **Decision gate:** Ask in small batches about host-local versus explicit event-time collisions; inclusive final UI day versus midnight; inclusive UI all-day end versus explicitly exclusive end while preserving RFC-exclusive DTEND; default 100 years, unrestricted input, internal 2080 fallback and practical holiday-exclusion horizon.
- **Scope:** Show UTC, Europe/Berlin and west-of-UTC examples for floating/named events, holiday-country days, DST, overnight/all-day events, UNTIL and EXDATE. Distinguish holiday identity from occurrence timestamps; an infinite RRULE does not make finite EXDATEs infinite coverage.
- **Exit/evidence:** Approved contracts, examples, migration/compatibility consequences and oracles. No implementation, fixture rewrite, arbitrary cap or trimmed database in this decision task.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval and each required contract choice; explain the needed response.
- **Commit:** After approval and acceptance, commit decisions/examples and any explicitly retained limitation under the commit contract.

<a id="kl09"></a>
#### KL09 — Implement the chosen collision and EXDATE contract
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** approved KL08 collision contract.
- **Sources:** (a.2/a.7), (m); patterns, EventCollisionData, appointments.service.ts, collision/public-export guards.
- **Decision gate:** Implement only the chosen contract; pause for missing semantics or oracle conflicts.
- **Scope:** Separate holiday identity from excluded occurrence where required; remove host dependence only if approved. Preserve the independent 15-date/reason 2032 catalogue oracle. If host-local behavior is retained, characterize it without claiming the incompatible raw-instant collision assertion repaired; redesigning that assertion requires an explicit API-contract decision.
- **Exit/evidence:** Actual recurrence exclusions, reasons, order/deduplication, overnight/input immutability, floating/named-zone and DST behavior across hosts verified; exact accepted failing-name delta recorded.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, unresolved semantics or oracle conflicts; explain the needed response.
- **Commit:** After approval and acceptance, commit approved boundary changes, strong tests and baseline delta under the commit contract.

<a id="kl10"></a>
#### KL10 — Implement approved UNTIL, all-day and horizon behavior
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** corresponding KL08 choices; KL09 where shared boundaries require it.
- **Sources:** unresolved (a.4) semantics, (h.3), (m); recurrence forms/validators/wall-clock/export boundaries.
- **Decision gate:** Confirm any missing behavior or persisted-value migration decision before changing it.
- **Scope:** Implement selected UI semantics and RFC serialization consistently; preserve hydration/wall clocks. Explain finite-horizon limits in UI/exports; no silent truncation or widening.
- **Exit/evidence:** Final-day timed events, RFC-exclusive all-day DTEND, COUNT/UNTIL/NEVER, leap years, DST, reopening, old values and approved exclusion horizon guarded.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or missing behavior/migration choices; explain the needed response.
- **Commit:** After approval and acceptance, commit approved boundary/validation changes and regression evidence under the commit contract.

<a id="kl11"></a>
#### KL11 — Decide and implement named-zone export self-containment
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** applicable KL08–KL10 contracts.
- **Sources:** (i.12.2); appointments.service.ts and timezone/download guards.
- **Decision gate:** Compare VTIMEZONE, an approved alternative export policy, or documented consumer dependency. Ask which payloads/consumers and range/horizon matter; assess maintenance, licences and payload before selecting generator dependencies.
- **Scope:** Implement only the selected self-containment/export policy. Do not substitute a UTC recurring rule that changes local recurrence across DST; explicitly record unguaranteed infinite-range behavior.
- **Exit/evidence:** Parsed/imported calendars resolve intended occurrences, offsets, DST and EXDATE within scope; floating/all-day remain correct. Deferred consumer/range limits are precise.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or payload/consumer/horizon decisions; explain the needed response.
- **Commit:** After approval and acceptance, commit export changes/interoperability tests or explicit deferral under the commit contract.

<a id="kl12"></a>
#### KL12 — Replace dual form/model binding with explicit synchronization
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06, relevant KL07 coverage and settled date contracts.
- **Sources:** (a.9); creator-family forms and wall-clock helpers.
- **Decision gate:** Present scoped reactive-form source-of-truth/projection alternatives; ask about validation ownership or broader signals. No automatic signals/DI/zoneless migration.
- **Scope:** Replace load-bearing dual binding with explicit model updates, validation, subscriptions/lifecycle cleanup and current-version notifications. Recheck old OnPush assumptions against current ChangeDetectionStrategy.Eager usage. Avoid repeated dirtying from view-checked hooks.
- **Exit/evidence:** All groups, programmatic dates, collapsed/reopened views, alarms, recurrence and actual model/form/export values stay synchronized under regression coverage.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or state/validation architecture decisions; explain the needed response.
- **Commit:** After approval and acceptance, commit synchronization refactor and model/form/export guards under the commit contract.

### Holiday architecture and performance

<a id="kl13"></a>
#### KL13 — Select remediation for the 3 production findings and the holiday-backend strategy
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL03; KL08 and relevant coverage before any choice that changes date/recurrence semantics. Bounded security-only assessment need not wait for unrelated collision/UNTIL decisions.
- **Sources:** (b.3), (d.1/d.5), (h.1–5) and [production audit-chain requirements](#audit-remediation).
- **Decision gate:** Compare fixed upstream/parent releases, supported backports, a narrowly owned deepmerge/parser security patch or replacement, backend replacement and older-version candidates against explicitly accepted retention. Examine date-holidays 1.8.4's API/rule/data/support and transitive-security implications; do not presume npm's proposal is necessary or viable. Ask before reducing countries/regions/dates or accepting residual risk; decide whether benefit justifies migration.
- **Scope:** Account for date-holidays, date-holidays-parser and deepmerge as three propagated findings from one advisory, preserving all affected-instance identities. Assess bundled-rule/untrusted-input reachability and an advisory reproducer; compare merge semantics, rule/localization/location parity, timezones, bundle composition, raw/gzip/parse costs and stateful APIs. App Moment replacement is done; only upstream footprint remains. Full required timezone correctness is mandatory; trimmed builds/arbitrary UNTIL caps are not automatic solutions. Reconsider the app date-library choice only on demonstrated inadequacy.
- **Exit/evidence:** Candidate-by-candidate comparison with compatible resolved trees, support/security/maintenance/licensing costs, demonstrated downgrade regressions or unavailable alternatives, selected remedy/rollback and approved parity/performance/security gates. No safe remedy means an explicit user decision on deferral/mitigation/owner/revisit trigger, not silent acceptance of the three production findings.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or backend/patch/coverage/performance choices; explain the needed response.
- **Commit:** After approval and acceptance, commit comparison/strategy or retain/defer outcome under the commit contract.

<a id="kl14"></a>
#### KL14 — Implement and verify the approved production holiday-chain remedy
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL13 selects a viable approved change; applicable safety nets and KL08 contract choices if behavior changes.
- **Sources:** (d.1/d.5), (b.3), (h.3/h.5) and [18-finding audit ledger](#audit-remediation).
- **Decision gate:** Apply only the chosen remedy, including any specifically approved older-version candidate; pause for parity failures/new advisories/unavailable fixes. External issue reports or patch publication require separate authorization.
- **Scope:** Remediate the selected deepmerge/parser/backend chain while preserving required full timezone coverage and preventing duplicate data versions where relevant. Security-only changes preserve existing collision/UNTIL behavior. Reconcile all three production findings in installed and emitted browser/Electron code as well as the actual production image; a server-only dependency reduction is not complete remediation. If no safe remedy exists, request explicit user disposition before recording DEFERRED with owner/exposure/mitigation/trigger.
- **Exit/evidence:** Advisory regression and deliberate negative control, before/after full/production/image audits and exact three-finding ledger outcomes, country/state/region, multilingual rules, independent 2032 oracle, historical/future/DST samples, recurrence/exclusions, strict installs, licences and bundle inventory verified. Owned patches retain exact content/hash and reproducible install/maintenance instructions even if npm continues reporting them; no hidden or falsely green audit. Any blocked outcome needs documented alternatives and explicit acceptance.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, parity failures or unavailable remedies needing direction; explain the needed response.
- **Commit:** After approval and acceptance, commit approved backend changes/evidence or blocked-outcome documentation under the commit contract.

<a id="kl15"></a>
#### KL15 — Consolidate holiday ownership and duplicated types safely
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL13/KL14 outcome and KL07.
- **Sources:** (h.1/h.2), (a.10); catalogue/settings/recurrence/collision/service code and tests.
- **Decision gate:** Choose separate-purpose internal instances or independent construction; one shared mutable instance is not assumed safe. Reconsider the obsolete spec-edit prohibition.
- **Scope:** Centralize country/holiday types after inventory. Rewrite initializeCalendar spies through settings/public getICalString assertions before restoring privacy. Do not mislabel original single-site extraction as deduplication.
- **Exit/evidence:** Alternating locations/languages/years and metadata/calculation calls prove no contamination; public behavior guards pass and method privacy is restored where approved.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or ownership/lifecycle decisions; explain the needed response.
- **Commit:** After approval and acceptance, commit approved types/service/test-boundary cleanup and guards under the commit contract.

<a id="kl16"></a>
#### KL16 — Lazy-load holiday data through an explicit asynchronous boundary
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL12 and KL13–KL15 outcomes.
- **Sources:** (h.4), (b.3), (h.5); routes/catalogue/settings/recurrence/creator/export consumers.
- **Decision gate:** Present measured benefit versus loading-state/API cost; ask whether to proceed or retain eager loading.
- **Scope:** Remove eager imports from every consumer, not just relabel chunks/routes. Handle loading, retry/failure, stale requests, repeated saves and offline desktop; explicitly retain or revise export completion semantics.
- **Exit/evidence:** Initial/on-demand graph, gzip/parse/interaction costs and location/form/collision/download behavior measured without vacuous waits/bypasses or widened budgets.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, loading/API choices or material regressions; explain the needed response.
- **Commit:** After approval and acceptance, commit async loading/behavior/performance tests or explicit deferral under the commit contract.

### Currency, framework compatibility and build reliability

<a id="kl17"></a>
#### KL17 — Refresh Electron with renewed runtime and deb evidence
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL03/KL05; security urgency may move it earlier.
- **Sources:** (m.1), (d.2/d.4/d.6), (f).
- **Decision gate:** Confirm the currently published compatible non-deprecated version and whether to apply it; the document's 45.3.0 mention is not permanently newest.
- **Scope:** Update only the approved Electron scope; rebuild/provision once per image target and renew development/packaged Linux evidence.
- **Exit/evidence:** Embedded Node/Chromium recorded; deb installed/payload read back; app://duely routes/locales/base resolution launched; sandbox/isolation and relevant scans verified. Older runtime/package results stay historical.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, version choices or runtime/packaging blockers; explain the needed response.
- **Commit:** After approval and acceptance, commit Electron pin/lock changes and fresh acceptance records under the commit contract.

<a id="kl18"></a>
#### KL18 — Refresh Sass independently of the theme redesign
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL01/KL05.
- **Sources:** (m.1), (b.9); manifest/lockfile and styles.
- **Decision gate:** Confirm candidate release/changelog/compatibility and ask about substantive stylesheet changes if produced.
- **Scope:** Apply the approved Sass-only update and compare emitted production CSS before subsequent theme redesign where possible. A byte delta requires assessment, not automatic rejection or suppression.
- **Exit/evidence:** Clean Docker install/builds, CSS comparison and focused visual checks for real deltas; accepted new stylesheet baseline recorded.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, candidate choice or material CSS deltas; explain the needed response.
- **Commit:** After approval and acceptance, commit Sass-only dependency changes and comparison records under the commit contract.

<a id="kl19"></a>
#### KL19 — Maintain the framework/compiler/module compatibility gate
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL05.
- **Sources:** (b.12/b.13), (c.1/c.7), (e), (m.1).
- **Decision gate:** Ask before framework/tooling majors. TypeScript 7 is conditional on the selected builder's actual peer range; no ignored peers/suppression shortcut.
- **Scope:** Check peers, dist-tags, APIs, engines and embedded-runtime constraints. Keep node16 resolution unless a demonstrated supported migration warrants change. Never restore Webpack merely for a runner.
- **Exit/evidence:** Approved compatible changes pass app/spec/server/Electron/E2E type gates, lint/build/tests, or the precise incompatibility/hold and revisit trigger are recorded.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, major upgrades or compatibility blockers; explain the needed response.
- **Commit:** After approval and acceptance, commit approved compatible migrations or the updated hold under the commit contract.

<a id="kl20"></a>
#### KL20 — Reassess and migrate the deprecated animation path
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06/KL07 and current framework contracts.
- **Sources:** (d.3), (c.7); app.config.ts, actual Material controls and manifests.
- **Decision gate:** Compare removal of an unused legacy path, supported replacement and temporary retention. Do not assume every overlay needs rewriting or a future major automatically fixes it.
- **Scope:** Implement only the approved provider/animation path; remove the package only after runtime independence is demonstrated.
- **Exit/evidence:** Actual selects/datepickers/toggles and any used menu/tooltip/feedback controls work with keyboard, completion and reduced motion. Otherwise retain a precise removal trigger.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or provider/behavior choices; explain the needed response.
- **Commit:** After approval and acceptance, commit approved provider/package changes and targeted evidence under the commit contract.

<a id="kl21"></a>
#### KL21 — Repair meaningful test-harness/deprecation gaps
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06 and compatible framework/runner versions.
- **Sources:** (b.2/b.14), (c.7); icon providers, router specs and storage mocks.
- **Decision gate:** Choose real icon-provider coverage versus a focused explicit double; ask before runner upgrades/workaround removal. Reconsider old spec-edit restrictions.
- **Scope:** Replace RouterTestingModule with supported testing APIs. Prove registration/rendering rather than silence stderr; warnings are not production defects. Reproduce async-arrow/mock-hoisting through the Angular builder and remove helpers only when fixed. Warning identities matter, not old totals; saveAs autoBom belongs to KL31.
- **Exit/evidence:** Assertions remain meaningful, SVG/router behavior is covered and runner workaround removal is demonstrated or explicitly held upstream.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or harness/runner choices; explain the needed response.
- **Commit:** After approval and acceptance, commit meaningful tests/configuration or documented upstream holds under the commit contract.

<a id="kl22"></a>
#### KL22 — Harden build-process termination and diagnostics
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL01.
- **Sources:** (b.8); scripts/build.mjs disposal/signal and child-close handlers.
- **Decision gate:** Agree successful/rejected disposal, repeated-signal and signalled-child exit behavior before changing it.
- **Scope:** Handle disposal rejection without unhandled promises; retain child signal diagnostics and ensure failed/signalled builds never report success. Correct adjacent misleading comments only within scope.
- **Exit/evidence:** Docker tests demonstrate normal watch shutdown, deliberate disposal/signal failures and unaffected one-shot builds.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, exit-contract choices or reproduction blockers; explain the needed response.
- **Commit:** After approval and acceptance, commit lifecycle fixes, targeted checks and diagnostic evidence under the commit contract.

### Product metadata, localization, theme and accessibility

<a id="kl23"></a>
#### KL23 — Decide and repair calendar metadata defaults and blank PRODID behavior
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06; independent of most architecture work.
- **Sources:** (b.1); storage, Settings and calendar export.
- **Decision gate:** Separately choose institutional/neutral/hoster-configurable defaults and non-empty validation versus documented application fallback for blank/whitespace PRODID. Stopping a library default does not approve new branding.
- **Scope:** Implement selected defaults/validation/persistence policy without invented URL/PRODID branding or unintended changes to existing settings/overrides.
- **Exit/evidence:** Settings save/reload/cancel and emitted metadata verified; blank/corrupt values cannot unexpectedly substitute the library identifier under the approved policy.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or defaults/fallback/migration choices; explain the needed response.
- **Commit:** After approval and acceptance, commit approved metadata changes and persistence/export guards under the commit contract.

<a id="kl24"></a>
#### KL24 — Confirm Settings copy and correct legal customization instructions
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL23 if copy describes a new configuration route.
- **Sources:** (j.1/j.4/j.5), (j.3 U1–U4); both locale JSON files and legal source.
- **Decision gate:** Approve six Settings values/capitalization and EN/DE legal-hint replacements. Ask whether source customization suffices or a separately scoped hoster feature is wanted; no in-app legal editor exists today.
- **Scope:** Replace nonexistent generated-bundle/editor instructions with approved actionable copy. Preserve names/endonyms/licence names; reconsider Open Source terminology if requested. Keep conflicting historical approval provenance rather than inventing past consent.
- **Exit/evidence:** Approved parity-preserving copy works on cold load/language switch and points to a real customization workflow.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or exact bilingual wording choices; explain the needed response.
- **Commit:** After approval and acceptance, commit locale copy, content guards and related documentation under the commit contract.

<a id="kl25"></a>
#### KL25 — Reconsider the supposedly permanent untranslated document title
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL02's relevant browser intent.
- **Sources:** (j.3 U5); index.html and bootstrap/translation lifecycle.
- **Decision gate:** Choose static English versus runtime translation and approve EN/DE wording; route-specific titles are separate optional scope.
- **Scope:** If selected, use Angular Title or a supported equivalent on initial language/change, with static fallback and lifecycle cleanup. Otherwise retain as product choice, not architectural impossibility.
- **Exit/evidence:** Browser/Electron title correct after cold load/language switch, or explicit revised retention rationale.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or title scope/copy choices; explain the needed response.
- **Commit:** After approval and acceptance, commit the chosen title feature/tests or revised rationale under the commit contract.

<a id="kl26"></a>
#### KL26 — Update date-picker locale when language changes
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06 and KL08 where typed-date interpretation matters.
- **Sources:** (i.12.1), (j.2); app.config.ts, DateAdapter and Settings language changes.
- **Decision gate:** Confirm immediate switching and handling of existing ambiguous typed values; never silently reinterpret an appointment.
- **Scope:** Update the active adapter via supported runtime API rather than assume a factory re-resolves. Preserve picked/model dates and drafts.
- **Exit/evidence:** EN→DE→EN without reload, ambiguous typed dates, labels, existing/new forms and exported dates verified; remaining ambiguity explicitly recorded.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or typed-value interpretation choices; explain the needed response.
- **Commit:** After approval and acceptance, commit locale behavior and typed-date/export regressions under the commit contract.

<a id="kl27"></a>
#### KL27 — Repair theme, contrast, native color scheme and brand visibility together
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL02, KL18 where available and current Material contract.
- **Sources:** (i.1–5/i.7); theme/layout/palette/global styles, navbar/logo.
- **Decision gate:** Agree contrast target (recommend WCAG 2.2 AA), exact hexes versus tonal palettes, toolbar/logo and destructive red versus accent styling. Red may be deliberate semantics, not a defect.
- **Scope:** Derive approved surfaces/text/on-primary pairs; repair dark shell/cards, field/button/icon contrast, native color-scheme and light logo visibility. Remeasure old contrast numbers; primary alone does not derive every foreground.
- **Exit/evidence:** All eight accents/both modes meet the selected contrast target and approved representative interactions/visibility checks.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or accessibility/branding/color choices; explain the needed response.
- **Commit:** After approval and acceptance, commit coherent theme changes and contrast/visibility evidence under the commit contract.

<a id="kl28"></a>
#### KL28 — Enable meaningful accessibility checks and complete action semantics
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL02 and approved accessibility target; coordinate KL29's shared template.
- **Sources:** (c.8), (i.11), relevant (g) tooltip/expansion choices; lint/templates.
- **Decision gate:** Ask about the supported accessibility preset, useful help/tooltips and translated names. Tooltips alone are not accessible names.
- **Scope:** Inventory icon actions; implement names, keyboard/focus/expanded-state semantics and appropriate headers/decorative icons. Enable selected rules without blanket suppression or hiding findings as ignored warnings.
- **Exit/evidence:** Keyboard/browser accessibility-tree behavior verified. Actual screen-reader acceptance is separately labeled if user-assisted. Zero lint findings do not establish overall accessibility.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or standard/help/copy/manual acceptance choices; explain the needed response.
- **Commit:** After approval and acceptance, commit lint/interaction changes and clearly separated automated/manual evidence under the commit contract.

<a id="kl29"></a>
#### KL29 — Prevent removal from unintentionally toggling another appointment
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06; coordinate shared edits with KL28.
- **Sources:** (i.12.3); Creator template/component.
- **Decision gate:** Confirm removal should preserve the survivor's expansion and focus context.
- **Scope:** Stop inappropriate propagation or use the approved semantic header; update assertions to approved behavior, not remove them.
- **Exit/evidence:** Multiple-card removal preserves data/form identity, expansion, keyboard/focus context and exported survivors.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or unexpected survivor/focus effects requiring direction; explain the needed response.
- **Commit:** After approval and acceptance, commit the interaction fix and regression guards under the commit contract.

<a id="kl30"></a>
#### KL30 — Reassess the chosen time picker before adding a dependency
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL02/KL08, KL12 if needed and KL20's Material contract.
- **Sources:** (i.10/i.4); appointment/alarm time inputs.
- **Decision gate:** Compare repaired native inputs, a supported first-party Material picker if available and prior ngx-mat-timepicker choice. Check peers/maintenance/security/locales/accessibility/payload; ask whether to replace and include alarms.
- **Scope:** Implement only the selected controls/dependency scope; the old choice is not an automatic installation command. Retaining native inputs is valid if safer benefit is not demonstrated.
- **Exit/evidence:** HH:mm/wall clocks, keyboard/touch/locales, validation, model/export equality and offline Electron verified.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or picker/package/scope choices; explain the needed response.
- **Commit:** After approval and acceptance, commit selected controls/dependencies/guards or revised native retention under the commit contract.

<a id="kl31"></a>
#### KL31 — Decide whether FileSaver remains necessary
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06/KL02; coordinate KL33's native-save contract, without requiring its implementation first.
- **Sources:** (b.3), (c.7) autoBom, (a.1); web/Electron storage and save flow.
- **Decision gate:** Compare supported FileSaver options, browser Blob/object-URL download and separate Electron bridge; CJS warnings alone do not prove a defect.
- **Scope:** Preserve filenames, calendar MIME, Unicode/content, BOM policy, user initiation, applicable cancel/errors and URL cleanup. Remove FileSaver/types only after all consumers disappear; no warning-suppression allowlist merely to hide bailouts.
- **Exit/evidence:** Supported-browser downloads and actual ICS bytes verified; deprecated API repaired or replacement justified.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or download/BOM/API choices; explain the needed response.
- **Commit:** After approval and acceptance, commit chosen downloads/guards or supported API repair under the commit contract.

<a id="kl32"></a>
#### KL32 — Reconsider native blocking invalid-input feedback
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06, KL12 where relevant and KL28 expectations.
- **Sources:** (b.7); Creator validation/save feedback.
- **Decision gate:** Choose focused inline feedback, accessible snackbar or native alert retention; agree dismissal/focus/translations.
- **Scope:** Implement selected feedback without losing drafts or adding a snackbar solely for appearance.
- **Exit/evidence:** Invalid forms never generate/save; feedback, repeated validation, focus, keyboard and EN/DE behavior guarded.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or feedback/copy choices; explain the needed response.
- **Commit:** After approval and acceptance, commit chosen feedback/negative-export guards or retention rationale under the commit contract.

### Desktop saving and scoped cleanup

<a id="kl33"></a>
#### KL33 — Implement Electron saving through a narrow secure bridge
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL06, accepted KL17 runtime, stable export/async outcomes and KL31 contract.
- **Sources:** (f), (c.4), (b.4), resolved (i.9); Electron main, storage/factory, app.config.ts and build script.
- **Decision gate:** Separate native ICS saving from localStorage settings persistence. Choose capability detection versus target build and needed DI changes. Do not blindly flip isElectron: it also changes LocationStrategy/APP_BASE_HREF and could undo app://duely path routing.
- **Scope:** If approved, replace pong with a typed minimal preload/contextBridge and main dialog/write API. Validate caller origin/arguments; expose no general filesystem/IPC. Preserve sandbox/isolation, disabled Node integration, navigation restrictions and root-base resolution.
- **Exit/evidence:** Development/packaged Linux really save ICS; cancel/overwrite/errors and selected settings persistence work; web unchanged. Verify rejection controls and saved/generated byte equality. Current ElectronStorageService duplicates FileSaver, not native filesystem access.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, bridge/persistence/routing choices or native dialog/permission intervention; explain the needed response.
- **Commit:** After approval and acceptance, commit approved preload/main/storage/build integration and secure-save guards under the commit contract.

<a id="kl34"></a>
#### KL34 — Remove proved dead artifacts and correct misleading source guidance
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL07 for deletion evidence, KL27 for palette consumers and KL33 for obsolete environment branches, only where applicable.
- **Sources:** (b.4/b.9/b.10), (c.5), (i.6/i.8), proved KL07 candidates.
- **Decision gate:** Ask before removing retained environments; decide if real week numbers are wanted. A week-number feature needs a separately scoped task. Confirm unused helper removal while preserving labels/accent/swatches.
- **Scope:** Prove static/dynamic unreachability; preserve needed configurations. Correct Sass wording/type-only imports. Reset body margin and measure overflow rather than hide it. Low-risk comment/margin/inert-attribute subscopes may be separately approved early with bounded acceptance and no automatic successors.
- **Exit/evidence:** Approved candidates removed without live consumer damage; focused build/layout guards prove the cleanup.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or retention/deletion/week-number choices; explain the needed response.
- **Commit:** After approval and acceptance, commit only proved approved cleanup and focused evidence under the commit contract.

<a id="kl35"></a>
#### KL35 — Reevaluate harmless modernization and every rejected alternative
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** relevant coverage/current framework information.
- **Sources:** (c.1–6), every (g) table row and related historical architectural choices.
- **Decision gate:** Present keep/change/defer recommendations and measured benefits before reversals. Removing migration-era restrictions does not authorize wholesale rewriting.
- **Scope:** Revisit class/functional guards, standalone flags, signals/zoneless/current updates, factory new/DI, import type and constructor/inject. Rescore MatTable, MatExpansion, icons/fonts/CDN, Roboto, all-component themes, MatGridList, dialog/chips/tooltip/sidenav/menu, exclusion-row, standalone:false and Bootstrap grid against present offline/lifecycle/accessibility/maintenance/size needs. Old KB estimates are not current measurements.
- **Exit/evidence:** Decision matrix covers every alternative. Delivered AOT/esbuild/lazy routes/catalogue extraction/change-detection/Playwright/ESLint/dead-tool/prod-environment/parity/i18n/ARIA repairs remain historical. KL13 governs trimmed data. Substantial optional rewrites become separately written/approved follow-ups; retaining harmless choices is valid.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or reversals/retain/defer confirmations; explain the needed response.
- **Commit:** After approval and acceptance, commit decisions and explicitly approved small changes only, with no speculative imports/wholesale rewrite, under the commit contract.

### Visual, platform and final acceptance

<a id="kl36"></a>
#### KL36 — Close the real visual/interaction coverage gaps
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL02 and relevant approved UI/form/async fixes; preceding tasks still receive focused acceptance.
- **Sources:** (k.1/k.4), (i), resolved (i.9); screenshot tooling and E2E.
- **Decision gate:** Confirm the final matrix and density acceptance, including actual 800×600 interaction, before capture. Preserve pilot/reduced Phase 13 sign-offs as history.
- **Scope:** Exercise six route states at 375/800/1440 widths, both modes and at least two approved accents where settings exist; expanded forms, dropdowns, persistence, cancellation, downloads and keyboard at 800×600. Empty-storage redirect is one truthful default state, not mislabeled theme/accent variants. Use KL27's approved contrast scope.
- **Exit/evidence:** Correct capture parameters/state setup and retain durable, commit-able tooling. Use a new evidence directory and preserve earlier captures; ignored scripts/PNG counts alone are not committed coverage. Classify bounded Material icon rasterization without ignoring new text/layout differences or weakening assertions. Distinguish browser evidence from actual Electron acceptance.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, matrix/density sign-off or material visual differences requiring input; explain the needed response.
- **Commit:** After approval and acceptance, commit approved verification tooling and durable summaries; preserve protected captures and report ignored evidence paths truthfully, under the commit contract.

<a id="m1"></a>
#### M1 — macOS packaging acceptance, still separately gated
- **Status:** PROPOSED; existing acceptance remains DEFERRED until separately approved. **Owner:** coordinator with user-operated native steps. **Needs:** approved macOS support intent, explicit native execution exception/user-operated workflow, user present and final relevant desktop state. Does not block other tasks.
- **Sources:** (l), (d.6), (m.2); the existing M1 identifier and historical records are retained.
- **Decision gate:** Ask whether to proceed, architecture/format, and unsigned local acceptance versus distribution signing/notarization. No credentials or external publishing are assumed.
- **Scope:** Arm64 DMG first unless another target is requested; the user starts and observes each native build/mount/install/launch. Record sandbox/entitlements and base resolution, routes/empty storage/locales, and native saving if implemented. Never bypass Gatekeeper or claim macOS support from a Linux cross-build.
- **Exit/evidence:** Record codesign, spctl and launch output verbatim, step by step. Either native acceptance with precise signing/distribution limits or an explicit unsupported-distribution outcome with the blocker recorded.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval, required user-run/observed steps, permission/signing decisions or blockers needing input; explain the needed response.
- **Commit:** After approval and acceptance, commit approved packaging changes and truthful acceptance/unsupported records under the commit contract.

<a id="kl37"></a>
#### KL37 — Decide and verify Windows packaging only if wanted
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL02's support decision, authorized Windows environment/native execution authority and final relevant desktop state. Independent of web/Linux closure.
- **Sources:** (f) Windows prerequisite, (d.6), (m.2).
- **Decision gate:** Ask whether Windows support is wanted, architecture/package format and native execution authority; otherwise defer with a trigger. Signing is a separate explicit choice.
- **Scope:** Empirically re-resolve required optional tooling without handwritten lock entries or trusting previously ineffective flags. Do not blindly overwrite the accepted Linux lock or infer failure/support from configuration.
- **Exit/evidence:** Audit/install/package/launch in the authorized environment, exercise routes/locales/saving/platform security and record measured acceptance, or explicit deferral with alternatives and trigger.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or platform/environment/signing choices; explain the needed response.
- **Commit:** After approval and acceptance, commit approved platform/lock changes and acceptance, or explicit deferral, under the commit contract.

<a id="kl38"></a>
#### KL38 — Reconsider deb-only scope without automatically restoring AppImage
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL02 distribution intent and relevant final desktop state.
- **Sources:** (m.2) and historical (g) packaging assumptions.
- **Decision gate:** Ask whether deb-only remains sufficient and why another format is needed; benefits must justify acceptance and maintenance cost.
- **Scope:** Retain deb-only with refreshed rationale, or add only an explicitly selected target and actually install/mount/run it in an authorized suitable environment. AppImage extraction alone is not normal mounted-form acceptance.
- **Exit/evidence:** Selected artifact contents, licences, sandbox, routes/locales/saving and installation/mount/run verified. Keep unavailable FUSE/native acceptance explicit; retention is a valid outcome.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or distribution-format/runtime-environment choices; explain the needed response.
- **Commit:** After approval and acceptance, commit selected packaging/evidence changes or refreshed deb-only decisions under the commit contract.

<a id="kl39"></a>
#### KL39 — Final approved integration, acceptance and residual-risk reconciliation
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** only named approved completed scopes; separately approved integration scope. Optional/deferred tasks are not silently included.
- **Sources:** All original sections and task records.
- **Decision gate:** Approve the named integration/gate scope and residual-risk outcome; pause for unresolved deltas. No blanket code review is assumed. If requested, separately define/approve its target and use one review agent covering completeness, correctness and impact.
- **Scope:** Integrate named disjoint candidates if any and use proportional Docker gates, including broad final gates for shared date/form/dependency/runtime changes. Reconcile the [18-finding audit ledger](#audit-remediation): each baseline identity and any new finding needs a verified remedy, explicitly accepted risk/deferral or visible pending owner/decision; do not declare all audit remediation complete while entries remain pending. Keep npm, emitted-code, embedded-runtime and OS/image scopes distinct. Reconcile stale ownership/baseline pointers without deleting provenance. Testing Guide procedures/results are updated only when explicitly included; this file keeps task ownership.
- **Exit/evidence:** Strict installs/dependency graph; app/spec/server/Electron/E2E types; lint; named unit outcomes in UTC/Berlin plus approved additional zones; builds; server/protocol probes; real content/persistence/download guards; scans; relevant final deb launch, licences and visual evidence. Account for every discrepancy. Every original issue has a verified repair, conscious retention, pending decision, upstream/environment blocker or disproved/historical outcome.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for integration approval, residual-risk acceptance or unresolved gate deltas requiring input; explain the needed response.
- **Commit:** After approval and acceptance, commit approved integration and final task/limitation/evidence reconciliation under the commit contract, then stop; no push or automatic successor.

<a id="kl40"></a>
#### KL40 — Correct server fallback policy and retain/distribute licence notices
- **Status:** PROPOSED. **Owner:** coordinator. **Needs:** KL01 and applicable KL02/KL23 deployment decisions; may run early independently of client architecture. Its late ID is not execution priority.
- **Sources:** (b.5/b.11); server/app.ts, Angular/build output and Docker/Electron packaging manifests.
- **Decision gate:** Ask which methods, Accept values, extensions/reserved asset paths and ambiguous extensionless requests qualify as SPA navigation. Decide unknown-route HTTP status separately from missing-asset 404s; a rendered not-found view does not establish server 404. Separately choose licence distribution and optional HTTP exposure; no compliance violation is presumed.
- **Scope:** Replace unconditional fallback only with approved policy. Retain/distribute required notices in server containers and Electron packages. If /3rdpartylicenses.txt exposure is selected, serve only that known artifact without broader filesystem access; preserve Express-5 alignment and deep/base routing.
- **Exit/evidence:** GET/HEAD/non-navigation methods, HTML/non-HTML Accept, missing/existing assets, nested routes, compression, true 404s and negative controls verified, with notice-distribution evidence.
- **Attention:** Play `afplay /Users/heg20/Downloads/icq-message.wav` for approval or HTTP-status/fallback/licence-exposure choices; explain the needed response.
- **Commit:** After approval and acceptance, commit approved server/packaging changes, probes and notice-distribution evidence under the commit contract.

<a id="issue-coverage"></a>
### Complete original-issue coverage ledger

Every original subsection links to its owner below. A task can preserve a repaired historical boundary
as well as own a remaining issue. These links are not repair or acceptance claims. All entries are
also subject to [KL01](#kl01) factual reconciliation and [KL39](#kl39) final outcome accounting.

| Original entry | Task/outcome ownership |
|---|---|
| (a.1) | Repaired seam retained; [KL06](#kl06)/[KL21](#kl21)/[KL31](#kl31) guard it; KL01 preserves history. |
| (a.2) | [KL08](#kl08) decision and [KL09](#kl09) collision/oracle contract; loop repair remains historical. |
| (a.3) | [KL06](#kl06) positive coverage supersedes planned deletion under option C; [KL07](#kl07) broader audit. |
| (a.4) | Representation repair retained; unresolved UNTIL/all-day semantics [KL08](#kl08)/[KL10](#kl10). |
| (a.5–8) | Repaired boundaries retained in [KL01](#kl01) and affected date/form/export acceptance; no duplicate repair tasks. |
| (a.9) | [KL12](#kl12) explicit synchronization; optional reactivity choices [KL35](#kl35). |
| (a.10) | [KL07](#kl07)/[KL15](#kl15) public-behavior testing and method privacy. |
| (b.1) | [KL23](#kl23) separates institutional defaults from blank-PRODID behavior. |
| (b.2) | [KL21](#kl21) meaningful harness coverage; never a production defect. |
| (b.3) | [KL13](#kl13)–[KL16](#kl16) holiday footprint; [KL31](#kl31) FileSaver; KL01 historical specifier clarification. |
| (b.4) | [KL33](#kl33) desktop design before [KL34](#kl34) deletion/retention. |
| (b.5) | [KL40](#kl40) dedicated server/licence scope, not hidden in final acceptance. |
| (b.6) | [KL02](#kl02) targets and [KL36](#kl36) actual coverage. |
| (b.7) | [KL32](#kl32) feedback decision/implementation. |
| (b.8) | [KL22](#kl22) lifecycle robustness. |
| (b.9–10) | [KL34](#kl34) comments/dead helpers; live palette/token behavior [KL27](#kl27). |
| (b.11) | Express alignment repaired; [KL01](#kl01)/[KL40](#kl40) preserve regression evidence. |
| (b.12–13) | [KL05](#kl05)/[KL19](#kl19) coherent upstream/configuration compatibility, not rollbacks. |
| (b.14) | [KL21](#kl21) builder-path reproduction/conditional helper removal; [KL05](#kl05) compatible runner maintenance. |
| (c.1–6) | [KL35](#kl35) explicit optional-modernization reconsideration; actual form/DI needs [KL12](#kl12)/[KL33](#kl33); small approved types cleanup [KL34](#kl34). |
| (c.7) | Router tests [KL21](#kl21); animation [KL20](#kl20); FileSaver autoBom [KL31](#kl31); future API removals [KL19](#kl19). |
| (c.8) | [KL28](#kl28) accessibility scope/lint/real behavior. |
| (d.1) | App Moment replacement retained; upstream remnant [KL13](#kl13)/[KL14](#kl14). |
| (d.2) | [KL05](#kl05) optional deprecated tooling; [KL17](#kl17) may change Electron's chain. |
| (d.3) | [KL20](#kl20) actual provider/animation dependency. |
| (d.4) | Engine alignment repaired; [KL02](#kl02)/[KL17](#kl17)/[KL19](#kl19) future runtime/platform acceptance. |
| (d.5) | [KL03](#kl03) maps all 3 production package findings; [KL13](#kl13)/[KL14](#kl14) compare and implement the approved upgrade/patch/replacement/older-release remedy, or explicit user-accepted deferral. [Audit requirements](#audit-remediation) govern downgrade consequences and alternatives. |
| (d.6) | [KL03](#kl03) maps all 18 npm findings (including the production 3); [KL05](#kl05) remediates the 15 moderate tooling findings; [KL13](#kl13)/[KL14](#kl14) own the production chain; [KL04](#kl04) image risk; [KL17](#kl17) embedded runtime; [M1](#m1)/[KL37](#kl37)/[KL38](#kl38) platforms. R2 repairs remain historical. |
| (e) | Closed upgrade path stays closed; future compatible work [KL19](#kl19); native [M1](#m1) distinct. |
| (f), including disproved beliefs and old file:// risk | [KL01](#kl01) historical clarification; [KL33](#kl33) real native saving. Disproved archive/library/OS attributions need new evidence; observations and revisable product choices stay distinct. |
| (f) Windows prerequisite | [KL37](#kl37), no handcrafted restoration or unsupported build claim. |
| (g), every table row | [KL35](#kl35) current decision matrix; delivered items historical. Tooltips [KL28](#kl28), trimmed zones [KL13](#kl13), form lifecycle [KL12](#kl12). |
| (h.1–2) | [KL13](#kl13) strategy and [KL15](#kl15) safe ownership/shared types. |
| (h.3) | [KL08](#kl08) horizon; [KL13](#kl13)/[KL14](#kl14) correctness-preserving backend choice, no automatic trimming. |
| (h.4) | [KL16](#kl16) real lazy data boundary. |
| (h.5–6) | Budget duplication/healthcheck repaired; [KL01](#kl01) history, [KL04](#kl04) healthcheck control, [KL14](#kl14)/[KL16](#kl16) graph checks. |
| (i.1–5) | [KL27](#kl27) coherent theme/contrast/native scheme/brand visibility. |
| (i.6) | [KL34](#kl34) margin/overflow; [KL36](#kl36) matrix acceptance. |
| (i.7) | [KL27](#kl27) user-selected destructive/accent semantics, not an assumed bug. |
| (i.8) | [KL34](#kl34) inert markup removal or separately approved real week-number feature. |
| (i.9) | Repaired app://duely/base contract; [KL01](#kl01) history and [KL33](#kl33)/platform guards. |
| (i.10) | [KL30](#kl30) freshly evaluated picker/scope. |
| (i.11) | [KL28](#kl28) names/help/keyboard/assistive-technology evidence. |
| (i.12.1) | [KL26](#kl26) immediate DateAdapter locale behavior. |
| (i.12.2) | [KL08](#kl08) temporal contract; [KL11](#kl11) VTIMEZONE/interoperability. |
| (i.12.3) | [KL29](#kl29) propagation/survivor behavior coordinated with [KL28](#kl28). |
| (j.1) | [KL24](#kl24) explicit six-value wording confirmation. |
| (j.2) | Locale guards retained; live-locale gap [KL26](#kl26). |
| (j.3 U1–U4) | Conventional names/endonyms retained or specifically reconsidered in [KL24](#kl24); no automatic proper-name translation. |
| (j.3 U5) | [KL25](#kl25) title feature or conscious static-title retention, not inherent impossibility. |
| (j.4) | [KL24](#kl24) accurate legal customization copy, no nonexistent app editor. |
| (j.5) | Cold-load/provenance history preserved by [KL01](#kl01)/[KL24](#kl24). |
| (k.1) | [KL36](#kl36) truthful matrix/800×600 interaction evidence; [KL02](#kl02) support scope. |
| (k.2) | Non-vacuous guards preserved/extended by affected tasks and [KL39](#kl39). |
| (k.3) | [KL06](#kl06)/[KL07](#kl07) coverage/dead-code audit and individually approved follow-ups. |
| (k.4) | [KL36](#kl36) region-bounded interpretation, no fake repair or weakened assertion. |
| (l) | [M1](#m1) separate interactive native acceptance. |
| (m.1) | Electron [KL17](#kl17), Sass [KL18](#kl18), peer-gated TypeScript [KL19](#kl19); recheck registry facts at execution. |
| (m.2) | [KL38](#kl38) deb/optional formats; [M1](#m1) macOS; [KL37](#kl37) Windows, no inferred support. |

### Dependency schedule

- **First approved work:** [KL01](#kl01) facts/baseline; after its acceptance, separately approve [KL03](#kl03) for the complete 18-finding ledger, alternatives and downgrade-impact assessment, and [KL06](#kl06) positive coverage. [KL02](#kl02) support decisions can develop alongside those scopes in a named approved batch. [KL04](#kl04)/[KL05](#kl05) and the bounded [KL13](#kl13)/[KL14](#kl14) production-chain security scopes take priority according to measured exposure; approval of this amendment starts none of them.
- **Early independent scopes:** [KL22](#kl22) lifecycle, [KL23](#kl23) metadata, [KL24](#kl24) copy, [KL29](#kl29) removal, [KL40](#kl40) server/licences and low-risk [KL34](#kl34) subscopes; each still needs its own dependencies, decisions and approval.
- **Dates:** KL06/KL07 → [KL08](#kl08) → [KL09](#kl09)/[KL10](#kl10) → [KL11](#kl11) and [KL12](#kl12) where contracts require it.
- **Holiday work:** KL03 → bounded security-only [KL13](#kl13) → separately approved [KL14](#kl14) if a safe remedy is selected. Backend/date-semantic changes also need KL08 and relevant coverage; no security urgency silently settles those contracts. KL13/KL14 outcome → [KL15](#kl15) → [KL16](#kl16); explicit form/export state and positive coverage precede async integration.
- **UI:** KL02 plus accessibility/branding choices → KL20/KL26/KL27/KL28 → approved KL30/KL32; focused acceptance in each task, final matrix in [KL36](#kl36).
- **Downloads/desktop:** Stable export completion + [KL31](#kl31) + accepted KL17 → [KL33](#kl33), preserving routing/base behavior.
- **Currency:** KL17 and KL18 are independent package scopes; security urgency can move Electron earlier. KL19 is compatibility-triggered, not an instruction to install TypeScript 7 now.
- **Platforms:** Final relevant client/runtime/storage state → separately approved [M1](#m1)/KL37/KL38 where wanted. Unwanted/unavailable formats stay explicitly deferred and do not block KL39.
- **Closure:** Only approved completed scopes → KL36 where applicable → [KL39](#kl39). KL40 precedes applicable final server/package acceptance despite its late ID.

### Acceptance and deferred outcomes

Each approved repair uses proportional Docker gates with explicit before/after results and explained
omissions. Shared date/form/export or dependency/runtime changes need broader acceptance than
copy/type-only cleanup. Deliberate negative controls must show important tests fail when behavior
breaks; conditional bypasses and screenshot counts are insufficient.

Security acceptance additionally follows the [explicit 18-finding audit requirements](#audit-remediation).
Each finding must have a verified remedy or an explicit user-accepted residual-risk/deferral record;
new findings and scope differences remain visible. A lower npm count, server-image dependency
omission, unsupported older toolchain or unchanged exploitability assumption is not sufficient.
A downgrade may be selected only after the alternatives and full consequences are presented and
its compatible, reproducible net-security outcome is accepted; no forced peers or silent loss of
holiday/data/platform behavior. KL03 acceptance alone does not close KL05/KL14 remediation.

Do not call the suite green until every remaining failure is actually removed under an approved
contract. Update intentional-behavior assertions and baselines through explicit decisions, not by
normalizing expectations to current code. Preserve the independent holiday-data oracle.

Every deferred outcome records **what remains broken or unsupported, why, the exact blocking
decision/upstream release/environment, available alternatives and mitigation, responsible owner,
and event/date for reconsideration**. Deferred is not resolved or forgotten. Explicitly accepting a
limitation can validly complete a task when no safe remedy exists; scoped documentation is still
committed only after approval under the commit contract.

### Planning and publication assumptions

- Only this documentation file is changed by publication; no remediation implementation, new test/build run, package installation, application-source edit, staging, commit or push is authorized or performed.
- At publication, historical measurements were source material, not newly reproduced verification, and KL01 was proposed. Its subsequent individual approval and fresh factual baseline are recorded above; original sections/provenance remain retained.
- Previous decisions can be revisited where a safer/useful fix could result. Proven/disproven technical observations require new evidence, not merely policy reversal.
- Optional features/modernization are not automatically required to close the plan. New findings are written here and separately approved before work starts.
- No credentials, signing purchase, external report, release, PR change or push is authorized. The supplied plan file is not edited.
