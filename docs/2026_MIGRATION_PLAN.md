# 2026 Migration Plan — Bootstrap to Angular Material (Phases 1–8)

> **Phase 0 is COMPLETE (commits `6a228f3`, `d70817f`). This document covers the remaining phases.**

This is the execution contract for the rest of the Bootstrap → Angular Material migration.
It reproduces Phases 1–8 of the approved plan **verbatim**, with the plan corrections and the
phase-owned deferred items folded in as **inline annotations** on the steps they affect.

**Companion documents (each is self-contained; cross-reference by filename):**

- `docs/2026_MIGRATION_STATE.md` — the live working state and handoff: where we are, how to
  resume, immutable facts, standing constraints, approved deviations, baseline numbers, agent
  roster, hard invariants. Git-excluded and intentionally uncommitted. **Read it first.**
- `docs/2026_MIGRATION_BACKLOG.md` — the committed record of deferred work that has **no phase
  owner**: things to do *after* Phases 1–8 are finished. Phase-owned deferred items live here in
  the PLAN as annotations, not in the backlog.

**The approved plan file** at
`/Users/heg20/Library/Application Support/Qoder/SharedClientCache/cache/plans/Bootstrap_to_Material_migration_9bc8e866.md`
**is the contract and is never edited.** The annotations below apply at the dispatch time of the
named phase; they do not rewrite the plan text, which is quoted faithfully.

Annotation keys used below:

- **Correction N** — one of the eleven plan corrections (the plan text is wrong or incomplete at
  that point).
- **Phase-owned backlog** — a deferred item from `docs/2026_MIGRATION_BACKLOG.md` that this phase
  owns and must discharge.
- **Note** — verified context a future dispatch needs.

`TODO-notes-he.md` is out of scope for the entire plan: never staged, never edited, never
consolidated into `docs/`. Every command runs in Docker: `docker compose run --rm duely-dev <cmd>`.
Never on the host.

---

## Global caution (applies to every phase)

> **Correction 5 — `client/polyfills.ts` is NOT an orphan; never delete it as part of this
> migration.** The `6a228f3` commit message claimed it was a deletion candidate; that claim is
> false. It is an orphan only for the Angular CLI pipeline: `webpack.client.config.js:30` still
> declares `polyfills: './client/polyfills.ts'` as an explicit build entry, and
> `webpack.electron.config.js:6` reuses that configuration. `npm run build`, `build:prod` and
> `build:electron` — and therefore `Dockerfile:22` (`RUN npm run build:prod`) — all require the file
> to exist. Deleting it without repointing the Webpack entry breaks every Webpack build and the
> production image with "Entry module not found". (Phase 5.5 and Phase 7 must respect this.)

---

## Phase 1 — Design foundation (commit 2)

**1.1** New `client/styles/_theme.scss` using only the verified Material 20 API: `mat.theme()` on `:root` with `(color: (primary: …, type: light), typography: (plain: <system stack>, brand: <system stack>))`; a `[data-theme='dark']` variant; then `@each` over the 8 accents emitting `[data-color='#{$name}']` and `[data-theme='dark'][data-color='#{$name}']` blocks of `mat.theme-overrides((primary: $hex, …))`. Map Duely's identity explicitly: `background: #ddd`, `surface: #ffffff`. **Do not call `all-component-themes()`** — verified in-container that `prebuilt-themes/azure-blue.css` is 6,896 bytes of pure `--mat-sys-*` custom properties with zero `.mat-mdc-*` rules, so components ship their own structural CSS. Note `define-typography` in v20 takes `brand-family`/`plain-family`, not `font-family`.

**1.2** New `client/styles/_layout.scss` — the entire replacement vocabulary, seven classes: `.page` (max-width container plus navbar clearance, absorbing the three inconsistent `margin-top: 58/65/66/71px` hacks), `.card` (the white `.rectangle`), `.field-row` (label/control flex row collapsing to a column), `.field-cluster` (the country/state/region trio as `flex-wrap` + `gap`, which removes the dynamic `[class.col-12]/[class.col-6]/[class.col-4]` bindings entirely), `.pattern-grid` (`repeat(auto-fill, minmax(8rem,1fr))` for the 6 monthly/yearly radio grids), `.actions`, `.stack`. **One breakpoint at 599.98px**, matching Material's own `xs`/`sm` boundary. `.page` uses `width: min(100% - 2rem, 960px)` to match Bootstrap's container max-width so the shell does not shift.

**1.3** `client/_palette.scss` — add a `$colors` Sass map of the 8 accents, drop the meaningless `!important` from the variable declarations at lines 1–8, and **delete lines 148–266**: verified with `sass` that `fill: $clr-primary-red !important;` compiles to `fill: #be1e3c !important !important;`, which is invalid, so all 119 lines are dead CSS today. Keep the file at its current path — 9 component SCSS files `@import` it. Defer deleting the 40 utility classes until the last `{{storage.getColor()}}` interpolation is gone.

**1.4** `client/styles.scss` — delete line 3 (the M2 `indigo-pink.css`, replaced by `_theme.scss`) and add `@use './styles/theme'` and `@use './styles/layout'`. **Keep line 2 (Bootstrap) until Phase 7**; deleting it earlier leaves every unconverted screen unstyled.

