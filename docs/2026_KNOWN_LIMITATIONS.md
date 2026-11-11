# Duely — Known Limitations

**Status:** living record of accepted, deferred and upstream-owned limitations.
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

Sections **(a)–(g)** are the prescribed spine. Sections **(h)–(l)** carry (h) architectural deferrals,
(i) accepted UI defects and user-gated follow-ups, (j) the i18n backlog from the deleted
`docs/TODO-untranslated-strings.md`, (k) remaining visual and functional verification gaps, and
(l) the deferred macOS packaging acceptance that moved here from `docs/TODO_UPGRADES.md`.
The plan/reference retirement additions were checked against source at `f527f26`; the local handoff
was reviewed against source at `889b3e5`. The complete 6,276-line local task board was reviewed at
`74a271d`, including its terminal Phase 13 closure and later corrections to earlier OPEN records.
Both migration cycles are complete. Upgrade prerequisites and upgrade-owned date/export repairs now
live in `docs/TODO_UPGRADES.md`; the stable section labels below retain relocation pointers, not
claims of resolution. That upgrade board closed on 2026-11-11, and new work is tracked in
`docs/AI_TASKBOARD.md`. Accepted and unrelated deferred work remains here. Preparing that execution
plan does not authorize its implementation.
These documentation reviews used existing verification records and did not rerun tests or browser checks.

> **Line-number note.** Original closure citations were re-verified at `1f6fd97`; subsequent
> consolidations have their own source checkpoints above. Line numbers can drift. The preserved
> Phase 13 verification snapshot is in `docs/TESTING_GUIDE.md` §4, not a live migration task board.

---

## (a) TEST-AND-DATE WORK — PARTLY RELOCATED TO THE UPGRADE PLAN

The migration's locked decisions 3 and 9 barred test work and modernisation within that completed
cycle. The separately authorized upgrade cycle allows tests and necessary modernisation, but its
execution still requires task-level approval. Upgrade-sensitive findings have been moved to
`docs/TODO_UPGRADES.md` §2, which now owns their diagnosis, rationale, risks and acceptance criteria.
Relocation does not mean repair, and the creator coverage decision in (a.3) remains separately gated.

The recorded migration-closure baseline is **24 failed / 49 passed (73 total)**, failing-name md5
`172d78996b50c84e38211b529d76ab0b`. Commit `74a271d` refreshed holiday fixtures to 2032 and renamed
the failing test; its focused run stayed 1 failed / 2 passed. The full suite and hash have not been
remeasured since that change. Upgrade task P0 must capture current evidence without overwriting
historical evidence; no unrelated documentation task authorizes baseline changes.

### (a.1) `saveAs` test seam — RELOCATED, NOT FIXED

Diagnosis and non-vacuous mock/side-effect requirements moved to `docs/TODO_UPGRADES.md` §2.1.
Owner: A3 (Angular/test-runner alignment). This is upgrade-owned harness repair, not a requirement
that every existing storage test be green before the first upgrade.

### (a.2) Collision assertion defects — RELOCATED, NOT FIXED

Diagnosis, the completed 2032 fixture provenance and all-date/reason verification moved to
`docs/TODO_UPGRADES.md` §2.2. Owner: P1C, **before** date-holidays, ical-generator or date-library changes.
The calendar-fixture refresh did not repair assertion loops or change collision-time policy.

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

### (a.4) Mixed `untilDate` representations — RELOCATED, NOT FIXED

Full finding moved to `docs/TODO_UPGRADES.md` §2.4. P1F characterizes the existing boundaries;
D2 normalized them during the date-library conversion, without an unrelated whole-form rewrite.

### (a.5) Reverse-date start-time anomaly — RELOCATED, NOT FIXED

Full finding and historical attribution moved to `docs/TODO_UPGRADES.md` §2.4. P1F supplies
model-level coverage; D2 owns the stale-value repair, not the Angular-only upgrade.

### (a.6) Nineteen appointments-service failures — RELOCATED, NOT FIXED

The 10 serialization, 7 ordinal and 2 ICS/timezone failures, their causes and prior null-guard
repair moved to `docs/TODO_UPGRADES.md` §2.3. P1E establishes public-export guards; D1 owns
ordinal/boundary repairs and contract-reviewed expectations. A package bump alone is not a repair.

### (a.7) Serialized dates at the collision boundary — RELOCATED, NOT FIXED

Production defect moved to `docs/TODO_UPGRADES.md` §2.3. Owner: D1, following P1E regression
coverage. Runtime date conversion must replace the cast; manually Date-valued fixtures are insufficient.

### (a.8) UNTIL picker hydration — RELOCATED, NOT FIXED

Full finding moved to `docs/TODO_UPGRADES.md` §2.4. P1F covers first reveal/reopening; D2 must
restore the saved calendar day while retaining explicit OnPush notification.

