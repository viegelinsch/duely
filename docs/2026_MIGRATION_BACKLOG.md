# 2026 Migration Backlog — Bootstrap to Angular Material

**Date:** 2026-09-12
**Recorded at:** commit `09d44f4`, branch `dev-v2`.

## Scope

This is the committed record of the migration's deferred work that has **NO phase owner** — the
things to do *after* Phases 1–8 are finished. It is one of three migration documents:

- `docs/2026_MIGRATION_PLAN.md` — Phases 1–8 verbatim plus, as **inline annotations**, the eleven
  plan corrections and every **phase-owned** deferred item (TranslateStore NG0201 and NG0304 → Phase
  6; `auto-resize` → Phase 3.4; navbar overlay → Phase 5.4; Bootstrap / ngx-bootstrap / glyphicons →
  Phase 7). Those items are deliberately **not** repeated here.
- `docs/2026_MIGRATION_STATE.md` — the live working state / handoff (git-excluded, uncommitted).
- This file — only the unowned, post-migration backlog below.

The approved plan file is the contract and is never edited. Sources for this backlog: the migration
working handoff, the commit bodies of `c5d3488` (date-handler fixes) and `cb9f9b0` (waitForAsync spec
executability), the plan's rejected-alternatives section, and the 2026-09-12 visual baseline capture.

The Phase-0 decision point was answered by the user on 2026-09-12: the `saveAs` failures (Q1), the
`CollisionDetector` failure (Q2) and the `RecurrencePattern` aliasing hazard (Q3) are all BACKLOG and
are recorded in section 1; Q4 (accept the extra Phase-0 commits, no squashing) changed no scope. The
`saveText` triage (Q on the creator spec) was later decided as **option C** — see section 1.

---

## 1. Deferred test work with no phase owner

The verified baseline at `cb9f9b0` is **39 failed / 38 passed, 77 executing**. Of the 39 failures,
**34 are phase-owned** and annotated in `docs/2026_MIGRATION_PLAN.md` (Phase 6: TranslateStore
NG0201 ×23 + `mat-form-field` NG0304 ×10 = 33; Phase 3.4: `auto-resize.directive.spec` ×1). The
**5 failures below have no phase owner** and stay loud until a post-migration pass:

| Group | Count | File(s) | Status |
|---|---|---|---|
| `Cannot redefine property: saveAs` | 3 | `web-storage.service.spec` (2), `electron-storage.service.spec` (1) | Q1 → BACKLOG, no fix chosen |
| Stale expectation, date-holidays | 1 | `CollisionDetector.spec` | Q2 → BACKLOG, budget decision required |
| Stale expectation, `saveText` | 1 | `creator.component.spec` | Decided **option C**; deferred to the coverage review |

3 + 1 + 1 = 5. Plus the `RecurrencePattern` product hazard below (zero current test coverage).

### (a) saveAs — 3 tests (Q1: BACKLOG)

`TypeError: Cannot redefine property: saveAs` in `web-storage.service.spec` (2) and
`electron-storage.service.spec` (1). Not a test-ordering defect. Root cause: `file-saver@2.0.5` is
CJS-only (`main: dist/FileSaver.min.js`, no `module`/`exports`/`type` field); esbuild inlines it and
synthesises the module namespace with `defineProperty` omitting `configurable`, so `vi.spyOn` cannot
redefine the property. The obvious fix — `vi.mock('file-saver', ...)` — may be inert, because esbuild
has already inlined the module and there may be no module boundary left to intercept; if inert, it
would produce a silent false green, strictly worse than today's loud failure. Options recorded, none
chosen yet:

1. validate `vi.mock` empirically before relying on it;
2. assert an observable side effect instead of the call;
3. introduce a thin injectable wrapper service around `saveAs`, shared by `WebStorageService` and
   `ElectronStorageService` — better design, trivially mockable via TestBed providers, and it removes
   a pattern the two specs currently duplicate.

No phase owns this.