> **Correction 7 — delete by content match, never by line number.** `client/styles.scss` line 3 IS
> the M2 `@import '@angular/material/prebuilt-themes/indigo-pink.css';` the plan says to delete —
> the plan's line number happens to be right. Line 2 is the Bootstrap CSS; `palette` sits at line 4.
> The delete-by-content-match rule stands regardless: it is what makes the instruction robust
> against anything inserted above it.

> **Correction 8 — there are eleven Sass `@import` deprecation sites, not seven, and the warning
> positions are misleading.** The relative import depth differs per file (`'../palette'`,
> `'../../palette'`, `'../../../palette'`, `'../../../../palette'`). All ten component-level warnings
> report at "line 0, column 8" with the source line labelled `0 |`, because Angular injects the
> component `@import` ahead of the file's own content. A naive line-number-driven codemod would
> misfire on all ten component sites.

**1.5** `client/app/app.module.ts` — register the Material modules the migration will need, once: `MatButtonModule`, `MatIconModule`, `MatCardModule`, `MatSelectModule`, `MatCheckboxModule`, `MatRadioModule`, `MatToolbarModule`, `MatSlideToggleModule`. Non-standalone components resolve against this list until each flips to standalone.

**1.6** Icons — new `client/app/shared/icons/duely-icons.ts` exporting a `Record<string,string>` of the **8** icons actually needed (`settings`, `add`, `remove`, `expand_more`, `chevron_right`, `save`, `error_outline`, `info`) as raw Material path data, plus `icon.provider.ts` registering each via `MatIconRegistry.addSvgIconLiteral('duely:'+k, v, {viewBox:'0 0 24 24'})` in a `provideAppInitializer`. Usage: `<mat-icon svgIcon="duely:add" aria-hidden="true">`. **No webfont, no CDN**: ~2 KB instead of ~130 KB, and `addSvgIcon(url)` would issue an HTTP fetch that fails under Electron's `file://` origin.

**1.7** New `client/app/theme/theme.service.ts` — `@Injectable({ providedIn: 'root' })`, injects `DOCUMENT` and `StorageService`, exposes one `apply()` that sets `data-color` and `data-theme` on `document.documentElement`. Roughly 25 lines: no RxJS, no `BehaviorSubject`, no `HostBinding`.

**1.8** `client/app/storage/storage.service.ts` — add `themeMode: 'light'` to the `settings` literal and exactly one `hasOwnProperty('themeMode')` branch in `loadSettings()`, matching the pattern already established for `calendarName`/`calendarProdId`/`calendarUrl`. Store the **string** `'light' | 'dark'`, not a boolean, matching the existing `debug` and `color` field shapes so a future `'auto'` is non-breaking. `ElectronStorageService` and `WebStorageService` do not override `loadSettings`/`saveSettings`, so this one edit covers both platforms.

**1.9** `client/index.html` `<head>` — a ~200 B inline pre-paint script that synchronously reads `localStorage.getItem('settings')` and sets the two `data-*` attributes before the main bundle parses. Kills the dark-mode flash with zero extra requests and zero reload on toggle. Wrap in `try/catch` and guard `typeof localStorage !== 'undefined'` for the `file://` path.

**1.10** `client/app/app.component.ts` — inject `ThemeService` and call `apply()` alongside the existing `translate.use(storage.settings.language)`.

**1.11** i18n — add `THEME MODE`, `LIGHT`, `DARK` to **both** `en.json` and `de.json` in the same commit, preserving the 135/135 parity invariant and the `UPPER CASE WITH SPACES` convention. In the same commit, apply your confirmed wording for the three calendar-metadata labels: `CALENDAR NAME` → EN `calendar name` / DE `Kalendername`; `CALENDAR PRODUCT ID` → EN `product ID` / DE `Produkt-ID`; `CALENDAR URL` → EN `calendar URL` / DE `Kalender-URL`. Read the current values first and change only what actually differs.

> **Correction 9 (recommendation) — make `ng build` an explicit Phase 1 gate.** Build the
> development configuration (the `production` configuration cannot run at all; see
> `docs/2026_MIGRATION_BACKLOG.md` §(a)) before any Material CSS is added, and record the bundle
> size and Sass warning count as the baseline, so any later budget breach is attributable. The plan
> does not currently include this step.