### (a.9) Load-bearing reactive-form / `ngModel` dual bindings

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
- **WHAT WOULD CHANGE THE DECISION.** No production repair is needed. The exact **44** count belongs
  to the historical migration baseline, not a permanent gate for expanded upgrade tests. P0/A3 in
  `docs/TODO_UPGRADES.md` must attribute warning-count changes to actual renders/harness changes,
  not suppress diagnostics or treat these messages as user-facing errors. Adding icon providers
  solely to silence output is not an upgrade prerequisite.

### (b.3) CommonJS/AMD optimization-bailout specifiers (backlog §2(c)) — five since I2, three since D2

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

### (b.11) Express runtime/type skew — RELOCATED, NOT FIXED

Full finding moved to `docs/TODO_UPGRADES.md` §2.6. Owner: C1, aligning root/server runtime
manifests and root typings atomically. It is not a global prerequisite for client upgrades;
static serving, fallback behaviour and error paths must be checked at runtime.

### (b.12) The lint presets now come from the `angular-eslint` umbrella package (recorded 2026-11-10 by A4)

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

### (c.7) The `no-deprecated` warnings deliberately left untouched

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

### (d.1) `moment` / `moment-timezone` in maintenance mode, never replaced

- **WHAT.** At `74a271d`, **15** client TypeScript files import Moment: 10 from `moment-timezone`
  and 5 from `moment` (12 non-spec files and 3 specs). Moment is officially in maintenance mode.
- **WHY ACCEPTED.** Replacement was excluded from the completed migration under decision 9. The
  separately authorized upgrade cycle selected Luxon (`docs/TODO_UPGRADES.md` D2); the user then chose
  `date-fns` + `@date-fns/tz` instead and D2 implemented it — see the addendum below.
- **RISK.** Maintenance mode limits new feature development and leaves a large dependency footprint;
  it does not establish that timezone-data updates have stopped. No Europe/Berlin offset mismatch
  was found in the historical probes in (h.3), not an exhaustive correctness guarantee.
- **WHAT WOULD CHANGE IT.** The date-handling phase migrating to a maintained library.
- **D2 ADDENDUM (2026-11-10) — REPLACED, with a reviewed upstream remnant.** D2 converted the
  application to `date-fns` 4.4.0 + `@date-fns/tz` 1.5.0 (the user's decision, superseding the Luxon
  wording of `docs/TODO_UPGRADES.md` D2) and removed `moment-timezone` from the root `dependencies`;
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

### (d.3) Deprecated animations package — retention depends on actual usage, not a mandatory peer

- **WHAT.** `@angular/animations ^20.3.18` is npm-deprecated. The lockfile marks its
  `@angular/platform-browser@20.3.18` peer **optional**, correcting the former mandatory-peer claim.
  The app still supplies `provideAnimationsAsync()` (`client/app/app.config.ts:22,46`).
- **WHY ACCEPTED.** Removing an optional peer is not proof that the current animation/provider path
  works without it; retention must follow actual application and Material usage.
- **RISK.** A deprecation warning; premature removal can break the configured runtime path.
- **WHAT WOULD CHANGE IT.** A3/A4 in `docs/TODO_UPGRADES.md` reviewing the selected versions' peer/API
  contract and exercising Material controls before changing packages/providers. Do not assume later
  majors automatically fold this API into the platform.
- **A4 ADDENDUM (2026-11-10).** A3/A4 answered the question the other way: the package is **retained**
  at `@angular/animations` **22.2.5** because `client/app/app.config.ts` still supplies
  `provideAnimationsAsync()` and the Material controls it drives are exercised by the E2E gates. npm
  marks it deprecated in v22, naming `animate.enter`/`animate.leave` as the successor; adopting that
  API would change animation behaviour across every Material overlay and is **not** part of A4. The
  dependency stays a direct pin until a task explicitly owns that migration.

### (d.4) Runtime engine alignment — RELOCATED, NOT FIXED

The lax root/server/Electron `engines.node` ranges and their acceptance criteria moved to
`docs/TODO_UPGRADES.md` §2.7. Owners: B0, A4 and E1. Align each manifest when its runtime changes,
not only during final cleanup; Electron's embedded runtime is not necessarily the container runtime.
**A4 state (2026-11-10):** all three manifests declare `node ^26.0.0` / `npm ^11.20.0`, which already
satisfies Angular 22's `^22.22.3 || ^24.15.0 || >=26.0.0`, so A4 needed no engine edit;
`npm ci --engine-strict` accepts the regenerated lock in both image stages. Root Node typings and the
Electron-versus-container runtime measurement stay with D4/E1.