### (b) CollisionDetector.spec — 1 test (Q2: BACKLOG)

Two independent defects in one spec:

1. **Provably stale expectation.** `date-holidays` computes in the country's timezone identically
   under `TZ=UTC` and `TZ=Europe/Berlin`, and `RecurrencePattern.ts:83-88` deliberately re-stamps the
   holiday date with the event's time of day, while the spec asserts the raw library date. No `TZ`
   setting can satisfy the assertion — it is not a timezone artifact.
2. **The assertion loops at `:55-58` and `:88-91` iterate `i` but assert on index `[0]`**, repeating
   one comparison 15 times and never checking 14 of the 15 expected holidays — including Augsburger
   Friedensfest, the entire reason the second location `{country: 'de', state: 'by', region: 'a'}`
   exists in the fixture.

Fixing the loop will likely expose more failures, so this needs a budget decision, not a drive-by fix.

### (c) RecurrencePattern holiday-date aliasing — product hazard, zero test coverage (Q3: BACKLOG behind Q2)

`RecurrencePattern.ts:83` does `const pushDate: Date = holiday.start` — it aliases rather than
clones, so the following `setHours` mutates the object `date-holidays` returned. The
duplicate-suppression guard at `:91` then compares a time-shifted `Date` against a `Date` parsed from
the unshifted string; under `TZ=UTC` those land on different calendar days, so `isSame(..., 'days')`
returns false where it should return true — on exactly the multi-location path. Derived from source
reading, not demonstrated live; the index-0 loop bug in (b) guarantees that no existing test could
ever catch it. Same aliasing defect class as the recorded `alarms ?? []` regression this project
already hit once. Fix when doing (b).

### (d) creator.component.spec, saveText test — decided option C, deferred to the coverage review

Genuine stale expectation, never green in this repo's history: "expected 'saveText' to have been
called at least once". `generateAndSaveICAL()` early-returns because `appointment.valid` is
`[false, true, true, true]`, and `valid[0]` is only recomputed by
`AppointmentFormComponent.endValidation()` on form `valueChanges` — a component this spec never
instantiates; setting `summary = 'test'` on the model alone cannot flip it. The test previously
appeared green only vacuously (assertions in a fire-and-forget `.then()` with no `await`) or was
masked by the ProxyZone abort; the `cb9f9b0` conversion to `async it()` + `await` exposed it — the
mechanism working as designed, not a regression.

**User decision 2026-09-12 (~21:30): option C — accept reduced coverage.** Drop the positive test
(`'should call saveText and getICalString if input is valid'`, `creator.component.spec.ts:47-58`) and
keep the passing negative test (`:61-72`); the app code is NOT reworked. **Implementation is
deliberately DEFERRED** to a user-initiated general test-coverage review — the drop (or a broader
reconsideration) happens there, not before. Until then the test stays LOUD/RED and the baseline stays
39/38; no phase may silently fix, drop or skip it. Rejected alternatives on record: **A** — test-side
`valid = [true, true, true, true]` one-liner (keeps happy-path coverage; may resurface in the review);
**B** — app-side model re-validation in `generateAndSaveICAL` (Phase 3.x-class behavioral rework).

> **Stale-annotation ride-along:** the row in the table above and this subsection previously read
> "user triage pending". They are now updated to decided-C. Any further correction follows the same
> C-style ride-along pattern recorded in `docs/2026_MIGRATION_PLAN.md` (C-9 / C-10).

---

## 2. Build and tooling backlog (no phase owner)

Everything here is excluded from the migration by the "blocking fixes only" scope decision, or is
context a future pass needs. Items with a named phase owner (navbar → Phase 5.4, Bootstrap /
ngx-bootstrap → Phase 7, glyphicons → Phase 7.3, the Webpack-pipeline *revisit point* at Phase 5.3)
are annotated in `docs/2026_MIGRATION_PLAN.md`; only the unowned residue and the underlying defect
records are kept here.

### (a) The production Angular CLI configuration has never been exercised