> **Phase 1 commit-body ride-along corrections.** The Phase 1 commit body must carry the C-style
> record corrections owed from the Phase 0 review cycle (do not amend the earlier hashes — three
> reviewers cite them):
> - **C-9 (already recorded in `5a219bc`'s body):** `98f603f`'s fix-11 miscounted the tracked `dist`
>   inventory — actual is 39 `dist/electron` + 3 `dist/server` = **42 total**, not 42 + 3 = 45.
> - **C-10 (owed to Phase 1's commit body):** `98f603f`'s body fix-3 cites the `untilDate` site as
>   `:208`, but the post-image line was `:209` (now L212) — never prescribed, uncorrected. Correct it
>   C-style here.
> Fold in any further correction discovered before dispatch using the same C-style pattern.

---

## Phase 2 — Pilot: Settings (commit 3, then STOP)

**2.1** Add `provideAnimationsAsync()` to `app.module.ts` providers. **Mandatory and currently missing** — verified there is no `BrowserAnimationsModule` anywhere, so `mat-select`, `mat-slide-toggle` and `MatSnackBar` would render but never open. Async, not sync, so the ~30 KB animations chunk stays off the critical path; verify it resolves under Electron `file://` and fall back to `provideAnimations()` if not.

**2.2** `settings.component.ts` → `standalone: true` with `imports: [ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule, TranslateModule]`; remove from `app.module.ts` `declarations`. Add `themeMode` to `createForm()` and to the `save()` literal; call `theme.apply()` at the end of `save()`.

> **Correction 1 — every standalone flip must also convert every spec that declares the component,
> in the same commit.** Flipping `SettingsComponent` to `standalone: true` breaks
> `app.component.spec.ts`, which declares `SettingsComponent` (alongside `AppComponent`) — a
> standalone component in a TestBed `declarations` array is a hard runtime error. Plan step 2.5
> converts only `settings.component.spec.ts`. **Rule:** grep for all specs declaring the component
> being flipped and move them from `declarations` to `imports` in the same commit. `AppComponent`'s
> own turn comes at Phase 5.4.

**2.3** `settings.component.html` rewrite. Native `<select>` inside `mat-form-field` for timezone (~420 options), country (~250), state and region; `mat-select` for the short fixed enumerations (colour, language, debug). `*ngFor` → `@for (tz of timeZoneNames; track tz)`; `*ngIf` → `@if`. The three dynamic `[class.col-*]` bindings at lines 25/30/35 → one `.field-cluster` wrapper, where `@if` controls presence and flexbox controls width. `.form-group`/`.form-horizontal`/`.control-label` → `.field-row` with `<mat-label>` **replacing the `<label>` element entirely**. The 3 new iCal-metadata fields → `<input matInput>`. Buttons → `mat-stroked-button` (cancel) and `mat-flat-button` (submit). New dark-mode control → `<mat-slide-toggle formControlName="themeMode">`.

**2.4** `settings.component.scss` — reduce to only what the layout classes cannot express; delete the cloned `.rectangle`/`.main`/`.col-*`/`span{line-height:height}` rules (that last one is invalid CSS).

**2.5** `settings.component.spec.ts:14` — `declarations` → `imports: [SettingsComponent, TranslateModule.forRoot(), ReactiveFormsModule, RouterTestingModule]`.

**2.6** Fix `settings.component.ts` `cancel()`, which calls `saveSettings({})`. Because `saveSettings` replaces the whole blob, this wipes the persisted theme and the three calendar-metadata fields. Pre-existing, but it becomes user-visible the moment Phase 2 persists a theme, so it is in scope.

**2.7 — USER SIGN-OFF GATE.** Run all three Docker gates, serve on 4200, and do a manual pass over Settings at **375 / 800 / 1440 px** — 800 is the exact fixed Electron window size at `electron/main.ts:30-32` and is trivially forgotten — across light + dark and at least 2 accents. Screenshot into `docs/migration-shots/`. Then stop for your agreement on: the layout-class vocabulary, `mat-form-field` appearance (`outline` vs `fill`), button variants, density (evaluate `mat.define-density(-1)` for 800×600 now, not after 9 screens), and the accent/dark token mapping. Everything after this is mechanical repetition of the agreed pattern.

> **Correction 10 — the plan's route list is wrong; there is no `/creator` route.** Any phase that
> enumerates routes (2.7, 8, and the before-screenshot list) must use the six route **states**, not a
> `/creator` path:
>
> | # | Route state | Notes |
> |---|---|---|
> | 1 | `/` with empty localStorage | `AutoRedirectGuard` redirects to `/settings` |
> | 2 | `/settings` | timezone, language, location, colour scheme, calendar metadata |
> | 3 | `/` with settings loaded | the creator: full appointment form |
> | 4 | `/about` | licence and architecture |
> | 5 | `/legal` | renders raw i18n keys today — see Correction 11 |
> | 6 | unknown path | wildcard redirect to `/404` |
>
> Navigate to `/` only after settings are loaded, or the guard bounces the session to `/settings`.
> The 01/02 before-shot pairs are byte-identical per width by design — the guard redirect renders the
> same DOM as a direct `/settings` visit. Re-use the validated Playwright-in-Docker capture recipe in
> the Verification strategy section below.

---

## Phase 3 — Creator family, bottom-up (commits 4–7)

A standalone parent cannot import a non-standalone child, so the order is forced.

**The recipe, applied identically to each:** add `imports: [...]` with Material **subpath** modules only (`@angular/material/button`, never the root barrel) · delete from `app.module.ts` `declarations` · rewrite the template (`*ngIf`→`@if`, `*ngFor`→`@for … track …`, `*ngSwitchCase`→`@switch`/`@case`, glyphicons→`<mat-icon svgIcon>`, preserving all 16 `data-identifier` attributes and all 4 `id` attributes verbatim) · swap the component SCSS to `@use` the shared sheets · update the matching `.spec.ts` `declarations`→`imports` · re-run all gates and record the per-code delta.

**3.1** `advanced-settings` (27 hits, easiest) — `imports: [FormsModule, ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatIconModule, TranslateModule]`; `checkbox-inline` → `<mat-checkbox>`.

**3.2** `alarm-settings` (52 hits) — `@for (alarm of alarmsArray.controls; track $index)`, where **`track $index` is required** because rows are index-addressed via `[formGroupName]="i"`. `[class.hidden]` at lines 46/50 → `@if` (it is a functional binding, not decoration). **Do not touch `this.alarms = this.appointment.alarms`** — that aliasing is deliberate and the project has a recorded regression from "fixing" it with `?? []`, which silently lost `addAlarm()` pushes.

**3.3** `recurring-settings` (294 lines, 208 hits — the hardest file and the truest test of whether the pilot patterns scale) — `[ngSwitch]` + 4 `*ngSwitchCase` → built-in `@switch`/`@case`, which also removes 4 nested `div` levels; the 6 `.col-4.centered` radio grids → `.pattern-grid` + `mat-radio-group`; `checkbox-inline` → `mat-checkbox`; the hand-rolled `.sepa` collapse keeps its boolean + `@if`, with the two chevron glyphicons becoming `<mat-icon svgIcon="duely:expand_more">`; the exclusions `FormArray` datepickers keep `mat-form-field` + `mat-datepicker` with the 0.2 ref fix. Preserve every `data-identifier`. Split this file's conversion across up to 4 commits.

**3.4** `appointment-form` (63 hits) — delete the `[ngClass]="{'has-danger':…,'has-success':…}"` bindings (lines 4–7, 24–27, Bootstrap 3 classes that do nothing in Bootstrap 5) and the `<div class="alert alert-warning">` blocks (12–19, 32–35) in favour of `<mat-error>` guarded by `@if (control.hasError('maxlength'))`. This also removes the null-unsafe `appointmentForm.controls.summary.errors.maxlength` access and the last hardcoded-English string. `<input type="time" class="form-control">` with raw `$event.target` casts (67, 88) → `<input matInput type="time">` bound through the form control. `<textarea racAutoResize>` (44) → `<textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="2">` with `TextFieldModule`, which lets us **delete `auto-resize.directive.ts` and its spec entirely**. **Do not add `OnPush` here**: the `@ViewChild(RecurringSettingsComponent)` with imperative calls at lines 175/221 plus `ngOnChanges` patching at 291–304 make it unsafe in the same pass.

> **Phase-owned backlog (deferred test work, group "auto-resize"):** the `auto-resize.directive.spec`
> failure (its own local host component `_TestComponent` sitting in `declarations` while standalone)
> is deliberately left unfixed — **Phase 3.4 deletes both the directive and its spec** in favour of
> `cdkTextareaAutosize`, so any effort there is wasted.

> **Note — Phase 3.4 also owns these carried findings:**
> - The duplicate "Required!" message: `appointment-form.component.html` renders it exactly twice
>   (line 14 = the `hasError('required')` guard added as deviation D2, line 16 = the legacy
>   `errors != null && errors.required`). Fix = delete legacy line 16; it belongs to this template
>   rewrite, not to a dates commit.
> - The UNTIL picker renders **empty on first open** because the kept dual binding
>   `formControlName="untilDate"` + `[(ngModel)]="enddate"` blanks the form control at view creation.
>   Same dual-binding debt class as the 53 deliberately-kept bindings (Assumption 5). Fold the missing
>   model→form patch into this phase's scope at dispatch.
> - The `untilDate` control is now polymorphic (string seed at rest, local-midnight `Date` after any
>   auto-snap); it has zero current consumers — note it in the dispatch spec.
> - Candidate owner for the reverse-path 22:00→23:00 model-band stale-comparison shift observed in
>   `endDateListener` (pre-existing, not a `5a219bc` regression): confirm at dispatch whether the
>   Phase 3.x appointment-form rework re-reads the post-branch-A start in branch B's guard.

**3.5** `creator` (50 hits + 160 SCSS lines) — 5 glyphicons → `mat-icon` (`remove`, `expand_more`, `chevron_right`, `add`, `save`); `.btn-default`/`.btn-primary`/`.btn-success` → `mat-stroked-button` / `mat-flat-button color="primary"`, deleting the hand-written `#3b973b` and `#337ab7` overrides at `creator.component.scss:102-120` (those are Bootstrap's hexes, not Duely's — the accent token now supplies the colour). Collisions table stays a plain `<table class="duely-table">`; delete the `thead,tbody,tr,td,th{display:block}` + `float:left` hack at lines 133–155. Both `@for` loops get `track` — **forced, since `@for` requires a track expression**, and it converts appointment removal from O(N) full-subtree rebuilds to O(1). Keep the native `alert()` at `creator.component.ts:60` under your scope choice; `JsonPipe` at `creator.component.html:60` is expected to be the only `@angular/common` pipe import surviving anywhere — verify with a grep before dropping `CommonModule`.

> **Note — `OnPush` is deliberately deferred** for `appointment-form` (see 3.4) and remains a
> post-migration backlog item, not a Phase 3 deliverable.

---

## Phase 4 — Static screens (commit 8, independent of Phase 3)

`about`, `legal`, `notFound` — `standalone: true`, `imports: [TranslateModule]` plus `MatButtonModule`/`MatIconModule`/`MatCardModule` where wanted. Delete the three **byte-identical** 97-line SCSS clones (MD5 `9ce7ec971af13c47b216a6787b9e064d`) in favour of `.page`/`.card`, keeping only genuinely unique rules (`.logo`, `.icon` sizing in About).

`legal.component.html` preserves `[innerHTML]="content"`, so give `.card` an explicit descendant-typography block for `p`, `ul`, `ol`, `a`, `h1`–`h4` — the injected legal HTML currently inherits its typography from Bootstrap, which is about to disappear.

`about.component.html:34` renders `./assets/tech/bootstrap.svg` in a 6-logo grid. **Your decision: remove it, with no replacement.** Delete the `<img>` element here, then check the surrounding markup at `about.component.html:29-41` for a hardcoded column count and adjust so the remaining 5 logos do not leave a stranded gap or an uneven last row. Only the reference is removed in this phase; the asset file itself is deleted in 7.3.

`legal.component.ts:32-34` builds HTML via `translate.instant()` in the constructor, so it does not react to language changes. Noted as backlog under your scope choice; not fixed here.

> **Correction 11 — `/legal` renders raw i18n keys.** `LEGAL DEFAULT MESSAGE` and `LEGAL EDIT HINT`
> appear verbatim in the live UI. This is related to the deferred `legal.component.ts:32-34` defect
> above: the component builds its HTML via `translate.instant()` in the constructor. Confirm whether
> these keys were inside `docs/TODO-untranslated-strings.md`'s recorded scope before assuming they
> are a new defect.

---

## Phase 5 — App shell and standalone bootstrap (commit 9)

**5.1** New `client/app/app.routes.ts` — the route array moved out of `app-routing.module.ts`, keeping `AutoRedirectGuard` on the eager `''` route exactly as at lines 32–37 (it redirects to `/settings` when `storage.settingsLoaded === false`).

**5.2** New `client/app/app.config.ts` — carry over verbatim from `app.module.ts:89-104`: `provideRouter(routes)`, `provideHttpClient()`, `provideAnimationsAsync()`, `provideNativeDateAdapter()`, `importProvidersFrom(TranslateModule.forRoot({ loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] } }))`, `{ provide: StorageService, useFactory: selectStorageService }`, the `LocationStrategy` Electron/web branch, the `APP_BASE_HREF` branch, `AutoRedirectGuard` — plus the icon initializer and a theme initializer. **Diff the two files afterwards to prove nothing was dropped.**

**5.3** `client/main.ts` — `platformBrowserDynamic().bootstrapModule(AppModule)` → `bootstrapApplication(AppComponent, appConfig)`.

> **Note — Webpack/JIT production defect (the fix itself is post-migration backlog).** `npm run
> build`/`build:prod` use `ts-loader` with `transpileOnly: true` (no type-check) and the current
> `bootstrapModule(AppModule)` is JIT with zero `@angular/compiler` imports in `client/`, so the
> production bundle cannot compile templates at all, and `Dockerfile:22` ships exactly that bundle.
> **Phase 5.3's move to `bootstrapApplication(...)` is the natural point to revisit the whole Webpack
> pipeline**, but the pipeline rework is recorded in `docs/2026_MIGRATION_BACKLOG.md` §(e), not owned
> by this phase.

**5.4** `app.component.{ts,html,scss}` — `standalone: true`, `imports: [RouterLink, RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule, TranslateModule]`. `<nav class="navbar navbar-fixed-top {{storage.getColor()}}">` → `<mat-toolbar color="primary">`; `glyphicon-cog` → `<mat-icon svgIcon="duely:settings">`; delete `label-{{storage.getColor()}}` from the footer links, since the accent token now colours them via `--mat-sys-primary`. Keep `.additional-links`. Delete the `.main{margin-top:…}` clearance hacks — `.page` owns clearance now. Do not introduce `mat-tab-nav-bar`: the app has 4 routes, not tabs.

> **Phase-owned backlog (navbar overlay defect):** `app.component.html` keeps the class
> `navbar-fixed-top`, which Bootstrap 5 removed (a no-op), while `app.component.scss` set
> `.navbar { position: fixed; z-index: 1030 }` with no `top`/`left`/`right` — so the fixed navbar
> parked at its static position, shrink-to-fit ~512–514 px wide and ~247–271 px tall
> (`.navbar-brand img { height: 100% }` resolved to `auto`, so the logo SVG rendered at its intrinsic
> 472×219), hiding the entire `/legal` content block behind it. **The core of this defect was fixed
> early, by direct user decision, in commit `54a4ffb`** (nav rendered in flow above main, right-aligned
> 25%-size logo). **Phase 5.4 owns the residue:** the obsolete inert `navbar-fixed-top` HTML token, the
> legacy `margin-top` clearings (about/notFound 65px, creator 58px) that `.page` now owns, and any
> remaining placement polish. Expect a large legitimate visual delta on every route in the Phase 8
> after-shots — do not file it as a regression.

> **Note — `AppComponent`'s standalone flip happens here (5.4).** Per Correction 1, grep for every
> spec declaring `AppComponent` (notably `app.component.spec.ts`) and move them from `declarations` to
> `imports` in the same commit.

**5.5** Delete `client/app/app.module.ts` (108 lines) and `client/app/app-routing.module.ts`. Delete the now-unused `_palette.scss` utility classes, once the last `label-*`/`button-*`/`fill-*` usage is gone.

> **Correction 3 — the deletion checklist must include `client/test.ts`.** The plan lists
> `app.module.ts` and `app-routing.module.ts` only. `client/test.ts` (whose single functional line is
> `import './app/app.module';`) was added in `6a228f3` as deviation D1 scaffolding to give the spec
> compilation an NgModule scope. Deleting `app.module.ts` without it leaves a dangling import that
> fails the tsc and npm-test gates with TS2307 — self-enforcing, but it belongs on the checklist.
> (Respect the Global caution: `client/polyfills.ts` is NOT part of this deletion.)

---

## Phase 6 — Specs (commit 10)

Flip the remaining `declarations:` → `imports: [ComponentUnderTest, …]` in `creator`, `appointment-form`, `advanced-settings`, `alarm-settings`, `recurring-settings`, `notFound`, `about`, `legal`, `app` specs (`settings` was done in 2.5). Delete `auto-resize.directive.spec.ts` (done in 3.4). Add `provideAnimations()` to each TestBed that renders Material. Keep the deprecated `RouterTestingModule` under your scope choice — functional, noted as backlog. Then run the full suite and triage.

**Reject the `NO_ERRORS_SCHEMA` workaround** that appears 8 times in the current output — it suppresses precisely the diagnostics this plan uses as its signal.

> **Correction 2 — Phase 6 sequencing: add modules, keep declarations.** The plan says Phase 6 flips
> every remaining spec from `declarations:` to `imports: [ComponentUnderTest, ...]`. That is only
> legal **after** the component is `standalone: true` — a non-standalone component in an NgModule
> `imports` array throws the mirror-image error. **Phase 6 must ADD the missing modules while KEEPING
> `declarations:`** for anything not yet flipped; the flip itself travels with each component's own
> phase (2.2, 3.x, 4, 5.4). Executing Phase 6 as literally written would convert 35 diagnosable
> failures into a new class of hard failure and destroy the regression net.

> **Correction 4 — revert `private initializeCalendar()`.** `appointments.service.ts`'s
> `initializeCalendar()` went from `private` to `public` in `6a228f3` (deviation D5) solely so that
> `vi.spyOn(service, 'initializeCalendar')` at `appointments.service.spec.ts:156` would type-check.
> **Phase 6 is the recorded revert point.**

> **Phase-owned backlog (deferred test work, groups a + b):** Phase 6 owns the two largest failure
> clusters in the 39/38 baseline —
> - **TranslateStore NG0201 ×23** — `appointments.service.spec` (22; its TestBed has `providers` but
>   no `imports` array at all — DI chain `_AppointmentsService → _TranslateService → TranslateStore`)
>   plus `legal.component.spec` (1; `LegalComponent` has injected `TranslateService` since before the migration (that commit's SHA did not survive the history rewrite),
>   but its TestBed declares the component with no `imports`). Fix for both: add
>   `TranslateModule.forRoot()` to the TestBed `imports`.
> - **`mat-form-field` NG0304 ×10** — `appointment-form.component.spec`. Extend the TestBed `imports`
>   (currently `[TranslateModule.forRoot(), ReactiveFormsModule]`) with `MatFormFieldModule`,
>   `MatInputModule`, `MatDatepickerModule` **plus the `provideNativeDateAdapter()` provider** (without
>   it a DateAdapter NG0201 surfaces next). `CommonModule` is not needed — it is implicit in the
>   TestBed scope. **Masked cascade:** rendering aborts at the first unknown element
>   (`appointment-form.component.html:54`), so fixing `mat-form-field` alone surfaces the next NG0304
>   for `mat-label`, `mat-datepicker` and `mat-datepicker-toggle` — expect more NG0304s in sequence.

> **Note (Phase 6 foresight):** once NG0304 is fixed, the 10 `appointment-form` specs will execute
> bodies with ≥5 stale assertions against gutted/dummy methods (`validateStart/EndTime/StartDate/
> EndDate` fully commented out, `onEndDateChange` a dummy). Pre-existing — consider pre-classifying
> them so they are not mistaken for a Phase 6 regression.

---

## Phase 7 — Remove Bootstrap entirely (commit 11, one image rebuild)

**7.1** Delete `client/styles.scss:2`, the only Bootstrap entry point in the app. Verify first with `grep -rn 'bootstrap\|glyphicon\|ngx-bootstrap' client electron server webpack*.js angular.json package.json` — the only remaining hits should be prose in the `*.md` docs.

**7.2** One atomic `package.json` edit removing `bootstrap` (line 66), `ngx-bootstrap` (74), `@types/moment` (87), `@types/moment-timezone` (88); regenerate `package-lock.json`; then exactly **one** `docker compose build duely-dev`. `node_modules` is an anonymous volume baked into the 4.7 GB image, so any dependency change is invisible until rebuild — batching all four removals avoids four rebuilds.

**7.3** Delete `client/fonts/` (215,721 B of glyphicons that are provably already dead: Bootstrap 5.3.8 ships 0 `@font-face` and 0 `glyphicon` rules, there is no `@font-face` anywhere in `client/`, and the directory is in neither `angular.json` assets nor the Webpack copy patterns — so all 25 glyphicon occurrences render as empty spans today). Also delete `client/assets/tech/bootstrap.svg`, whose `<img>` reference was already removed in Phase 4.

**7.4 Recommended deviation, flagged for your veto:** delete the stale `bootstrap ^3.3.7` and `ng-bootstrap ^1.6.3` lines from `electron/package.json:38,46`. Strictly this is outside "blocking fixes only", but `webpack.electron.config.js:63-66` copies that manifest into `dist/electron/package.json` and `electron-builder` resolves desktop dependencies from it — leaving it means the packaged desktop app still declares Bootstrap 3, which contradicts your decision to remove Bootstrap entirely. Two line deletions.

> **Phase-owned backlog (Bootstrap / ngx-bootstrap removal):** Phase 7 owns the removal recorded in
> the backlog. It is genuinely a pure `package.json` edit for ngx-bootstrap — the only remaining
> reference is `package.json:74`, since step 0.7 deleted the sole code import. Phase 7.3 owns the
> `client/fonts/` glyphicons deletion (25 occurrences already render as empty spans) and the
> `client/assets/tech/bootstrap.svg` asset deletion. Phase 7.4 owns the two stale
> `electron/package.json:38,46` lines.

---

## Phase 8 — Final gates and documentation

- `npx tsc --noEmit -p client/tsconfig.app.json` → **0**
- `npx tsc --noEmit -p client/tsconfig.spec.json` → **0**
- `npm test` → bundle succeeds, 0 NG8001/NG8002/NG8004/NG5002, 0 NG8103, all specs executing
- `npm run build` → both Webpack configs succeed; confirm the emitted CSS contains `--mat-sys-*` and **no** `.col-sm-`/`.btn-`/`.form-control` rules; confirm the bundle stays inside the 2 MB warn / 5 MB error budget
- `ng serve` on 4200 → manual browser pass, all 6 routes × light/dark × ≥2 accents × 375/800/1440
- New `docs/2026_MATERIAL_MIGRATION.md` — the seven layout classes, the token flow (`_palette.scss` → `_theme.scss` → `data-*` attributes → `ThemeService`), the standalone `imports` convention, and the "add a Settings field" checklist

> **Correction 6 — do not claim byte-identical iCal output.** The correct claim: the generation
> function and its spec fixtures are byte-identical; the live default and UI-edited output changed
> from broken to correct once the date handlers were activated. (Phase 0 step 0.7 switched three date
> handlers from dead `ngModelChange`-bound code to live `(dateChange)` handlers, and `98f603f` fixed
> the timezone defects that activation exposed — `UNTIL=`/`DTEND` values previously silently wrong in
> some timezones are now correct. That is a change from broken to correct, not byte-identity.)

> **Correction 10 (routes) applies here too:** the "all 6 routes" pass must enumerate the six route
> **states** (see the table under Phase 2.7), not a `/creator` path.

> **Note (visual comparison):** expect a large legitimate visual delta on every route versus the
> `docs/migration-shots/before/` baseline (the navbar overlay defect alone changes every page), and
> the 01/02 before-shot pairs are byte-identical per width by design — the guard redirect renders the
> same DOM as a direct `/settings` visit. Do not file the delta as a regression. Re-use the validated
> Playwright-in-Docker capture recipe below.

---

## Verification strategy

Four gates, all in Docker, all usable from Phase 0 onward:

1. `tsc --noEmit -p client/tsconfig.app.json` — usable only after 0.3
2. `tsc --noEmit -p client/tsconfig.spec.json` — the authoritative count
3. `npm test` — actually executes after Phase 0
4. Browser on `localhost:4200` through the already-published port

**Invariant asserted mechanically after every single step**, not eyeballed:
`npm test`-independent `tsc` run piped to `grep -cE 'error (TS2322|TS2531)'` must output literally `0`. Both were driven to zero in commit `443f17c` and must not regress. A non-zero value stops the step.

**Per-step ledger:** record NG8001/NG8002/NG8004/NG5002/NG8103 totals after each component. The converted component's own count must reach 0 and no global total may rise. Note when grepping esbuild output that it prints `✘ [ERROR] NG8004: …` with the file path on a *continuation line*, so a single-line regex like `file.html:[0-9]+ - error NG[0-9]+` matches nothing — use a broad `grep -E 'NG[0-9]{4}'` plus `sed 's/^ *//' | sort | uniq -c | sort -rn`.

**Keep `strict: true`, `strictTemplates: true` and `fullTemplateTypeCheck: true` untouched throughout.** Material's `mat-form-field`/`mat-select` typings interact with `strictTemplates`; relaxing it to get through the migration would permanently hide real errors.

**Never run `ng add @angular/material`** — it rewrites `styles.scss`, `index.html`, `package.json` and `angular.json` wholesale and would clobber the custom theme. Every change is applied manually.

### Visual-capture recipe (validated 2026-09-12; re-used by Phases 2.7 and 8)

The IDE's native browser view cannot serve as the migration's visual baseline tool: its viewport
width is pinned to the IDE panel (966 px) and is not programmatically controllable, and the native
view detaches after resize attempts. The working mechanism is **headless Playwright Chromium inside
Docker**:

1. Playwright 1.59.1 is present in the `duely-dev` image, but the image ships no browser cache —
   install the browser into the container first with `npx playwright install chromium --only-shell`.
2. Use a fresh `browserContext` per route state × width, with the exact viewport set to 375, 800 or
   1440 px, `locale: 'en-US'` and `timezoneId: 'Europe/Berlin'`.
3. Before shooting, wait for `document.fonts.ready` and for every image to have decoded (the first
   validation run caught an undecoded logo SVG race), and never use `waitForLoadState('networkidle')`
   — the dev server's HMR websocket keeps the connection open and hangs the wait.
4. Capture full-page PNGs.

Validated end-to-end on 2026-09-12: 18/18 shots captured at the exact widths, deterministic on a
second pass once the fonts/images readiness waits were in place. The `before/` baseline lives at
`docs/migration-shots/before/` (git-excluded). The temporary capture script used to establish it was
git-excluded and removed after the session.

---

## Assumptions carried into Phases 1–8

The approved plan lists nine assumptions; the three that govern Phases 1–8 execution are reproduced
here (the others concerned Phase 0 / Phase P, now complete):

5. **The 53 dual `formControlName` + `[(ngModel)]` bindings are load-bearing** — they are how the `Appointment` model stays in sync for iCal generation. In Angular 20 this is still only a runtime warning, not a build error. They are **kept**; consolidating them into `valueChanges` is a separate refactor with its own verification. (This is the same dual-binding debt class behind the UNTIL empty-on-first-open finding carried by Phase 3.4.)

6. **Two independent build pipelines compile `client/styles.scss`** — Angular CLI/esbuild and Webpack/`sass-loader`, potentially with different Sass versions. New SCSS uses `@use`, never `@import`. Note `css-loader { importLoaders: 2 }` must be bumped if the Material theme needs a third loader. Both `npm test` and `npm run build` are run at Phase 8.

9. **Translations confirmed and scheduled into 1.11:** `Kalendername` = calendar name, `Produkt-ID` = product ID, `Kalender-URL` = calendar URL.

---

## Rejected alternatives (rationale — do not re-litigate without new evidence)

Recorded so the rationale survives without re-derivation. Full table also in
`docs/2026_MIGRATION_BACKLOG.md`.

- **`MatTable`** (~178 KB with CDK) for a 2-column, unsorted, unpaginated, non-interactive collisions table — the largest single saving in the migration; rejected independently by all three planning passes.
- **`MatExpansion`** (~61 KB) for collapse sections — `@if` destroys the collapsed subtree (0 retained DOM, 0 change detection); strictly cheaper for 3 nested panels × N appointments.
- **Self-hosted Material Icons woff2 (~130 KB) or a Google Fonts CDN** — only 8 icons needed; inline SVG literals are ~2 KB, and a CDN fetch fails under Electron's `file://` origin.
- **Roboto** — the pinned system font stack costs zero bytes, zero `@font-face`, no FOUT; Roboto is ~40–60 KB gzip plus a render-blocking request that fails offline.
- **`all-component-themes()`** — unnecessary; Material components ship their own structural CSS in their `fesm2022` bundles.
- **`MatGridList`** (~34 KB) for layout — JS-driven absolute positioning that re-measures on resize; a regression versus ~600 B of CSS Grid.
- **`MatDialog`, `MatChips`, `MatTooltip`, `MatSidenav`, `MatMenu`** — no such UI exists in the repo; speculative imports erode maintainability. (`MatTooltip` for the 6 icon-only buttons is deferred, not rejected.)
- **Extracting an `exclusion-row` component** — unnecessary; template refs inside `*ngFor` are already per-iteration scoped (verified twice, including empirically in gate 4).
- **`standalone: false` as the end state** — it is the unblock, not the destination.
- **Mirroring Bootstrap's 12-column grid or drop-in identical class names** — rejected in favour of seven intention-revealing classes; drop-in names would leave Bootstrap vocabulary permanently.
- **Webpack/`ts-loader transpileOnly` JIT → `ng build` esbuild AOT, route-level lazy loading, a shared `HolidayCatalogService`, `OnPush`, the trimmed `moment-timezone` build, a Playwright Docker service** — all excluded by the "blocking fixes only" scope decision; recorded as backlog, not lost.
- **ESLint flat config, dead Protractor/tslint deletion, the missing `environment.prod.ts`, an en/de key-parity test, the 7 unused ngx-bootstrap i18n keys, the 4 copy-pasted `aria-label="Left Align"`** — excluded by the same scope decision; recorded as backlog.