### (d.5) The `date-holidays` low advisory has no upstream fix (recorded 2026-11-10 by D3)

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
  next base-image bump" rule still governs them. See the R2 record in `docs/TODO_UPGRADES.md`.
- **PLATFORM SCOPE.** Linux arm64 in the container images is measured end to end. Electron 45.2.3 embeds
  Node 24.22.2 / Chromium 156.0.8078.80, which `engines` (`^26.0.0`) cannot cover because the `electron`
  devDependency pins it; the packaged main process needs only `electron`, `fs`, `path` and `url`. macOS
  packaging stays with the deferred task **M1** in (l) and Windows stays unverified.

---

## (e) ROADMAP POINTER — framework upgrades now belong to the working upgrade plan

The Material migration is complete. `docs/TODO_UPGRADES.md` now owns the Angular 20 → 21 → 22
path, current registry/peer evidence, test-runner ordering, strictness and theme safeguards. The
older compatibility snapshot is superseded by that plan's dated metadata, which must be refreshed
at execution time. In particular, Angular 21's build peer is stricter than its compiler peer.

The Webpack/build-angular retirement was already completed by task #52 (`aed844b`); do not restore
it to make a new runner work. Necessary upgrade changes are allowed, but unrelated signals/DI,
accessibility and theme rewrites remain deferred in (c), (i). Planning is not execution approval.

The board's one deferred item, macOS packaging acceptance (task **M1**), has since moved out of it and
is recorded in (l): it needs a macOS host and runs interactively with the user, so it was never part of
the numbered upgrade sequence.

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
- **WHAT WOULD CHANGE THE DECISION.** Upgrade task B0 in `docs/TODO_UPGRADES.md` owns clean-install
  bootstrap; B12 owns GUI-launch, custom-protocol and Linux packaging verification. Neither activates the
  currently inactive desktop-storage path or implements the save dialog; those need separate feature
  authorization after the runtime can be exercised.

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
- **RISK OF THE STATUS QUO.** No offset mismatch was found in the recorded Europe/Berlin probes:
  `require('moment-timezone')` resolves to `index.js` carrying the **FULL** data, matching independent
  `Intl.DateTimeFormat` results at the 13 timestamps spanning **1980–2200** preserved in
  `docs/TODO_UPGRADES.md` D2. These sampled results do not establish every instant/zone or guarantee
  future timezone legislation.
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
  `docs/TODO_UPGRADES.md` D2.
- **D2 ADDENDUM (2026-11-10) — the question moves upstream.** No application file imports
  `moment-timezone` any more, so the DECLINED build choice is no longer the application's: the remaining
  copy is `caldate`'s (see (d.1)), which needs a real zone database for holiday arithmetic, and its
  2.79 MB holiday chunk still ships. The 2126 default UNTIL now runs through `date-fns` `addYears` and is
  emitted as a date-only value, so the "trimmed build would shift 2126" argument no longer applies to
  client code. The declaration above still stands — the trimmed build stays declined, and no new
  evidence reopens it. The 13-timestamp table was re-measured in D2 in both images (150 offsets, 0
  `Intl` mismatches).

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

### (h.5) The integrated holiday upgrade pushes the initial bundle over budget — RESOLVED IN I2 (recorded 2026-11-10 by D3)

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

### (i.9) The missing `<base href="/">` (backlog item e / decision D20) — evaluated, SKIPPED, then RESOLVED by B12

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
  `.git/duely-batch-20261110/b12/web.json`, `desktop.json`, `quality.json` and
  `docs/TODO_UPGRADES.md` §B12.

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

### (j.2) Upgrade-sensitive locale verification — RELOCATED, NOT VERIFIED

Remaining runtime checks and their provenance moved to `docs/TODO_UPGRADES.md` §2.5.
Owner: P1W/A3/D2, with actual collision-export verification after D1. Legal cold-load rendering
was already fixed; this relocation does not authorize wording changes from (j.1) or (j.4).

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

### (k.2) Vacuous timezone/collision/export checks — RELOCATED, NOT FIXED

The selector defect, assertion-free collision placeholder and missing ICS-content/recurrence checks
moved to `docs/TODO_UPGRADES.md` §2.5. Owner: P1W **before** affected client upgrades; known-broken
exports remain explicitly classified until D1/D2 repair them. Historical 16/0 is not a semantic gate.
The broader visual matrix in (k.1) and general audit in (k.3) remain separate follow-ups.

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

### (k.4) The Material 22 datepicker toggle icon rasterises differently (measured, not a defect)

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

> **Relocated 2026-11-11** from `docs/TODO_UPGRADES.md` §4, where it was task **M1**, at the user's
> request to move it here and deal with it later. The identifier **M1** is kept so the B12/E1/E2/R1/R2
> records that name it stay readable. Nothing about the task changed in the move, and no earlier
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