All migration gates build through `duely:build:development`. The `production` configuration has never
run: `build.configurations.production.fileReplacements` points at
`client/environments/environment.prod.ts`, which does not exist (the directory holds `environment.ts`,
`environment.electron.ts`, `environment.electron-prod.ts`, `environment.server.ts`,
`environment.server-prod.ts`), and the budgets — `initial` 2 MB warn / 5 MB error, `anyComponentStyle`
6 KB / 10 KB — have never been measured.

### (b) Dev bundle baseline at `705bf3c`

Initial total **9.18 MB**, unminified: `vendor.js` 7.88 MB, `main.js` 538.37 kB,
`styles.css`/`styles.js` 509.76 kB, `polyfills.js` 240.07 kB, `runtime.js` 7.27 kB. Not comparable
against the production budgets because of the missing minification — but `vendor.js` alone at 7.88 MB
suggests that budget has never been measured either. (No phase owns re-measurement; informational.)

### (c) 5 CommonJS/AMD optimization-bailout warnings

`creator.component.ts` and `settings.component.ts` → `moment-timezone`; `electron-storage.service.ts`
→ `file-saver`; `date-holidays-parser` `Jalaali.js` → `jalaali-js`; `date-holidays-parser` `utils.js`
→ `deepmerge`.

### (d) 5 "part of the TypeScript compilation but unused" warnings

The four `environment.electron*`/`environment.server*` files plus `client/polyfills.ts`. The unused
environment files and the missing `environment.prod.ts` (see (a)) are the same underlying gap: the
environment-file set matches no build configuration that is actually exercised.

### (e) The Webpack/JIT production defect

`npm run build` and `build:prod` use `ts-loader` with `transpileOnly: true`, so they do not
type-check, and `client/main.ts:26` uses `platformBrowserDynamic().bootstrapModule(AppModule)` — JIT,
with zero `@angular/compiler` imports anywhere in `client/`. The production bundle therefore cannot
compile templates at all, and `Dockerfile:22` ships exactly that bundle. **Phase 5.3's move to
`bootstrapApplication(...)` is the natural point to revisit the whole Webpack pipeline, but the fix
itself (the JIT → AOT / `ts-loader transpileOnly` → esbuild rework) is post-migration and unowned.**

> **Historical context:** the Webpack configs (`webpack.client.config.js`, `webpack.server.config.js`,
> `webpack.electron.config.js`) were fully rewritten from Webpack 2 to Webpack 5 in March 2026 — the
> completion report was `WEBPACK_FIX_SUMMARY.md`, now deleted and consolidated into
> `docs/2026_MATERIAL_MIGRATION.md` §9. All 7 source-code errors that report listed as blocking the
> build (`@angular/http` ×2, `ng2-datepicker` ×3, RxJS `Subscription` ×2) were resolved during
> migration Phases 0–8, and its moment.js / Bootstrap / strict-TypeScript follow-ups are covered by
> (g) and Phase 7. The breakage recorded here is a **separate, later** issue caused by Phase 5's
> `bootstrapApplication` switch — not a regression of that Webpack 2→5 rewrite.

### (f) `npm run lint` cannot run

`package.json:44` passes `--ext`, which ESLint 9 removed. There is consequently no automated guard on
the new `standalone` and `@for` conventions during the migration.

### (g) Remaining open list (unowned)

- Route-level lazy loading (`app-routing.module.ts:18-46` is fully eager).
- A shared `HolidayCatalogService`.
- `OnPush` change detection — deliberately deferred for `appointment-form` at Phase 3.4 (the
  `@ViewChild(RecurringSettingsComponent)` imperative calls plus the `ngOnChanges` patching make it
  unsafe in the same pass); remains an unowned post-migration item.
