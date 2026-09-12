# 2026 Migration Backlog — Bootstrap to Angular Material

**Date:** 2026-09-12
**Recorded at:** commit `cb9f9b0`, branch `dev-v2` (task #32 of the Bootstrap → Material migration).

## Scope

This is the durable, committed record of the Bootstrap → Angular Material migration's
deferred work: plan corrections, deferred test work, and the build and tooling backlog.
It supersedes nothing. The intentionally uncommitted `docs/2026_MIGRATION_STATE.md`
remains the live working-state and handoff document; this file exists so that the
analysis below survives after that document is eventually retired, and so that no future
phase has to re-derive it.

Sources: the migration working handoff, the commit bodies of `c5d3488` (date-handler
fixes, task #30) and `cb9f9b0` (waitForAsync spec executability, task #31), the
approved plan's rejected-alternatives section, and the 2026-09-12 visual baseline
capture results. The approved plan file is the contract and
is never edited — the corrections in section 1 apply at the dispatch time of the named
phase, not as edits to the plan.

The Phase-0 decision point was answered by the user on 2026-09-12: the saveAs failures
(Q1), the CollisionDetector failure (Q2) and the RecurrencePattern aliasing hazard (Q3)
are all BACKLOG and are recorded in section 2; the fourth question (Q4 — accept the
extra Phase-0 commits, no squashing, `09e4821` stays citable) changed no scope.

Line numbers are as recorded in the sources. Where a file was modified by
`c5d3488`/`cb9f9b0` (the date-handler components, `alarmData.ts`, `recurring-settings.ts`,
and the four spec files rewritten by `cb9f9b0`), function or symbol names are preferred
over line numbers.

---

## 1. Plan corrections

The approved plan text is wrong or incomplete at eleven points. The plan file itself is
never edited; each correction applies when the named phase is dispatched.

**1. Phase 2.2/2.5 — every standalone flip must also convert every spec that declares
the component, in the same commit.** Flipping `SettingsComponent` to `standalone: true`
breaks `app.component.spec.ts`, which declares `SettingsComponent` (alongside
`AppComponent`) — a standalone component in a TestBed `declarations` array is a hard
runtime error. Plan step 2.5 converts only `settings.component.spec.ts`. Rule: grep for
all specs declaring the component being flipped and move them from `declarations` to
`imports` in the same commit. `AppComponent`'s own turn comes at Phase 5.4.

**2. Phase 6 sequencing — add modules, keep declarations.** The plan says Phase 6 flips
every remaining spec from `declarations:` to `imports: [ComponentUnderTest, ...]`. That
is only legal after the component is `standalone: true` — a non-standalone component in
an NgModule `imports` array throws the mirror-image error. Phase 6 must add the missing
modules while keeping `declarations:` for anything not yet flipped; the flip itself
travels with each component's own phase (2.2, 3.x, 4, 5.4). Executing Phase 6 as
literally written would convert 35 diagnosable failures into a new class of hard failure
and destroy the regression net.

**3. Phase 5.5 — the deletion checklist must include `client/test.ts`.** The plan lists
`app.module.ts` and `app-routing.module.ts` only. `client/test.ts` (whose single
functional line is `import './app/app.module';`) was added in `09e4821` as deviation D1
scaffolding to give the spec compilation an NgModule scope. Deleting `app.module.ts`
without it leaves a dangling import that fails the tsc and npm-test gates with TS2307 —
self-enforcing, but it belongs on the checklist.

**4. Phase 6 — revert `private initializeCalendar()`.** `appointments.service.ts`'s
`initializeCalendar()` went from `private` to `public` in `09e4821` (deviation D5) solely
so that `vi.spyOn(service, 'initializeCalendar')` at `appointments.service.spec.ts:156`
would type-check. Phase 6 is the recorded revert point.

**5. `client/polyfills.ts` is not an orphan — never delete it as part of this
migration.** The `09e4821` commit message claimed it was a deletion candidate; that claim
is false (corrected in `c5d3488`'s body, item C-1). The file is an orphan only for the
Angular CLI pipeline: `webpack.client.config.js:30` still declares
`polyfills: './client/polyfills.ts'` as an explicit build entry, and
`webpack.electron.config.js:6` reuses that configuration. `npm run build`, `build:prod`
and `build:electron` — and therefore `Dockerfile:22` (`RUN npm run build:prod`) — all
require the file to exist. Deleting it without repointing the Webpack entry breaks every
Webpack build and the production image with "Entry module not found".

**6. Phase 8 wording — do not claim byte-identical iCal output.** The correct claim: the
generation function and its spec fixtures are byte-identical; the live default and
UI-edited output changed from broken to correct once the date handlers were activated.
(Phase 0 step 0.7 switched three date handlers from dead `ngModelChange`-bound code to
live `(dateChange)` handlers, and `c5d3488` fixed the timezone defects that activation
exposed — `UNTIL=`/`DTEND` values that were previously silently wrong in some timezones
are now correct. That is a change from broken to correct, not byte-identity.)

**7. Phase 1.4 — the line numbers are stale; delete by content match, never by line
number.** `client/styles.scss` line 3 is `@import 'palette';`, not the M2
`indigo-pink.css` the plan says to delete at line 3. Re-verify the file before executing
step 1.4.

**8. Phase 1 — there are eleven Sass `@import` deprecation sites, not seven, and the
warning positions are misleading.** The relative import depth differs per file
(`'../palette'`, `'../../palette'`, `'../../../palette'`, `'../../../../palette'`). All
ten component-level warnings report at "line 0, column 8" with the source line labelled
`0 |`, because Angular injects the component `@import` ahead of the file's own content.
A naive line-number-driven codemod would misfire on all ten component sites.

**9. Recommendation — make `ng build` an explicit Phase 1 gate.** Build the development
configuration (the `production` configuration cannot run at all; see section 3a) before
any Material CSS is added, and record the bundle size and Sass warning count as the
baseline, so that any later budget breach is attributable. The plan does not currently
include this step.

**10. The plan's route list is wrong — there is no `/creator` route.** `CreatorComponent`
lives at `/`, guarded by `AutoRedirectGuard`; `/` with empty localStorage redirects to
`/settings`; the wildcard `**` redirects to `/404`. Any phase that enumerates routes
(2.7, 8, and the before-screenshot list) must use the six route states, not a `/creator`
path:

| # | Route state | Notes |
|---|---|---|
| 1 | `/` with empty localStorage | `AutoRedirectGuard` redirects to `/settings` |
| 2 | `/settings` | timezone, language, location, colour scheme, calendar metadata |
| 3 | `/` with settings loaded | the creator: full appointment form |
| 4 | `/about` | licence and architecture |
| 5 | `/legal` | renders raw i18n keys today — see item 11 |
| 6 | unknown path | wildcard redirect to `/404` |

The state order matches the handoff's route-state enumeration and the before-screenshot
numbering (states 01–06; see also section 3(j)). Navigate to `/` only after settings are
loaded, or the guard bounces the session to `/settings`.

**11. `/legal` renders raw i18n keys.** `LEGAL DEFAULT MESSAGE` and `LEGAL EDIT HINT`
appear verbatim in the live UI. This is related to the deferred `legal.component.ts:32-34`
defect (section 3g): the component builds its HTML via `translate.instant()` in the
constructor. Confirm whether these keys were inside `TODO-untranslated-strings.md`'s
recorded scope before assuming they are a new defect.

---

## 2. Deferred test work

Measured state at `cb9f9b0`: **39 failed / 38 passed, 77 executing** (from 49/28 at
`c5d3488`; task #31 flipped 10 of its 12 targeted tests green with zero regressions;
ProxyZone mentions 0). Every remaining failure is loud, classified and owned:

| Group | Count | File(s) | Exact fix | Owner |
|---|---|---|---|---|
| NG0201 no provider for `TranslateStore` | 23 | `appointments.service.spec` (22), `legal.component.spec` (1) | add `TranslateModule.forRoot()` to the TestBed `imports` | Phase 6 |
| NG0304 `mat-form-field` unknown element | 10 | `appointment-form.component.spec` | extend `imports` with `MatFormFieldModule`, `MatInputModule`, `MatDatepickerModule` plus `provideNativeDateAdapter()` | Phase 6 |
| `Cannot redefine property: saveAs` | 3 | `web-storage.service.spec` (2), `electron-storage.service.spec` (1) | options recorded in (c); no fix chosen yet | deferred, user decision Q1 |
| Stale expectation, date-holidays | 1 | `CollisionDetector.spec` | see (d) — budget decision required | deferred, user decision Q2 |
| Stale expectation, `saveText` | 1 | `creator.component.spec` | see (f) — user triage pending | deferred |
| Standalone-in-declarations of the spec's own host | 1 | `auto-resize.directive.spec` | none — deliberately unfixed, see (g) | Phase 3.4 deletes it |

23 + 10 + 3 + 1 + 1 + 1 = 39.

The 38 passing: `app.component.spec` (2), `custom-validators.spec` (5), `about` (1),
`notFound` (1), `advanced-settings` (4), `alarm-settings` (8), `recurring-settings` (7),
`settings` (1), `storage.service` (3), `CollisionDetector` (2 of 3),
`electron-storage.service` (1 of 2), `creator` (3 of 4). The Phase 2 Settings pilot
therefore has a working regression net from day one, including the three child panels
Phases 2/3 touch most — `advanced-settings`, `alarm-settings`, `recurring-settings`, 19
green tests between them.

### (a) TranslateStore NG0201 cluster — 23 tests

`appointments.service.spec` accounts for 22 (every test in the file; its TestBed has
`providers` but no `imports` array at all — the DI chain is
`_AppointmentsService → _TranslateService → TranslateStore`), plus
`legal.component.spec` for 1. The legal failure was unmasked by `cb9f9b0`:
`LegalComponent` has injected `TranslateService` since `6c5fe0d`, but its spec's TestBed
declares the component with no `imports`; the old ProxyZone abort used to fire before
`createComponent` could surface the missing provider. Fix for both: add
`TranslateModule.forRoot()` to the TestBed `imports`. Owner: Phase 6.

### (b) appointment-form.component.spec — 10 tests, NG0304

`'mat-form-field' is not a known element`. Fix: extend the TestBed `imports` (currently
`[TranslateModule.forRoot(), ReactiveFormsModule]`) with `MatFormFieldModule`,
`MatInputModule` and `MatDatepickerModule`, plus the `provideNativeDateAdapter()`
provider — without the provider, a DateAdapter NG0201 surfaces immediately after.
`CommonModule` is not needed: it is implicit in the TestBed scope, proven by
`recurring-settings.component.spec` passing with 13 `*ngIf`/`*ngFor` usages and the same
two imports. Masked cascade: rendering aborts at the first unknown element
(`appointment-form.component.html:53`), so fixing `mat-form-field` alone surfaces the
next NG0304 for `mat-label`, `mat-datepicker` and `mat-datepicker-toggle` — expect more
NG0304s to surface in sequence rather than all at once. Owner: Phase 6.

### (c) saveAs — 3 tests, user decision 2026-09-12: BACKLOG (Q1)

`TypeError: Cannot redefine property: saveAs` in `web-storage.service.spec` (2) and
`electron-storage.service.spec` (1). Not a test-ordering defect. Root cause:
`file-saver@2.0.5` is CJS-only (`main: dist/FileSaver.min.js`, no `module`/`exports`/
`type` field); esbuild inlines it and synthesises the module namespace with
`defineProperty` omitting `configurable`, so `vi.spyOn` cannot redefine the property.
The obvious fix — `vi.mock('file-saver', ...)` — may be inert, because esbuild has
already inlined the module and there may be no module boundary left to intercept; if it
is inert, it would produce a silent false green, strictly worse than today's loud
failure. Options recorded, none chosen yet:

1. validate `vi.mock` empirically before relying on it;
2. assert an observable side effect instead of the call;
3. introduce a thin injectable wrapper service around `saveAs`, shared by
   `WebStorageService` and `ElectronStorageService` — better design, trivially mockable
   via TestBed providers, and it removes a pattern the two specs currently duplicate.

No phase owns this.

### (d) CollisionDetector.spec — 1 test, user decision 2026-09-12: BACKLOG (Q2)

Two independent defects in one spec:

1. **Provably stale expectation.** `date-holidays` computes in the country's timezone
   identically under `TZ=UTC` and `TZ=Europe/Berlin`, and `RecurrencePattern.ts:83-88`
   deliberately re-stamps the holiday date with the event's time of day, while the spec
   asserts the raw library date. No `TZ` setting can satisfy the assertion — it is not a
   timezone artifact.
2. **The assertion loops at `:55-58` and `:88-91` iterate `i` but assert on index
   `[0]`**, repeating one comparison 15 times and never checking 14 of the 15 expected
   holidays — including Augsburger Friedensfest, the entire reason the second location
   `{country: 'de', state: 'by', region: 'a'}` exists in the fixture.

Fixing the loop will likely expose more failures, so this needs a budget decision, not a
drive-by fix.

### (e) RecurrencePattern holiday-date aliasing — product hazard, zero test coverage, user decision 2026-09-12: BACKLOG behind Q2 (Q3)

`RecurrencePattern.ts:83` does `const pushDate: Date = holiday.start` — it aliases
rather than clones, so the following `setHours` mutates the object `date-holidays`
returned. The duplicate-suppression guard at `:91` then compares a time-shifted `Date`
against a `Date` parsed from the unshifted string; under `TZ=UTC` those land on
different calendar days, so `isSame(..., 'days')` returns false where it should return
true — on exactly the multi-location path. Derived from source reading, not demonstrated
live; the index-0 loop bug in (d) guarantees that no existing test could ever catch it.
Same aliasing defect class as the recorded `alarms ?? []` regression this project
already hit once. Fix when doing (d).

### (f) creator.component.spec, saveText test — new from cb9f9b0, user triage pending

Genuine stale expectation, never green in this repo's history: "expected 'saveText' to
have been called at least once". `generateAndSaveICAL()` early-returns because
`appointment.valid` is `[false, true, true, true]`, and `valid[0]` is only recomputed by
`AppointmentFormComponent.endValidation()` on form `valueChanges` — a component this
spec never instantiates; setting `summary = 'test'` on the model alone cannot flip it.
The test previously appeared green only vacuously (its assertions lived in a
fire-and-forget `.then()` with no `await`) or was masked by the ProxyZone abort; the
`cb9f9b0` conversion to `async it()` plus `await` exposed it — the mechanism working as
designed, not a regression. Same class as (d). Left loud.

### (g) auto-resize.directive.spec — 1 failure, deliberately unfixed

The failure is the spec's own local host component (`_TestComponent`) sitting in
`declarations` while standalone — the directive itself was correctly given
`standalone: false` in `09e4821`. Plan step 3.4 deletes both the directive and its spec
in favour of `cdkTextareaAutosize` (with `TextFieldModule` and `cdkAutosizeMinRows`), so
any effort here is wasted.

### (h) The task-#31 numbers correction

The working handoff (its section 7.2) predicted 49 → 36 failed / 28 → 41 passed. That
target was doubly unreachable: (1) arithmetic — the handoff's own failure partition
targets 12 tests (10 ProxyZone + 2 RouterOutlet), which caps the outcome at 37 remaining
even if every one flips; (2) two of the twelve were always going to stay red once
executable — `legal.component.spec`'s NG0201 (fixing it required adding
`TranslateModule` to a TestBed, which is Phase 6 work and was forbidden in #31) and the
creator `saveText` test (genuinely false, see (f)). Verified end state at `cb9f9b0`:
**39 failed / 38 passed, 77 executing; 10 of 12 flipped green; zero regressions — every
previously passing test still passes; ProxyZone count 0.** 39/38 is the baseline every
subsequent phase measures against.

---

## 3. Build and tooling backlog

Everything in this section is either excluded from the migration by the "blocking fixes
only" scope decision, or — for the items with a named owner, such as the visual defects
in (j) — context a future phase needs recorded now. Item (h) additionally summarises the
plan's own rejected-alternatives list so that the rationale survives without
re-derivation.

### (a) The production Angular CLI configuration has never been exercised

All migration gates build through `duely:build:development`. The `production`
configuration has never run: `build.configurations.production.fileReplacements` points
at `client/environments/environment.prod.ts`, which does not exist (the directory holds
`environment.ts`, `environment.electron.ts`, `environment.electron-prod.ts`,
`environment.server.ts`, `environment.server-prod.ts`), and the budgets — `initial`
2 MB warn / 5 MB error, `anyComponentStyle` 6 KB / 10 KB — have never been measured.

### (b) Dev bundle baseline at `705bf3c`

Initial total **9.18 MB**, unminified: `vendor.js` 7.88 MB, `main.js` 538.37 kB,
`styles.css`/`styles.js` 509.76 kB, `polyfills.js` 240.07 kB, `runtime.js` 7.27 kB. Not
comparable against the production budgets because of the missing minification — but
`vendor.js` alone at 7.88 MB suggests that budget has never been measured either.

### (c) 5 CommonJS/AMD optimization-bailout warnings

`creator.component.ts` and `settings.component.ts` → `moment-timezone`;
`electron-storage.service.ts` → `file-saver`; `date-holidays-parser` `Jalaali.js` →
`jalaali-js`; `date-holidays-parser` `utils.js` → `deepmerge`.

### (d) 5 "part of the TypeScript compilation but unused" warnings

The four `environment.electron*`/`environment.server*` files plus `client/polyfills.ts`.
The unused environment files and the missing `environment.prod.ts` (see (a)) are the
same underlying gap: the environment-file set matches no build configuration that is
actually exercised.

### (e) The Webpack/JIT production defect

`npm run build` and `build:prod` use `ts-loader` with `transpileOnly: true`, so they do
not type-check, and `client/main.ts:26` uses
`platformBrowserDynamic().bootstrapModule(AppModule)` — JIT, with zero
`@angular/compiler` imports anywhere in `client/`. The production bundle therefore
cannot compile templates at all, and `Dockerfile:22` ships exactly that bundle. Phase
5.3's move to `bootstrapApplication(...)` is the natural point to revisit the whole
Webpack pipeline.

### (f) `npm run lint` cannot run

`package.json:44` passes `--ext`, which ESLint 9 removed. There is consequently no
automated guard on the new `standalone` and `@for` conventions during the migration.

### (g) Remaining open list

- Route-level lazy loading (`app-routing.module.ts:18-46` is fully eager).
- A shared `HolidayCatalogService`.
- `OnPush` change detection (deliberately deferred for `appointment-form` at Phase 3.4:
  the `@ViewChild(RecurringSettingsComponent)` imperative calls plus the `ngOnChanges`
  patching make it unsafe in the same pass).
- The trimmed `moment-timezone` build (−25 KB gzip).
- A Playwright Docker service (the working capture recipe is in (i)).
- Dead Protractor/tslint deletion.
- An en/de key-parity test.
- The 7 unused ngx-bootstrap i18n keys.
- The 4 copy-pasted `aria-label="Left Align"`.
- The phantom service-worker registration at `client/main.ts:21-23`.
- `legal.component.ts:32-34` building HTML via `translate.instant()` in the constructor,
  so it ignores language changes (see also section 1, item 11).
- The mixed Moment/Date/string representation of `untilDate`.
- The pre-existing `as any` at `appointment-form.component.spec.ts:108-109`.
- Phase 7 is genuinely a pure `package.json` edit for ngx-bootstrap: the only remaining
  reference is `package.json:74`, since step 0.7 deleted the sole code import.
- Phase 7.4 deletes the stale `bootstrap ^3.3.7` and `ng-bootstrap ^1.6.3` lines at
  `electron/package.json:38,46`.

### (h) The plan's rejected alternatives, summarised

Recorded so the rationale survives; do not re-litigate without new evidence.

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
| Webpack/`ts-loader transpileOnly` JIT → `ng build` esbuild AOT, plus its neighbours (route-level lazy loading, shared `HolidayCatalogService`, `OnPush`, trimmed moment-timezone build, Playwright service) | all excluded by the "blocking fixes only" scope decision; the AOT item is the most consequential — see (e). |
| ESLint flat config, dead Protractor/tslint deletion, the missing `environment.prod.ts`, an en/de key-parity test, the 7 unused ngx-bootstrap i18n keys, the 4 `aria-label="Left Align"` copies | excluded by the same scope decision; see (a), (d), (f) and (g). |

### (i) Visual-capture mechanism (established and validated 2026-09-12)

The IDE's native browser view cannot serve as the migration's visual baseline tool: its
viewport width is pinned to the IDE panel (966 px) and is not programmatically
controllable, and the native view detaches after resize attempts. The working mechanism
is headless Playwright Chromium inside Docker. Recipe:

1. Playwright 1.59.1 is present in the `duely-dev` image, but the image ships no browser
   cache — install the browser into the container first with
   `npx playwright install chromium --only-shell`.
2. Use a fresh `browserContext` per route state × width, with the exact viewport set to
   375, 800 or 1440 px, `locale: 'en-US'` and `timezoneId: 'Europe/Berlin'`.
3. Before shooting, wait for `document.fonts.ready` and for every image to have decoded
   (the first validation run caught an undecoded logo SVG race), and never use
   `waitForLoadState('networkidle')` — the dev server's HMR websocket keeps the
   connection open and hangs the wait.
4. Capture full-page PNGs.

Validated end-to-end on 2026-09-12: 18/18 shots captured at the exact widths, and the
run was deterministic on a second pass once the fonts/images readiness waits were in
place. Phase 2.7 and Phase 8 visual comparisons should re-use this recipe. It is
recorded here as a recipe, not a file reference: the temporary capture script used to
establish it was git-excluded and removed after the session.

### (j) Pre-existing visual defects (found by the 2026-09-12 visual baseline capture)

**Navbar overlay defect — pre-existing, not a capture bug (verified in two Chromium
flavours).** `app.component.html` keeps the class `navbar-fixed-top`, which Bootstrap 5
removed (a no-op), while `app.component.scss` sets
`.navbar { position: fixed; z-index: 1030 }` with no `top`/`left`/`right` — so the fixed
navbar parks at its static position, shrink-to-fit at ~512–514 px wide and ~247–271 px
tall (`.navbar-brand img { height: 100% }` resolves to `auto`, so the logo SVG renders
at its intrinsic 472×219). On `/legal` the entire content block is hidden behind the
overlay; the 05-legal before-shots showing only the navbar are faithful. Fix owner:
Phase 5.4 (navbar → `mat-toolbar`).

Two consequences for Phase 8's visual comparison: expect a large legitimate visual delta
on every route (do not file it as a regression), and the 01/02 before-shot pairs are
byte-identical per width by design — the guard redirect renders the same DOM as a direct
`/settings` visit.
