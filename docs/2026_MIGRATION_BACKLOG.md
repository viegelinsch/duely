# 2026 Migration Backlog — Bootstrap to Angular Material

**Date:** 2026-09-12
**Recorded at:** commit `b88b3cf`, branch `dev-v2`.

> **NOTE (updated 2026-09-18 by task #49):** this file remains slated for emptying and deletion in
> Phase 13 (task #38). The task #45 correction was applied in-place (§1(d)) and stands. Task #45's
> "no new content should be added beyond that" is **superseded**: on 2026-09-18, **by direct user
> instruction**, task #49 added **§3** — the consolidated open issues of the now-deleted
> `docs/TODO-untranslated-strings.md` — because that file was retired and §3 is the only surviving
> record of its content. **Phase 13 MUST carry §3(a), §3(b) and §3(c) (OPEN) and §3(d)
> (closed-by-decision, limitation material) forward into `docs/2026_KNOWN_LIMITATIONS.md` instead of
> discarding them with the rest of this file.** No further additions are expected after §3.

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
working handoff, the commit bodies of `98f603f` (date-handler fixes) and `937a920` (waitForAsync spec
executability), the plan's rejected-alternatives section, and the 2026-09-12 visual baseline capture.

The Phase-0 decision point was answered by the user on 2026-09-12: the `saveAs` failures (Q1), the
`CollisionDetector` failure (Q2) and the `RecurrencePattern` aliasing hazard (Q3) are all BACKLOG and
are recorded in section 1; Q4 (accept the extra Phase-0 commits, no squashing) changed no scope. The
`saveText` triage (Q on the creator spec) was later decided as **option C** — see section 1.

---

## 1. Deferred test work with no phase owner

The verified baseline at `937a920` is **39 failed / 38 passed, 77 executing**. Of the 39 failures,
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

### (c) RecurrencePattern holiday-date aliasing — product hazard, zero test coverage (Q3: BACKLOG behind Q2) — **CLOSED by backlog-emptying Phase 10 (task #35)**

`RecurrencePattern.ts:83` does `const pushDate: Date = holiday.start` — it aliases rather than
clones, so the following `setHours` mutates the object `date-holidays` returned. The
duplicate-suppression guard at `:91` then compares a time-shifted `Date` against a `Date` parsed from
the unshifted string; under `TZ=UTC` those land on different calendar days, so `isSame(..., 'days')`
returns false where it should return true — on exactly the multi-location path. Derived from source
reading, not demonstrated live; the index-0 loop bug in (b) guarantees that no existing test could
ever catch it. Same aliasing defect class as the recorded `alarms ?? []` regression this project
already hit once. Fix when doing (b).

> **✅ CLOSED by backlog-emptying Phase 10, commit 10.1 (task #35).** `const pushDate: Date =
> holiday.start` replaced with `const pushDate: Date = new Date(holiday.start)` — a single-token
> change that clones the Date before `setHours` mutates it. The `date-holidays` object is no longer
> aliased, and the duplicate-suppression guard at `:91` now compares like with like. G4 baseline
> unchanged (24 failed / 47 passed, md5 `172d78996b50c84e38211b529d76ab0b`); the CollisionDetector
> spec still fails (its index-0 loop bug §1(b) is test work, not this commit's scope). The fix was
> landed independently of §1(b) per the task #35 spec, which decoupled them.

### (d) creator.component.spec, saveText test — decided option C, deferred to the coverage review

Genuine stale expectation, never green in this repo's history: "expected 'saveText' to have been
called at least once". `generateAndSaveICAL()` early-returns because `appointment.valid` is
`[false, true, true, true]`, and `valid[0]` is only recomputed by
`AppointmentFormComponent.endValidation()` on form `valueChanges` — a component this spec never
instantiates; setting `summary = 'test'` on the model alone cannot flip it. The test previously
appeared green only vacuously (assertions in a fire-and-forget `.then()` with no `await`) or was
masked by the ProxyZone abort; the `937a920` conversion to `async it()` + `await` exposed it — the
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
ngx-bootstrap → Phase 7, glyphicons → Phase 7.3, the Webpack-pipeline *revisit point* at Phase 5.3 —
the last of these now discharged, see **(e) CLOSED**)
are annotated in `docs/2026_MIGRATION_PLAN.md`; only the unowned residue and the underlying defect
records are kept here.

### (a) The production Angular CLI configuration has never been exercised

All migration gates build through `duely:build:development`. The `production` configuration has never
run: `build.configurations.production.fileReplacements` points at
`client/environments/environment.prod.ts`, which does not exist (the directory holds `environment.ts`,
`environment.electron.ts`, `environment.electron-prod.ts`, `environment.server.ts`,
`environment.server-prod.ts`), and the budgets — `initial` 2 MB warn / 5 MB error, `anyComponentStyle`
6 KB / 10 KB — have never been measured.

### (b) Dev bundle baseline at `d70817f`

Initial total **9.18 MB**, unminified: `vendor.js` 7.88 MB, `main.js` 538.37 kB,
`styles.css`/`styles.js` 509.76 kB, `polyfills.js` 240.07 kB, `runtime.js` 7.27 kB. Not comparable
against the production budgets because of the missing minification — but `vendor.js` alone at 7.88 MB
suggests that budget has never been measured either. (No phase owns re-measurement; informational.)

### (c) 5 CommonJS/AMD optimization-bailout warnings

`creator.component.ts` and `settings.component.ts` → `moment-timezone`; `electron-storage.service.ts`
→ `file-saver`; `date-holidays-parser` `Jalaali.js` → `jalaali-js`; `date-holidays-parser` `utils.js`
→ `deepmerge`.

> **⚠️ Stale count — superseded by backlog-emptying Phases 5 and 6, re-measured cold-cache.** The
> specifier set is now **6**, not 5: `moment-timezone`, `file-saver`, `jalaali-js`, `deepmerge`,
> **`moment`** (via `client/app/DatesAndCollisions/Recurrence/DailyRecurrencePattern.ts`) and a newly
> surfaced **`uuid-random`** (via `node_modules/ical-generator/dist/index.js`) that Webpack never
> reported. The message text also changed, from Webpack's
> `Warning: <file> depends on '<dep>'. CommonJS or AMD dependencies can cause optimization bailouts.`
> to esbuild's `▲ [WARNING] Module '<dep>' used by '<file>' is not ESM`. **Still nondeterministic —
> never gate on this count:** the CLI dedups per specifier over a nondeterministic traversal order,
> and the *named* importing file varies run to run (`creator.component.ts` vs `settings.component.ts`
> for `moment-timezone`, `web-storage.service.ts` vs `electron-storage.service.ts` for `file-saver`).
> Phase 6 measured 6 in a single `ng build` and 12 in `npm run build:prod` (which runs two builds).
> **Phase 13 must cite six specifiers, not four.**

### (d) 5 "part of the TypeScript compilation but unused" warnings — **CLOSED by backlog-emptying Phase 7 (task #32)**

The four `environment.electron*`/`environment.server*` files plus `client/polyfills.ts`. The unused
environment files and the missing `environment.prod.ts` (see (a)) are the same underlying gap: the
environment-file set matches no build configuration that is actually exercised.

> **⚠️ CLOSURE CRITERION UNREACHABLE — re-scoped by backlog-emptying Phase 5, confirmed by Phase 6.**
> The planned "5 → 4" reduction **cannot be evidenced by a warning count, because the diagnostic no
> longer exists.** The esbuild `@angular/build:application` builder does not emit "…is part of the
> TypeScript compilation but it's unused" at all: it measured **5 prod / 6 dev under Webpack** and is
> **0 prod / 0 dev** under esbuild, re-confirmed at Phase 6 with a cold `.angular/cache` on both
> `ng build --configuration production` and `npm run build:prod`. Deleting the dead files therefore
> produces **no** observable warning delta.
>
> **The underlying dead-code finding is still valid and still actionable** — Phase 7 can delete the
> files; it just must cite their existence and their zero import count, not a warning reduction.
> **Phase 6 made one of them worse:** `client/polyfills.ts` is now **fully orphaned**, not merely
> unused-by-the-builder. Its only remaining consumer was the `polyfills: […'client/polyfills.ts']`
> entry in the deleted `webpack.client.config.js`; `angular.json` uses `polyfills: ["zone.js"]`, the
> package specifier, and never references the file. It was **not** deleted in Phase 6 because that
> phase changes zero files under `client/`.
>
> **Phase 13 must state that the diagnostic no longer exists rather than claim a reduction.**
>
> **✅ CLOSED by backlog-emptying Phase 7 (task #32), with the step-4 supersession rationale.** The
> PLAN's step 4 demanded the unused-file warning count drop **5 → 4** (the four retained environment
> files). That criterion is **UNREACHABLE and is hereby SUPERSEDED**: the esbuild
> `@angular/build:application` builder emits **ZERO** "part of the TypeScript compilation but it's
> unused" warnings (re-confirmed 0 prod / 0 dev at Phases 5 and 6), so the baseline is **already at the
> floor** and no warning-count reduction can ever be evidenced. Phase 7 therefore closes §2(d) by
> **deleting the provably-dead files** — `client/polyfills.ts` (fully orphaned once Phase 6 removed
> `webpack.client.config.js`), `client/typings.d.ts`, `client/app/creator/mock-appointments.ts` plus its
> dead import and commented use in `appointments.service.ts`, and the two unreachable root ambient
> declarations `types/date-holidays/index.d.ts` and `types/file-saver/index.d.ts` (deleted under the
> empirical protocol: G1 and G2 both stayed exit 0 after removal, so they were kept deleted) — citing
> their existence and **zero import count**, never a warning delta. The four
> `environment.electron*`/`environment.server*` files are **KEPT** per decision 17 and remain the
> residual, un-closeable-by-count remainder. **Phase 13 records the diagnostic no longer exists.**

### (e) The Webpack/JIT production defect — **CLOSED by backlog-emptying Phase 6**

`npm run build` and `build:prod` use `ts-loader` with `transpileOnly: true`, so they do not
type-check, and `client/main.ts:26` uses `platformBrowserDynamic().bootstrapModule(AppModule)` — JIT,
with zero `@angular/compiler` imports anywhere in `client/`. The production bundle therefore cannot
compile templates at all, and `Dockerfile:22` ships exactly that bundle. **Phase 5.3's move to
`bootstrapApplication(...)` is the natural point to revisit the whole Webpack pipeline, but the fix
itself (the JIT → AOT / `ts-loader transpileOnly` → esbuild rework) is post-migration and unowned.**

> **✅ CLOSED.** Backlog-emptying **Phase 5** half-closed it — switching the `build` and `serve`
> targets to the esbuild `@angular/build:application` / `@angular/build:dev-server` builders made the
> Angular CLI pipeline AOT-only, so the JIT half of this defect died there. **Phase 6 completed it** by
> retiring the Webpack pipeline outright:
>
> - **All four configs deleted** — `webpack.config.js`, `webpack.client.config.js`,
>   `webpack.electron.config.js`, `webpack.server.config.js` — plus `postcss.config.js`, whose only
>   consumers were `postcss-loader`/autoprefixer inside the deleted CSS chain. `ts-loader
>   { transpileOnly: true }` no longer exists — the only build mechanism that explicitly disabled
>   type-checking is gone. However, the two Node-side bundles (`server/app.ts`, `electron/main.ts`)
>   are built by esbuild (`scripts/build.mjs`), which strips types without checking them
>   (functionally equivalent to `transpileOnly`); their type correctness is ensured by separate
>   `tsc --noEmit` gates **G1b** and **G1c**, not by the build command itself.
> - **Replaced by `scripts/build.mjs`**, a native Node 24 ESM script using esbuild's **Node API**.
>   `npm run build:prod` exits **0** and the artefact was **runtime-probed**, not just built:
>   `node dist/server/app.js` then `curl -I http://localhost:8000/` → **200** with the built
>   `index.html`, plus **200** for a hashed JS asset and a hashed CSS asset.
> - The AOT half is discharged too: the production bundle is `ng build --configuration production`,
>   which is Ivy AOT by construction, so templates compile.
> - `Dockerfile`'s `RUN npm run build:prod` now builds a working bundle, and its
>   `CMD ["npm","run","build:watch"]` became `CMD ["npm", "run", "serve"]`.
> - `dist/` is **no longer tracked** (42 ancient Angular-4.4.6-era artefacts untracked, one `/dist/`
>   ignore rule).
> - The two type-check gates this defect implied for the non-Angular sources now exist and pass:
>   **G1b** `server/tsconfig.json` and **G1c** `electron/tsconfig.json`, both **0 errors**.
>
> See `docs/2026_MATERIAL_MIGRATION.md` §6 ("Build pipeline after backlog-emptying Phase 6") and §7
> deviations 1, 9, 10 and **11**. Deviation 11 records the one loose thread Phase 6 deliberately left:
> **`@angular-devkit/build-angular` is now a dead devDependency and is the sole reason Webpack is
> still installed** (de-hoisted into its own nested `node_modules`). Removing the direct Webpack
> devDependencies did not remove the toolchain. That is a dependency-hygiene item for Phase 7 or a
> dedicated step, **not** a reopening of (e) — no build path reaches it.

> **Historical context:** the Webpack configs (`webpack.client.config.js`, `webpack.server.config.js`,
> `webpack.electron.config.js`) were fully rewritten from Webpack 2 to Webpack 5 in March 2026 — the
> completion report was `WEBPACK_FIX_SUMMARY.md`, now deleted and consolidated into
> `docs/2026_MATERIAL_MIGRATION.md` §9. All 7 source-code errors that report listed as blocking the
> build (`@angular/http` ×2, `ng2-datepicker` ×3, RxJS `Subscription` ×2) were resolved during
> migration Phases 0–8, and its moment.js / Bootstrap / strict-TypeScript follow-ups are covered by
> (g) and Phase 7. The breakage recorded here is a **separate, later** issue caused by Phase 5's
> `bootstrapApplication` switch — not a regression of that Webpack 2→5 rewrite.

### (f) `npm run lint` cannot run — **CLOSED by backlog-emptying Phase 8 (task #33)**

`package.json:44` passes `--ext`, which ESLint 9 removed. There is consequently no automated guard on
the new `standalone` and `@for` conventions during the migration.

> **✅ CLOSED by backlog-emptying Phase 8 (task #33) — the lint CAPABILITY is restored; the exit-0 gate
> is DEFERRED to Phase 10 (task #35) by explicit user decision.**
>
> **What was fixed.** A real flat `eslint.config.js` was authored (decision 6) and the script corrected
> to `"lint": "eslint ."`. `--ext` was dropped because ESLint 9 removed it — in flat config the `files`
> globs are the *only* scope mechanism. **Correction to the line citation above:** the script was at
> `package.json:43`, not `:44`. `npm run lint` now runs to completion over **74 files** with **0 fatal
> parse errors**, and the automated guard on the `standalone` / `@for` conventions that this item says
> was missing now exists.
>
> **⚠️ THE `npm run lint` EXIT-0 GATE IS SUPERSEDED FOR PHASE 8 AND DEFERRED TO PHASE 10.** Task #33's
> gate line demanded **exit 0**, and its step 4 demanded source edits to reach it (fix the mechanical
> findings, add scoped inline disables). The measured reality is **exit 1 — 611 errors / 8 warnings**,
> and Phase 8's scope is to *restore the capability*, not to fix violations (Phase 10 / task #35 owns
> source fixes). **The user decided (2026-09-18) that Phase 8 delivers the working `npm run lint`, the
> flat config, the corrected script and the fully measured baseline, with NO source file edited, NO
> inline disable comment added, the production bundle byte-identical, and a purely additive commit that
> can be reverted without touching source.** This uses exactly the superseded-criterion mechanism Phase 7
> applied to §2(d)'s "unused-file warnings 5 → 4". **Phase 10 fixes findings properly instead of
> silencing them.** The full per-rule and per-directory baseline is recorded in
> `docs/2026_MIGRATION_STATE.md` §11.17 so Phase 10 plans from measurements, not estimates.
>
> **99.2% of the baseline is `client/` TypeScript** (606 of 611 errors) — already Phase 10's declared
> territory. `server/`, `electron/`, `scripts/`, the repo root and all **11** HTML templates are linted
> and report **ZERO** findings. Phase 9 inherits exactly **5 errors in 3 `e2e/` files** (linted, never
> edited).
>
> **Two of task #33's step-4 predictions proved MOOT and are recorded so no future phase chases them:**
> (1) the load-bearing `as unknown as moment.unitOfTime.DurationConstructor` casts are **not flagged by
> any enabled rule**, so the "suppress with a reason, never fix them" instruction required no
> suppression; (2) the predicted `console.warn` / `console.info` findings **cannot occur** because
> `no-console` is in no enabled tier.
>
> **~~One item is OPEN and needs a user decision before Phase 10 can reach exit 0:~~** ✅ **RESOLVED
> by user decision 2026-10-30 — DECLINED.** The rule is turned OFF in `eslint.config.js` (task #53).
> Decision 9's declined-modernisation list is extended from five to **six** items. The 34 errors are
> eliminated; baseline moves 607 → **573 errors / 8 warnings**. Original text preserved for provenance:
>
> **34** of the 611
> errors are `@angular-eslint/prefer-inject` across 13 files — the constructor-injection → `inject()`
> DI modernisation. Decision 9 was checked verbatim and its declined-modernisation list is **closed and
> exhaustive** (class-based `CanActivate` guard, redundant `standalone: true`, signals,
> `storage.factory.ts:22,25` instantiating services with `new`, the two missed `import type`
> opportunities) and **does not cover `prefer-inject`**; `storage.factory.ts` is **not** among the 13
> flagged files. The rule was therefore left **ON** and the 34 errors are recorded as an explicit open
> policy item. **Phase 10 cannot discharge them without a user decision** — either accept the
> modernisation, or decline it explicitly and turn the rule off as a config decision.
>
> **Known coverage gap (deliberate, not a clean bill of health):** `@angular-eslint/template/accessibility`
> (11 rules) is **not** enabled because task #33's spec never named it, so template linting currently
> runs only **3** rules. The **0** findings across 11 templates therefore say nothing about template
> accessibility. Candidate future decision.

### (g) Remaining open list (unowned)

- Route-level lazy loading (`app-routing.module.ts:18-46` is fully eager).
- A shared `HolidayCatalogService`.
- `OnPush` change detection — deliberately deferred for `appointment-form` at Phase 3.4 (the
  `@ViewChild(RecurringSettingsComponent)` imperative calls plus the `ngOnChanges` patching make it
  unsafe in the same pass); remains an unowned post-migration item.
- The trimmed `moment-timezone` build (−25 KB gzip).
- ~~A Playwright Docker service (the validated capture recipe now lives in
  `docs/2026_MIGRATION_PLAN.md`'s Verification strategy).~~ **CLOSED by backlog-emptying Phase 9
  (task #34)** — `playwright.config.ts` rewritten with **two projects** (`dev` → Angular dev-server on
  `:4200`; `server` → production build served by Express on `:8000`), fixing the port mismatch in which
  the old single-project config polled `:8000` while `ng serve` listened on `:4200` and hung
  indefinitely. **Both projects execute and terminate in Docker (43.7 s, no hang).** The suite is
  **10 passed / 6 failed**; the 6 failures are stale pre-migration selectors (`button.btn-success`,
  `input[ng-reflect-name="summary"]`) that no longer match the Material DOM, left red per the abort
  criterion (test *fixing* was out of scope — assertions were **not** rewritten and no spec was deleted
  to force green). The dead Protractor files (`e2e/app.e2e-spec.ts`, `e2e/app.po.ts`,
  `e2e/tsconfig.e2e.json`) were `git rm`'d and `testMatch` pinned to `**/*.spec.ts` so only the
  surviving Playwright spec (`e2e/app.e2e.spec.ts`) is collected. The capture recipe is hardened:
  `e2e/capture-after-shots.cjs`'s hard-coded `OUTPUT_DIR` is now a parameter (`--output-dir` /
  `CAPTURE_OUTPUT_DIR`) that **refuses to default onto the 72-PNG baseline**, and `TESTING_GUIDE.md` §8
  now documents the mandatory `npx playwright install-deps chromium` step and the `03-creator` route
  date hazard (it renders today's date → 12 permanent false positives against any stored baseline).
- ~~Dead Protractor/tslint deletion.~~ **CLOSED by backlog-emptying Phase 7 (task #32)** —
  `protractor.conf.js` and `tslint.json` deleted (grep-proven zero references outside prose docs).
  `e2e/tsconfig.e2e.json` was deliberately **KEPT** (it becomes orphaned once protractor.conf.js goes,
  but the PLAN says *check* it, not delete it, and **Phase 9 owns `e2e/`**).
- An en/de key-parity test.
- ~~The 7 unused ngx-bootstrap i18n keys.~~ **CLOSED by backlog-emptying Phase 10, commit 10.3
  (task #35)** — full enumeration proved **14** orphaned keys (D1–D12 from §3(a) plus `LIGHT` and
  `DARK`, which the old theme-mode selector used before it became a slide toggle). All 14 deleted from
  both locales; 3 new aria-label keys added. Parity 127/127. The "7 ngx-bootstrap keys" of §2(g)-8
  are confirmed to be D6–D12 (`MO TU WE TH FR SA SU`); §3(c)-1's attribution to `ng2-datepicker` is
  academic — both libraries are removed, and the keys were provably unreferenced as translate keys
  (their only source-code occurrences are iCal `byDay` constants, not `| translate` or
  `translate.instant()` calls).
- ~~The 4 copy-pasted `aria-label="Left Align"`.~~ **CLOSED by backlog-emptying Phase 10, commit 10.3
  (task #35)** — **3 fixed, not 4**: the 4th was at `app.component.html:11` and was removed by commit
  `0f22483` during the Material migration. The 3 remaining (advanced-settings toggle, add-exclusion
  button, remove-exclusion button) now use `[attr.aria-label]="'KEY' | translate"` with dedicated
  i18n keys in both locales.
- ~~The phantom service-worker registration at `client/main.ts:21-23`.~~ **CLOSED by backlog-emptying
  Phase 10, commit 10.3 (task #35)** — registration removed (was at `:22-24`). No
  `@angular/service-worker` dependency, no `ngsw-config.json`, no `/service-worker.js` in `dist/` — the
  call always 404'd silently.
- ~~`legal.component.ts:32-34` building HTML via `translate.instant()` in the constructor, so it
  ignores language changes (related to PLAN Correction 11 — `/legal` renders raw i18n keys).~~
  **CLOSED by backlog-emptying Phase 10, commit 10.3 (task #35)** — content assembly extracted to
  `buildContent()`, called from the constructor and re-called on `translate.onLangChange` via a
  Subscription that is torn down in `ngOnDestroy`. The unused `StorageService` import was also removed.
- The mixed Moment/Date/string representation of `untilDate`.
- The pre-existing `as any` at `appointment-form.component.spec.ts:108-109`.
- **Model-band anomaly (promoted from the handoff per the impact review):** during a reverse end-date
  operation the start wall-clock time can shift 22:00→23:00 because `endDateListener`'s
  recompute-start branch compares stale `appEnd`/`appStart` captured before the preceding branch
  mutated the start. Pre-existing (byte-identical in `98f603f` and its parent), not a `5a219bc`
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
  since are unaffected.** ~~Decision needed: add a normalization guard on load, write a one-time
  migration, or accept and document as won't-fix. No phase owns this.~~
  **CLOSED by backlog-emptying Phase 10, commit 10.2 (task #35)** — `loadSettings()` rewritten with a
  `normalizeString` helper that validates `typeof persisted === 'string'` for every field and falls
  back to the default when the check fails. Also replaces bare `.hasOwnProperty()` with
  `Object.prototype.hasOwnProperty.call()` (−11 `no-prototype-builtins` findings). The three default
  literals at `:34-36` are byte-identical; G4 diff empty.
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
| Webpack/`ts-loader transpileOnly` JIT → `ng build` esbuild AOT, plus its neighbours (route-level lazy loading, shared `HolidayCatalogService`, `OnPush`, trimmed moment-timezone build, Playwright service) | all excluded by the "blocking fixes only" scope decision; the AOT item is the most consequential — see (e). **The AOT/Webpack-retirement half was subsequently DONE by backlog-emptying Phases 5–6, so (e) is CLOSED; the neighbours listed with it remain open and unowned.** |
| ESLint flat config, dead Protractor/tslint deletion, the missing `environment.prod.ts`, an en/de key-parity test, the 7 unused ngx-bootstrap i18n keys, the 4 `aria-label="Left Align"` copies | excluded by the same scope decision; see (a), (d), (f) and (g). |

---

## 3. i18n / untranslated-string backlog (no phase owner)

Consolidated here on **2026-09-18 by task #49** from `docs/TODO-untranslated-strings.md`, which was
deleted in the same step. Everything below is that document's content, re-verified read-only against
the working tree at task #49 (no build, test or container was run).

> **PHASE 13 CARRY-FORWARD — MANDATORY.** Because the source file is gone, **this section is the only
> record of it**. Phase 13 (task #38) empties and deletes this file; when it does it **MUST** move
> **§3(a)**, **§3(b)** and **§3(c)** (the OPEN items) and **§3(d)** (the five deliberately
> untranslated strings — accepted-limitation material) into `docs/2026_KNOWN_LIMITATIONS.md`, in that
> document's *what the limitation is · why it is accepted · what the risk is · what would change the
> decision* form. §3(e) is a closed historical record: Phase 13 may compress it, but it must keep the
> **PLAN Correction 11 answer** and the **attribution of the agent-proposed wording**, both of which
> are referenced from outside this file. Losing any OPEN item here is the worst possible outcome of
> this consolidation.

**Provenance.** The source was the record of the **2026-09-11 i18n pass** on branch `dev-v2`, applied
on top of `443f17c` (the TS2322 + TS2531 remediation) and **committed as `dd11df7`
`feat(i18n): apply missing translations and make calendar metadata configurable`**. Its scope was
every user-visible string in `client/app/**/*.html` and `client/app/**/*.ts` plus `client/index.html`,
cross-referenced against `client/assets/i18n/en.json` / `de.json`. Two of the source's own
provenance claims were **stale and are corrected here**: it said the i18n changes were "left
uncommitted in the working tree" (they are in `dd11df7`) and that the file itself was untracked after
a plain `mv` from the repo root (it **was** tracked; `git ls-files` matched, last touched by
`97e3120`). The i18n mechanism it documented is now: `@ngx-translate/core` +
`@ngx-translate/http-loader` with `new TranslateHttpLoader(http, './assets/i18n/', '.json')` — the
source cited `app.module.ts:53-55`, but `app.module.ts` no longer exists (Phase 5 deleted it); the
equivalent config is `client/app/app.config.ts:25-37,51`, with `translate.setDefaultLang('en')` at
`client/app/app.component.ts:46` and available langs `['de','en']`. Key-naming convention:
**`UPPER CASE WITH SPACES`**.

> **Cross-reference — Phase 12 (task #37, the en/de key-parity test, §2(g)-7).** Untranslated strings
> are squarely inside Phase 12's subject area, so items a parity test touches are marked
> **[Phase 12]** below. The boundary matters: Phase 12 asserts that `en.json` and `de.json` hold
> **identical key sets**, so it can detect none of §3(a) (orphaned keys), §3(b) (unconfirmed wording)
> or §3(c) (no runtime verification) — all three are perfectly symmetric across the two locales.
> Measured at task #49: **138 keys in each file, empty symmetric difference.** Task #49 does **not**
> change Phase 12's scope; these are notes for whoever executes it.

### 3(a) CLOSED — the 12 orphaned locale keys (source "Section D", deliberately untouched) — **CLOSED by backlog-emptying Phase 10 (task #35)**

The source's status was "**DELIBERATELY UNTOUCHED** … content unchanged … Removing them is optional
future cleanup, out of scope for this task." They were never removed and are **still open**.

| # | Unused key | EN value | DE value | Likely origin (verbatim from the source) |
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

**Re-verified at task #49:** all 12 keys are still present in **both** `en.json` and `de.json`, both
files are still exactly symmetric (**138 / 138**), and no `| translate` or `translate.instant()`
reference to any of the 12 exists under `client/`. The only `'MO'`…`'SU'` literals in the sources are
iCal `byDay` constants (`appointments.service.ts:268,291,328,330,369,371,400,433,446,484,486,526,528`,
`RecurrencePattern.ts:209-229`, plus spec fixtures) — exactly the trap the source's D6 note warned
about. **[Phase 12]** deleting them preserves parity only if they go from **both** locales together.

> **Probable overlap with §2(g)-8 — Phase 10.3 (task #35) must reconcile, not double-delete.**
> §2(g)-8 is "the 7 unused ngx-bootstrap i18n keys", which Phase 10.3 deletes from both locales while
> keeping "138 EN / 138 DE equal". D6–D12 are exactly **7** keys (`MO TU WE TH FR SA SU`), all
> unreferenced, all from the old date-picker — very likely the same seven, but **neither document
> enumerates the §2(g)-8 set**, so this is recorded as *probable*, not proven. Whoever runs 10.3 must
> decide it explicitly: if the sets are identical, D6–D12 close there and only **D1–D5** (`TIME`,
> `UNTIL YEAR`, `TODAY`, `CLEAR`, `SELECT YEAR`) stay unowned here; if they are not, the two deletions
> must not race. No phase owns D1–D5.

> **✅ CLOSED by backlog-emptying Phase 10, commit 10.3 (task #35).** Full enumeration of all 138
> keys in `client/assets/i18n/en.json` against every `client/**/*.{ts,html}` source proved **14**
> keys unreferenced: D1–D12 plus `LIGHT` and `DARK` (the old theme-mode selector's labels, unused
> since `themeMode` became a `mat-slide-toggle`). All 14 deleted from both locales; 3 new aria-label
> keys added (`TOGGLE ADVANCED SETTINGS`, `ADD EXCLUSION`, `REMOVE EXCLUSION`). Final parity:
> **127 EN / 127 DE** — correct, not a failure. The §2(g)-8 "7 ngx-bootstrap keys" are confirmed
> identical to D6–D12; §3(c)-1's `ng2-datepicker` attribution is academic (both libraries removed).
> D1–D5 (`TIME`, `UNTIL YEAR`, `TODAY`, `CLEAR`, `SELECT YEAR`) are closed here alongside D6–D12 —
> **all 12 D-keys are closed**.

### 3(b) OPEN — three Settings labels whose wording was agent-proposed and never confirmed

U6 of the source made the iCal product metadata user-configurable (see §3(e)) and added three UI
labels for it. The source's own flag, verbatim: "The user did not supply any wording for these three
labels, so **all six values (3 EN + 3 DE) are agent-proposed and need user confirmation.**" No
confirmation is recorded anywhere in the repo and the values are byte-identical to `dd11df7`, so the
request is **still open**.

| Key | EN | DE | Renders at (verified) | Attribution |
|---|---|---|---|---|
| `CALENDAR NAME` | Calendar name | Kalendername | `client/app/settings/settings.component.html:101` | agent-proposed — **please confirm** |
| `CALENDAR PRODUCT ID` | Product ID | Produkt-ID | `client/app/settings/settings.component.html:105` | agent-proposed — **please confirm** |
| `CALENDAR URL` | Calendar URL | Kalender-URL | `client/app/settings/settings.component.html:109` | agent-proposed — **please confirm** |

Decision needed: confirm the six values as-is, or supply replacements. **[Phase 12]** either outcome
keeps parity provided both locales are edited together. Related context Phase 13 already owns
elsewhere: the backing settings fields default to the former hardcoded literals at
`storage.service.ts:34-36` — `calendarName: 'Duely'`, `calendarProdId: '//TU Braunschweig//Duely//EN'`,
`calendarUrl: 'https://duely.tu-braunschweig.de'` — consumed at `appointments.service.ts:67-69`
(`name` / `prodId` / `url`), i.e. the hardcoded TU Braunschweig calendar defaults that Phase 13 lists
as an accepted risk.

### 3(c) OPEN — the i18n pass was never verified at runtime

The source's final section, "**Could NOT be verified**", stated that because the application bundle did
not build (the pre-existing NG8xxx / TS cluster), **no runtime or browser verification was possible**:
"the actual rendered date-picker labels, the legal-notice page text, the collision 'excluded by user'
reason, and the new Settings fields could not be exercised in a running app or by unit tests. These
were verified by static analysis and by the type-check/compiler deltas only."

**Still open, but the blocker is gone** — Phases 5–6 made `npm run build:prod` exit 0 and the
artefact was runtime-probed (see §2(e)), so all four checks are now cheap and actionable. Current
state of each:

1. **Rendered date-picker labels** — partly moot: the audited `ng2-datepicker` UI was replaced by the
   Material datepicker during the migration, so what needs checking now is Material's own
   locale-driven labels, not the strings the 2026-09-11 pass touched.
2. **Legal-notice page text** — has an owner: Phase 10.3 (task #35, §2(g)-11) must "**browser-verify
   `/legal` in both locales**" when it rebuilds `legal.component.ts` on `translate.onLangChange`. That
   discharges this item; until then it is open, and PLAN Correction 11 records that the live `/legal`
   screen currently renders the **raw keys**.
3. **The collision "excluded by user" reason** — no owner, never exercised. The string now comes from
   `translate.instant('EXCLUDED BY USER')` at `appointments.service.ts:576`.
4. **The three new Settings fields** (U6) — no owner, never exercised in a running app.

No phase owns 1, 3 or 4. **[Phase 12]** a key-parity unit test does **not** discharge this item.

### 3(d) CLOSED BY DECISION — five strings deliberately left untranslated (source U1–U5)

These are **not open work**: the source recorded each as "**NOT changed**" and listed them under
"Deliberately NOT done (out of scope)". They are carried here because Phase 13's
`docs/2026_KNOWN_LIMITATIONS.md` is their correct home — **U5 above all**, which is a permanent
architectural gap rather than a pending fix. All five locations were re-verified at task #49; where
the source's line numbers drifted during the migration, both are given.

| # | String | Location now (source cited) | Reason it is deliberately not translated |
|---|---|---|---|
| U1 | `Open Source` | `client/app/about/about.component.html:12` (`:11`) | Loan term, identical in DE; out of scope for that pass |
| U2 | `Mozilla Public License v2.0` | `client/app/about/about.component.html:13` (`:12`) | Proper licence name; conventionally not translated |
| U3 | Developer names — Till Affeldt, Mike Kenneth Braun, Marlen Bernier, Frederik Kammer, Lars Richard | `client/app/about/about.component.html:22-26` (`:19-23`) | Proper nouns; never translated |
| U4 | `Deutsch` / `English` | `client/app/settings/settings.component.ts:105,107` (`:80,82`) | Language endonyms; each language is shown in its own spelling by convention |
| U5 | `Duely - iCal generator` document title | `client/index.html:5` | Static title outside the Angular app; not covered by `@ngx-translate` — the browser tab title can never be translated by the current mechanism |

### 3(e) CLOSED / RESOLVED — record of the applied i18n pass (history preserved)

The source's headline status was **RESOLVED (translations applied to the codebase), 2026-09-11**.
Every item below was verified as actually present in the working tree at task #49.

**The 8 keys added by the pass** (all present in both locales, unchanged since `dd11df7`):

| Key | EN | DE | Attribution as recorded by the source |
|---|---|---|---|
| `SELECT DATE` | Select date | Datum auswählen | **Supplied by the user** (EN `Select date`, DE `Datum auswählen`). The key was **renamed** from the convention-violating `SELECT_DATE` at the user's request; the old identifier existed in no locale file and now appears nowhere in `.html`/`.ts`/`.spec.ts`/JSON. Rendered at `appointment-form.component.html:40,61` and `recurring-settings.component.html:144,213` (source cited `:55,:76` and `:220,:275`) |
| `DEBUG OUTPUT` | Debug output | Debug Ausgabe | Not stated; EN derives from the former hardcoded `DEBUG-OUTPUT` string (C2), DE written for the pass. Rendered at `creator.component.html:63` (source cited `:58`) |
| `LEGAL DEFAULT MESSAGE` | This is the default legal notice message. | Dies ist der Standardtext für die rechtlichen Hinweise. | EN = the former hardcoded string (C4); DE written for the pass |
| `LEGAL EDIT HINT` | To add your own, please edit the 'content' variable in static/main.bundle.js! | Um ihren eigenen Text hinzuzufügen, ändern Sie bitte die Variable 'content' in static/main.bundle.js! | EN = the former hardcoded string (C5); DE written for the pass |
| `EXCLUDED BY USER` | excluded by user | vom Benutzer ausgeschlossen | Both values = the two literals of the former hand-rolled `this.language === 'de' ? … : …` ternary (C6) |
| `CALENDAR NAME`, `CALENDAR PRODUCT ID`, `CALENDAR URL` | see §3(b) | see §3(b) | **Agent-proposed, still unconfirmed → §3(b)** |

Reused rather than added: **`REQUIRED25`** (C1, replacing the hardcoded `max. 25 letters required`,
now at `appointment-form.component.html:12,22`) and **`LEGAL NOTICE`** (C3, the `<h1>`, now at
`legal.component.ts:34`). Other closed sections: **A** (`SELECT_DATE` missing key) DONE; **B**
(asymmetric keys) NONE — the locales were and remain symmetric; **C1–C6** (six hardcoded user-visible
strings) DONE; **U6** (iCal product metadata made configurable) DONE.

**C6's design decision, as recorded** (kept because it explains the current constructor signatures):
`RecurrencePattern` and its four subclasses are **not DI-managed** — they are created with `new` inside
`CollisionDetector.getCollisions()`, itself created with `new` inside
`AppointmentsService.addEventToCalendar()`; the subclasses declare no own constructor and the existing
`language` parameter is still required for public-holiday localisation
(`hd.setLanguages([this.language])`, `RecurrencePattern.ts:46`), so it could not be repurposed. The
chosen shape — "pass the already-translated reason in from the DI-managed caller": (1)
`AppointmentsService` injects `TranslateService` and resolves `translate.instant('EXCLUDED BY USER')`
(`.instant()` because collision detection runs synchronously); (2) the resolved string is a **new
optional 4th constructor argument** on `CollisionDetector`, forwarded to each `*RecurrencePattern`;
(3) `RecurrencePattern` stores it in `excludedByUserReason` and uses it directly, so the locale JSON
files are the single source of truth. The parameter is **optional with an English default**
(`= 'excluded by user'`) purely so direct non-DI instantiation such as
`new CollisionDetector(undefined, userExcludedDates, 'de')` in `CollisionDetector.spec.ts` keeps
compiling (no `TS2554`) and its assertion holds regardless of the `'de'` argument. Verified current:
`CollisionDetector.ts:44-49` (4th optional param, forwarded at `:63,68,73,78`) and
`RecurrencePattern.ts:24,28,32,129`.

**C3–C5's implementation note, as recorded:** `LegalComponent` injects `TranslateService` and
assembles its `content` HTML in the constructor with `.instant()` — chosen over `.get()` because the
string is built synchronously and interpolated into a template literal, whereas `.get()` returns an
`Observable`. Current: `legal.component.ts:31-36`.

> **Answer to PLAN Correction 11 (preserved here because the source file is deleted).**
> `docs/2026_MIGRATION_PLAN.md:200-204` asks: "Confirm whether these keys
> (`LEGAL DEFAULT MESSAGE`, `LEGAL EDIT HINT`) were inside `docs/TODO-untranslated-strings.md`'
> recorded scope before assuming they are a new defect." **Confirmed — yes.** Both keys were
> **introduced by that document's Section C, items C4 and C5**, in commit `dd11df7`; the EN values are
> verbatim the previously hardcoded strings. They are therefore **not** a new defect and not a
> translation gap: the raw-key rendering on `/legal` is the documented consequence of the C3–C5
> `.instant()`-in-the-constructor decision above, which runs before the locale JSON is loaded. It is
> already tracked as **§2(g)-11**, owned by **Phase 10.3 (task #35)** — rebuild on
> `translate.onLangChange`. Do not open a second item for it.

> **New observation recorded at consolidation time (task #49, not from the source).** The user-visible
> text of `LEGAL EDIT HINT` instructs the reader to "edit the 'content' variable in
> **`static/main.bundle.js`**" in both locales. That path is a Webpack-era artefact: `find dist -name
> "*main.bundle*"` returns nothing, and §2(e) records that Phase 6 retired the Webpack pipeline for
> `scripts/build.mjs` + esbuild with hashed asset names. The hint is therefore **stale in both
> languages**, and §2(g)-11's rebuild is the natural moment to correct the wording (a content change
> to two locale values — deliberately **not** made by task #49, which is documentation-only).

**Items the source reported as open that have since closed** (do not resurrect them):

- `appointments.service.spec.ts` "provides only `[AppointmentsService, StorageService]`; once the suite
  can build it will need `TranslateModule.forRoot()` (or a mock) added. Reported, not fixed." —
  **fixed since**: the spec imports `TranslateModule` at `:5` and configures
  `imports: [TranslateModule.forRoot()]` at `:43`.
- The **NG8004 caveat** ("known unfixed cluster", 98 → 103, +5 from the new pipes) — **superseded**:
  the source's own 2026-09-14 historical-snapshot annotation states the current post-Phase-0–8 state
  is **0 NG8xxx** in `npm test`.
- The source's **verification numbers** — tsc TOTAL **154 → 154**, TS2322 = 0, TS2531 = 0, TS2564
  **7 → 7**, NG8004 **98 → 103 (+5)**, NG8002 69, NG8103 41, NG8001 21, NG5002 2, and "the
  application bundle still fails to build" — are the **pre-migration baseline of 2026-09-11 only**,
  kept as that pass's audit trail. Both tsc gates now exit 0 and `ng build` succeeds; **never quote
  these as current**.
- The source's **TS2564 note** on U6 ("`settings.component.ts` already has 6 pre-existing TS2564
  errors … count stayed at 7 total") and its **TestBed note** on `legal.component.spec.ts` (corrected
  in-file on 2026-09-14: the claimed `TS2305 async` / `TS2307 @angular/http` / `TS7006` errors no
  longer exist and `TranslateModule.forRoot()` is already in that spec's `TestBed`) — both closed.
- The source's "Deliberately NOT done" technical bullet list (standalone migration, moment-timezone
  import fix, ical-generator typing, `async` → `waitForAsync`, `@angular/http`, `rxjs/Subscription`,
  TS2564/TS1272/TS2872 cleanups, Bootstrap→Material, Protractor/ESLint dead config, upgrade-docs
  consolidation) — its own 2026-09-14 update records that **every** item was completed by Phases 0–8.