- The trimmed `moment-timezone` build (−25 KB gzip).
- A Playwright Docker service (the validated capture recipe now lives in
  `docs/2026_MIGRATION_PLAN.md`'s Verification strategy).
- Dead Protractor/tslint deletion.
- An en/de key-parity test.
- The 7 unused ngx-bootstrap i18n keys.
- The 4 copy-pasted `aria-label="Left Align"`.
- The phantom service-worker registration at `client/main.ts:21-23`.
- `legal.component.ts:32-34` building HTML via `translate.instant()` in the constructor, so it ignores
  language changes (related to PLAN Correction 11 — `/legal` renders raw i18n keys).
- The mixed Moment/Date/string representation of `untilDate`.
- The pre-existing `as any` at `appointment-form.component.spec.ts:108-109`.
- **Model-band anomaly (promoted from the handoff per the impact review):** during a reverse end-date
  operation the start wall-clock time can shift 22:00→23:00 because `endDateListener`'s
  recompute-start branch compares stale `appEnd`/`appStart` captured before the preceding branch
  mutated the start. Pre-existing (byte-identical in `c5d3488` and its parent), not a `56722d4`
  regression. Candidate owner is the Phase 3.x appointment-form rework (annotated in the PLAN); if
  that phase does not absorb it, it stays here.
- **Legacy persisted-state risk from pre-Phase-0 form defaults (surfaced by the TS1272/TS2872
  re-investigation, both of which are already resolved):** before commit `6a228f3` step 0.9,
  `createForm` in `recurring-settings.component.ts` passed the JavaScript **constructor functions**
  `Boolean` and `Number` as FormControl defaults (`monday: Boolean` … all 7 weekdays, `count: Number`)
  instead of `false` and `null`, so the initial form value literally *was* the function object and
  two-way binding could write that reference into the appointment model. The SOURCE is fixed
  (`Boolean -> false`, `Number -> null`; verified at `recurring-settings.component.ts:298-307`), but no
  load-path guard, no shape normalization and no data migration were added:
  `StorageService.loadSettings()` (`storage.service.ts:56-96`) still only does per-field
  `hasOwnProperty` copies with zero type validation, and a grep confirms no guard exists anywhere.
  **Accurate severity — do not overstate:** (1) `JSON.stringify` silently drops function-valued
  properties, so any legacy record would deserialize with `undefined` in the affected weekday flag or
  `count`, NOT a live function reference; (2) in the current architecture only the `settings` blob is
  JSON-persisted (localStorage), and it holds none of these fields — appointments carrying the
  weekday/`count` data live in `AppointmentsService.events` in memory and are exported as iCal text via
  `saveText`, never round-tripped through `JSON.parse` — which bounds the realistic exposure further.
  **Only data persisted before Phase 0 (2026-09-11) is in scope; fresh installs and anything saved
  since are unaffected.** Decision needed: add a normalization guard on load, write a one-time
  migration, or accept and document as won't-fix. No phase owns this.
- **`date-fns` declared but never imported (surfaced while consolidating `DEPENDENCIES_UPGRADED.md`,
  now `docs/2026_MATERIAL_MIGRATION.md` §9):** `date-fns@^4.1.0` sits in `package.json:67`
  `dependencies` but is imported by **zero** source files — `git grep "date-fns" --
  ':!package-lock.json' ':!*.md'` returns only the declaration itself. The March 2026 upgrade summary
  claimed it had *replaced* moment.js; it did not — `moment-timezone` ^0.5.47 is live and 18 client
  source files carry a moment import. **Severity LOW:** date-fns is fully tree-shakeable ESM and is
  never imported, so it does not appear in the production bundle (the 2.71 MB measurement in
  `docs/2026_MATERIAL_MIGRATION.md` §6 is unaffected); the cost is `node_modules` bloat at install
  time and a misleading manifest. Resolution options: remove the declaration, or migrate one of the
  `moment-timezone` call sites to it — the natural pairing is the trimmed `moment-timezone` bullet
  above. No phase owns this.

### (h) The plan's rejected alternatives, summarised

Recorded so the rationale survives; do not re-litigate without new evidence. (Also summarised in
`docs/2026_MIGRATION_PLAN.md`.)

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
