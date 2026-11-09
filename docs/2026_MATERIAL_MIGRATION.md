# Duely — Bootstrap to Angular Material migration reference

**Status:** complete (Phases 0–8). **Branch:** `dev-v2`. **Written:** 2026-09-14.

This is the durable developer-facing reference for the finished migration. The two working
documents that drove it are `docs/2026_MIGRATION_PLAN.md` (the execution contract, Phases 1–8
verbatim plus corrections) and `docs/2026_KNOWN_LIMITATIONS.md` (deferred work with no phase
owner — retired from the former `docs/2026_MIGRATION_BACKLOG.md` by Phase 13). The live session
handoff was `docs/2026_MIGRATION_STATE.md` (git-excluded).

---

## 1. Migration summary

Duely's UI moved from **Bootstrap 5.3.8 CSS + ngx-bootstrap + glyphicons** onto
**Angular Material 20.2.14** driven by the Material 3 (M3) design-token theme API, and the
application shell moved from an NgModule bootstrap onto **standalone components with
`bootstrapApplication`**.

| Aspect | Before | After |
|---|---|---|
| CSS framework | Bootstrap 5.3.8 (`styles.scss` line 2 import) | none — Material component CSS + 7 hand-written layout classes |
| Component library | ngx-bootstrap (one unused import), Material indigo-pink prebuilt theme (104 KB legacy M2 CSS) | `@angular/material` 20.2.14, M3 token theme generated from `_theme.scss` |
| Theming | `.col-*` / `.btn-*` / `.form-control` utilities plus ~470 occurrences of classes that no longer exist in Bootstrap 5 | `--mat-sys-*` custom properties keyed off `data-theme` / `data-color` attributes on `<html>` |
| Dark mode | none | 8 accents x light/dark, persisted as `settings.themeMode` |
| Icons | `client/fonts/` glyphicons, never declared via `@font-face` — every `<span class="glyphicon">` rendered as an empty box | 5 inline SVG literals (~2 KB) registered under the `duely:` namespace by `provideDuelyIcons()` |
| Layout | Bootstrap 12-column grid, per-screen `margin-top: 58/65/66/71px` navbar clearances | intrinsic flex/grid, one breakpoint (599.98px), navbar in flow |
| App structure | `AppModule` + `AppRoutingModule`, every component `standalone: false` | `app.config.ts` + `app.routes.ts`, all 10 components `standalone: true`, both NgModules and `client/test.ts` deleted |
| Control flow | `*ngIf` / `*ngFor` / `*ngSwitch` | Angular 20 built-ins `@if` / `@for` / `@switch` |
| Global styles size | 301.92 KB (dev, Phase 1 measurement with Bootstrap) | 27.46 KB (dev) / 20.95 KB (production, minified) |

### Phase outcomes

| Phase | Commit | Outcome |
|---|---|---|
| 0 | `6a228f3`, `d70817f`, `98f603f`, `937a920`, `5a219bc`, `5c84fe6`, `b88b3cf`, `54a4ffb` | Build unblocked: `standalone: false` on all 11 declarations cleared ~190 NG8xxx errors, moment default-import conversion, TS2564 initializers, `ng serve` schema fix, date-handler timezone repairs, `waitForAsync` specs made executable under vitest, navbar taken out of fixed position |
| 1 | `348d835` | Design foundation: `_theme.scss` (M3 tokens), `_layout.scss` (7 classes), `_palette.scss` cleanup (-119 dead lines, `+$colors` map), indigo-pink deleted, icon provider, `ThemeService`, `themeMode` persistence, pre-paint theme script |
| 2 | `2060558` | Pilot: `SettingsComponent` standalone + Material form controls, `provideAnimationsAsync()`, destructive `cancel()` bug fixed. User sign-off APPROVED |
| 3 | `f334fe8`, `bf6de16`, `8b1d40a`, `ce7c6ff`, `0d53dfb` | Creator family bottom-up: advanced-settings, alarm-settings, recurring-settings, appointment-form (auto-resize directive deleted), creator |
| 4 | `0483db3` | Static screens: about / legal / notFound standalone, three 97-line SCSS clones deleted |
| 5 | `0f22483` | Standalone bootstrap: `app.routes.ts`, `app.config.ts`, `main.ts` -> `bootstrapApplication`, `mat-toolbar` shell; `app.module.ts`, `app-routing.module.ts` and `client/test.ts` deleted |
| 6 | `201f166` | Regression net restored: `TranslateModule.forRoot()` and Material TestBed providers fixed 8 blocked tests, 5 stale tests deleted, 19 newly-unmasked failures triaged and deferred. Baseline 24F / 47P |
| 7 | `619390b` | Bootstrap removed entirely: CSS import, `bootstrap` + `ngx-bootstrap` + `@types/moment*` dependencies, `client/fonts/` (215 KB glyphicons), `bootstrap.svg`, stale `electron/package.json` entries |
| 8 | see §8 | Final gates + `client/environments/environment.prod.ts` + this document |

---

## 2. The seven layout classes

Defined in `client/styles/_layout.scss` (76 lines, no dependencies). They deliberately avoid
Bootstrap's 12-column mental model: everything is intrinsic flex/grid with a single responsive
breakpoint, `$bp-xs: 599.98px` (Material's xs/sm boundary).

| Class | Purpose | Replaces | Typical use |
|---|---|---|---|
| `.page` | Centred max-width page container: `width: min(100% - 2rem, 960px)`, `margin-inline: auto`, `padding-block: 1rem 2rem` | `.container` / `.container-fluid` plus the four per-screen `margin-top: 58/65/66/71px` navbar clearances | Outermost wrapper of every routed screen (5 screens) |
| `.card` | Padded white surface: `background-color: #ffffff`, `border-radius: 4px`, `padding: 15px` | the hand-written `.rectangle` clone each component carried, and `.panel` / `.card` | Content blocks inside `.page`; also used for nested appointment/alarm boxes |
| `.field-row` | Label/control pair on one line (`display: flex; align-items: center; gap: .5rem`), collapsing to a stacked column below 599.98px | `.form-group` + `.control-label` + `.col-sm-*` label columns, `.form-horizontal` | One labelled control, or a control with an adjacent hint/toggle (12 sites) |
| `.field-cluster` | Wrapping group of sibling controls: `flex-wrap: wrap; gap: .5rem` | the dynamic `[class.col-12]` / `[class.col-6]` / `[class.col-4]` bindings | Country/state/region trio, alarm row groups (11 sites) |
| `.pattern-grid` | Self-filling grid: `grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr))` | `.row` + six `.col-xs-6` / `.col-sm-4` radio grids | The monthly/yearly recurrence pattern radio grids (3 sites) |
| `.actions` | Right-aligned wrapping button bar: `justify-content: flex-end; gap: .5rem` | `.btn-group`, `.pull-right`, `.text-right` | Save/cancel and add/remove button rows (4 sites) |
| `.stack` | Vertical rhythm: `flex-direction: column; gap: .5rem` | `.row`-as-spacer, per-element `margin-bottom` utilities | Any vertical list of fields or cards (18 sites) |

Composition is by chaining (`class="card stack"`, `class="page stack"`) rather than by nesting
extra wrappers. Screen-specific tweaks stay in the component's own SCSS; the vocabulary is only
for structure that repeats across screens.

---

## 3. Token flow

```mermaid
graph LR
    A[client/_palette.scss<br/>accent hex + $colors map] --> B[client/styles/_theme.scss<br/>mat.theme / mat.theme-overrides]
    B --> C[--mat-sys-* custom properties<br/>on :root, data-theme, data-color selectors]
    D[client/index.html<br/>inline head script] --> E[html data-theme + data-color]
    F[ThemeService.apply] --> E
    G[StorageService.settings<br/>localStorage 'settings'] --> F
    G --> D
    E --> C
    C --> H[Material components + component SCSS<br/>var(--mat-sys-*)]
```

**Step by step:**

1. `client/_palette.scss` holds the raw brand hex values (`$clr-primary-red: #be1e3c`, seven more)
   and the `$colors` map, whose **keys are the exact strings the app stores in `settings.color`**
   (`red`, `green`, `blue`, `orange`, `violet`, `pink`, `darkgreen`, `darkblue`). It also emits the
   plain `.red` / `.border-red` / `.label-red` helper classes for the accent swatches.
2. `client/styles/_theme.scss` calls `mat.theme()` twice — on `:root` (light) and on
   `[data-theme='dark']` — with `primary: mat.$red-palette` to establish the full M3 token baseline
   (color, typography, shape, state, elevation). It then calls `mat.theme-overrides()` to stamp
   Duely's exact identity on top (`primary`, `background`, `surface`). Finally an `@each` over
   `palette.$colors` emits, for every accent, a `[data-color='<name>']` block and a
   `[data-theme='dark'][data-color='<name>']` block that re-point the primary token.
3. The emitted CSS is **only** `--mat-sys-*` custom properties — no `all-component-themes()`,
   because Material components ship their own structural CSS inside their `fesm2022` bundles.
4. `ThemeService.apply()` (`client/app/theme/theme.service.ts`) mirrors the two persisted settings
   onto the document element: `data-color` from `settings.color`, `data-theme` from
   `settings.themeMode`. It is called from the `AppComponent` constructor and again at the end of
   `SettingsComponent.save()`. No RxJS, no BehaviorSubject — the attributes are the state.
5. The inline `<script>` in `client/index.html` `<head>` reads the same `localStorage` blob and sets
   both attributes **before the bundle parses**, which removes the flash of the wrong theme on load.
   It is wrapped in `try`/`catch` because Electron's `file://` origin can deny `localStorage`.
6. Component SCSS consumes tokens with `var(--mat-sys-primary)`, `var(--mat-sys-surface)` etc., so
   it follows the active accent and mode without any per-accent rules of its own.

**Material 20 API facts verified against 20.2.14 (do not "fix" these):**

- `mat.theme()`'s config keys are `theme-type` (not `type`) and `plain-family` / `brand-family`
  (not `plain` / `brand`).
- `primary` inside `mat.theme()` must be an M3 **palette map**; a raw hex breaks an internal
  `map.remove` and fails the Sass build. Raw hex belongs in `mat.theme-overrides()`, which does
  accept plain colors.
- `mat.define-typography()` and `mat.define-density()` are `@deprecated` in v20 — use the inline
  typography map instead.

### Adding a new accent colour

1. `client/_palette.scss`: add `$clr-primary-<name>: #rrggbb;`.
2. `client/_palette.scss`: add `'<name>': $clr-primary-<name>,` to the `$colors` map. The key must
   match the value the settings form will store, character for character.
3. `client/_palette.scss` (optional): add the `.<name>` / `.border-<name>` / `.label-<name>` helper
   classes if a template needs a swatch or accent-coloured label.
4. `client/app/settings/settings.component.html`: add
   `<mat-option value="<name>">{{ '<NAME LABEL>' | translate }}</mat-option>` to the colour select.
5. `client/assets/i18n/en.json` **and** `de.json`: add the new label key to both. Key parity is a
   standing invariant (138 EN / 138 DE at the end of Phase 8) and must stay equal.
6. `client/styles/_theme.scss`: **no edit needed** — the `@each` emits the light and dark
   `[data-color='<name>']` blocks automatically.
7. Verify in Docker: `docker compose run --rm duely-dev npx ng build --configuration development`
   then grep the emitted `styles.css` for `[data-color='<name>']`.

---

## 4. Standalone imports convention

All 10 components are `standalone: true`; there is no NgModule left in `client/`.

**Rules:**

- Import Material symbols from their **subpath entry points** — `@angular/material/button`,
  `@angular/material/icon`, `@angular/material/form-field`, ... — **never from the root barrel
  `@angular/material`**. The root barrel drags the whole library into the compilation unit and
  defeats tree-shaking; the subpaths are what keep `main.js` from growing further.
- List every directive/pipe/module a template actually uses in the component's `imports` array.
  A missing entry is a compile-time NG8xxx error under `strictTemplates`, not a silent runtime gap.
- Router symbols come from `@angular/router` (`RouterLink`, `RouterOutlet`); form symbols from
  `@angular/forms`; i18n from `@ngx-translate/core` (`TranslateModule`).
- Application-wide providers live in `client/app/app.config.ts`, not in components:
  `provideRouter(routes)`, `provideHttpClient()`, `provideAnimationsAsync()`,
  `provideNativeDateAdapter()`, `provideDuelyIcons()`,
  `importProvidersFrom(TranslateModule.forRoot(...))`, the `StorageService` factory, the
  `LocationStrategy` / `APP_BASE_HREF` pair (Electron-aware) and `AutoRedirectGuard`.
- Members referenced from a template must be `public` or `protected` — `private` is a TS2341 error
  under the template type-checker.
- New SCSS uses `@use`, never `@import` (Dart Sass 3.0 removes `@import`; two legacy sites remain,
  see §7).

**Pattern (from `client/app/settings/settings.component.ts`):**

```typescript
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'rac-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    TranslateModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit { /* ... */ }
```

**Spec convention (TestBed):**

- A standalone component goes into TestBed `imports`, never `declarations`. When you flip a
  component to standalone, grep **every** `*.spec.ts` for its name — other specs (e.g.
  `app.component.spec.ts`) may declare it too.
- Add `provideNativeDateAdapter()` to `providers` for any spec that renders a `mat-datepicker`
  (this fixed 5 appointment-form tests in Phase 6).
- `TranslateModule.forRoot()` — not the bare `TranslateModule` — is required wherever a component
  injects `TranslateStore` (this fixed 3 DI-blocked tests in Phase 6).
- Animations are not needed in specs: Material templates render under `fixture.detectChanges()`
  without `provideAnimations()`.
- `provideDuelyIcons()` is deliberately **not** added to spec TestBeds; the resulting icon-lookup
  stderr output is cosmetic (see §7).

---

## 5. "Add a Settings field" checklist

Worked example throughout: `themeMode`, added in Phase 1/2.

1. **Model** — add the field and its default to the `settings` literal in
   `client/app/storage/storage.service.ts`. Choose the persisted representation deliberately:
   `themeMode` is stored as the string `'light' | 'dark'` (not a boolean) so a future `'auto'`
   value is non-breaking.
2. **Load** — add a `hasOwnProperty` branch in `loadSettings()`:
   ```typescript
   if (settings.hasOwnProperty('themeMode')) {
     this.settings.themeMode = settings.themeMode;
   }
   ```
   `saveSettings()` replaces the whole `localStorage` blob, so a blob written before the field
   existed simply keeps the default. Never read the parsed object directly.
3. **Form control** — add it in `createForm()` in `settings.component.ts`, converting at the
   storage boundary when the persisted type differs from the control type:
   ```typescript
   themeMode: this.storage.settings.themeMode === 'dark',   // string -> boolean
   ```
4. **Template** — add the markup in `settings.component.html` using the layout vocabulary, and pick
   the control by list length (a standing migration decision):

   | Situation | Control |
   |---|---|
   | long enumeration (timezone ~420, country ~250, state, region) | `<select matNativeControl>` inside `<mat-form-field>` |
   | short fixed enumeration (language, colour, debug) | `<mat-select>` + `<mat-option>` |
   | free text (iCal metadata) | `<input matInput type="text">` |
   | boolean | `<mat-slide-toggle>` inside `.field-row` |
   | date | `<input matInput [matDatepicker]>` + `<mat-datepicker>` |

   Labelled controls get `<mat-form-field>` + `<mat-label>{{ 'KEY' | translate }}</mat-label>`;
   a label beside a control uses `.field-row`; a wrapping sibling group uses `.field-cluster`.
   Iterate with `@for (...; track ...)`, branch with `@if`.
5. **Imports** — if the new markup uses a Material symbol not already imported, add its subpath
   module to the component's `imports` array (§4).
6. **Persist** — add the key to the object literal in `save()`, converting back:
   ```typescript
   themeMode: this.settingsForm.controls['themeMode'].value ? 'dark' : 'light',
   ```
   Because `saveSettings()` writes the whole blob, **any settings key missing from this literal is
   silently wiped on every save**. This is exactly the bug Phase 2 fixed in `cancel()`, which used
   to call `saveSettings({})` and erase colour, iCal metadata and location.
7. **Side effects** — if the setting changes appearance, `save()` already ends with
   `this.theme.apply()`; if it changes language, `this.translate.use(settings.language)` is already
   there. Add new side effects next to them, before `goHome()`.
8. **i18n** — add every new key to **both** `client/assets/i18n/en.json` and `de.json`. Parity is
   checked mechanically (`138 / 138` at the end of Phase 8) and must stay equal.
9. **Verify** — in Docker, never on the host:
   ```bash
   docker compose run --rm duely-dev npx tsc --noEmit -p client/tsconfig.app.json
   docker compose run --rm duely-dev npx tsc --noEmit -p client/tsconfig.spec.json
   docker compose run --rm duely-dev npm test
   ```
   All three must stay at their baseline (0 / 0 errors, 24F / 47P, 0 NG8xxx).

---

## 6. Final gate results (Phase 8)

All gates ran inside Docker via `docker compose run --rm duely-dev <cmd>`; the host `node_modules`
is empty and is never used.

| Gate | Command | Result |
|---|---|---|
| 1 — app type-check | `npx tsc --noEmit -p client/tsconfig.app.json` | **PASS**, 0 errors |
| 1b — server type-check *(new in backlog-emptying Phase 6)* | `npx tsc --noEmit -p server/tsconfig.json` | **PASS**, 0 errors — `server/app.ts` had **never** been type-checked before this gate existed |
| 1c — electron type-check *(new in backlog-emptying Phase 6)* | `npx tsc --noEmit -p electron/tsconfig.json` | **PASS**, 0 errors — `electron/main.ts` had **never** been type-checked, and `electron/tsconfig.json` did not exist |
| 2 — spec type-check | `npx tsc --noEmit -p client/tsconfig.spec.json` | **PASS**, 0 errors |
| 2b — invariant | `... \| grep -cE 'error (TS2322\|TS2531)'` | **PASS**, literally `0` on both gates |
| 3 — unit tests | `npm test` | **PASS**, 24 failed / 47 passed (71 specs), 0 NG8xxx |
| 4 — production build | `npx ng build --configuration production` | **PASS** after `environment.prod.ts` was added (exit 0); budget warning, see below |
| 5 — CSS audit | grep over the emitted `styles.css` | **PASS**, 165 distinct `--mat-sys-*` tokens, 0 Bootstrap selectors |
| 6 — build pipeline | `npm run build` / `build:prod` | **CLOSED by backlog-emptying Phase 6.** The Webpack pipeline no longer exists: `build:prod` runs `scripts/build.mjs` (esbuild Node API + `ng build`) and exits **0**, and the artefact was runtime-probed. Was **FAIL** for the whole migration — backlog item (e), broken since Phase 5.3, never a migration regression |
| Browser visual pass | Playwright-in-Docker against `ng serve` | **PASS** — 72 screenshots (6 route states x 2 themes x 2 accents x 3 widths), all valid PNGs |

### Production bundle (measured, `--configuration production`)

| Chunk | Raw | Estimated transfer |
|---|---|---|
| `main.js` | **2.65 MB** | 402.94 kB |
| `polyfills.js` | 34.84 kB | 11.32 kB |
| `styles.css` | 20.95 kB | 1.91 kB |
| `runtime.js` | 2.83 kB | 1.32 kB |
| **Initial total** | **2.71 MB** | **417.49 kB** |
| `angular-animations-browser` (lazy) | 68.03 kB | 17.75 kB |

- **Budget:** `initial` 2 MB warning / 5 MB error. The build reports
  `bundle initial exceeded maximum budget. Budget 2.00 MB was not met by 708.05 kB with a total of
  2.71 MB` — the **warning threshold is exceeded, the error threshold is not**, so the build exits 0.
- `main.js` at 2.65 MB is the dominant chunk (98% of the initial payload). Recommended future work:
  route-level lazy loading (`client/app/app.routes.ts` is fully eager), a trimmed `moment-timezone`
  build, and lazy-loading `date-holidays` (its holiday catalogue is the single largest contributor).
- **`anyComponentStyle` budget (6 kB warn / 10 kB error): PASS** — no component-style warnings.
- This was the **first production build ever run in this repo**: `build.configurations.production`
  has `fileReplacements` pointing at `client/environments/environment.prod.ts`, which did not exist
  until Phase 8 (backlog item (a)).
- **Provenance of the 2.71 MB figure:** first recorded at migration Phase 8 under this same
  `@angular-devkit/build-angular:browser` (Webpack) builder, and **freshly re-confirmed at `ced1dc8`**
  by backlog-emptying Phase 0 — the component sizes are byte-for-byte identical, so the number did not
  drift, it is simply now re-measured against the live HEAD.
- **Shelf life:** both this production figure and the development figure below will change again.
  Backlog-emptying **Phase 5** switches the builder to `@angular/build:application` (esbuild) and
  rebaselines the budget to *measured + 10%*; **Phase 11** adds route-level lazy loading. Treat these
  as a `ced1dc8` snapshot, not a permanent constant.
  **UPDATE: Phase 5 has now landed — the entire table above is superseded. See the next subsection
  for the live esbuild figures and the rebaselined budget.**

### Production bundle after backlog-emptying Phase 5 — esbuild `@angular/build:application`

The Webpack-based `@angular-devkit/build-angular:browser` builder above was replaced by the esbuild
application builder. Measured with a cold `.angular/cache`, `--output-path /tmp/probe-dist-prod`:

| Chunk | Raw | Estimated transfer |
|---|---|---|
| `main-IJN2BJGT.js` | **2.16 MB** | 311.85 kB |
| `chunk-OBZMNR63.js` (initial, shared) | 157.02 kB | 46.75 kB |
| `polyfills-5CFQRCPP.js` | 34.59 kB | 11.33 kB |
| `styles-DRBU42VC.css` | 20.95 kB (20,951 B) | 1.94 kB |
| **Initial total** | **2.37 MB** (exactly **2,369,889 B**) | **371.88 kB** |
| `chunk-VOEP2MIL.js` (lazy; the CLI labels it `browser`) | 67.77 kB | 17.77 kB |

- **The esbuild builder is materially smaller:** initial raw **2.71 MB → 2.37 MB** (−12.5%) and
  transfer **417.53 kB → 371.88 kB** (−10.9%), from better tree-shaking and minification. `styles.css`
  is **byte-identical in size** (20,951 B / 20.95 kB / 1.94 kB transfer) under both builders.
- **Budget rebaselined (decision 11).** Angular's `initial` budget compares **raw** bytes and parses
  `mb` decimally (1 mb = 1,000,000 B) — proven by the old warning `2.00 MB was not met by 708.05 kB
  with a total of 2.71 MB` and the new `2.00 MB … by 369.89 kB with a total of 2.37 MB`
  (2,000,000 + 369,890 ≈ 2,369,889). **Old:** `maximumWarning: "2mb"`, permanently breached by
  708.05 kB under Webpack and by 369.89 kB under esbuild. **New:** `maximumWarning: "2.6mb"` —
  2,369,889 B × 1.10 = 2,606,878 B = 2.607 MB, rounded to the sensible unit **2.6mb** (2,600,000 B),
  leaving **+9.7% headroom** over the measurement. `maximumError` stays at **5mb**; `anyComponentStyle`
  stays at **6kb/10kb** and still **PASSes** (0 component-style warnings).
- **New chunk structure (Phases 6 and 11 depend on this):**
  - **No `runtime.js`** — esbuild inlines the Webpack runtime chunk entirely.
  - **No `vendor.js`** — the `vendorChunk` option is Webpack-only and was deleted; third-party code is
    split into `chunk-*.js`.
  - Lazy chunks are **`chunk-<HASH>.js`**, not Webpack's numeric **`700.<hash>.js`**, and the CLI now
    labels the animations chunk `browser` instead of `angular-animations-browser`.
  - Hash format changed from `[name].[16-hex].[js|css]` to `[name]-[8-char base32].[js|css]`.
    Per-asset hashes remain **deterministic** (two consecutive production builds produced identical
    filenames). **The Webpack session `Hash:` line no longer exists** — esbuild prints only
    `Application bundle generation complete. [<n> seconds] - <ISO timestamp>`.
  - Development filenames are **unhashed** (`main.js`, `styles.css`) because `outputHashing` is set
    only for production.
- **New output layout:** browser output lands in **`{outputPath}/browser/`**, so the configured
  `dist/server/static` now yields `dist/server/static/browser/`. Two artefacts are written **outside**
  `browser/`, at the `outputPath` root: **`3rdpartylicenses.txt`** (52,007 B, production only, because
  `extractLicenses: true`) and **`prerendered-routes.json`** (18 B, `{"routes": {}}`). Three consumers
  were repointed at `browser/` — see §7.
- **Development bundle under esbuild:** initial total **8.65 MB → 5.43 MB**; `main.js` 4.39 MB,
  `chunk-A2T56ZQ5.js` 922.72 kB, `polyfills.js` 89.77 kB, `styles.css` 24.73 kB, lazy
  `chunk-M5ZYMOWS.js` 155.78 kB. The dev build prints **no transfer-size column** and emits `.js.map`
  files plus **per-component `.css.map` files** (`about.component.css.map`, `settings.component.css.map`,
  …) — a new esbuild behaviour. No `3rdpartylicenses.txt` in dev (`extractLicenses: false`).
- **✅ Re-confirmed unchanged by backlog-emptying Phase 6.** Every figure in this subsection was
  re-measured with a cold `.angular/cache` after the Webpack retirement: gate G5
  (`ng build --configuration production --output-path /tmp/probe-dist`) exits **0** and prints the
  **identical asset hashes** — `main-IJN2BJGT.js` 2.16 MB / 311.85 kB, `chunk-OBZMNR63.js` 157.02 kB /
  46.75 kB, `polyfills-5CFQRCPP.js` 34.59 kB / 11.33 kB, `styles-DRBU42VC.css` 20.95 kB / 1.94 kB,
  **initial total 2.37 MB / 371.88 kB**, lazy `chunk-VOEP2MIL.js` 67.77 kB / 17.77 kB — with **0**
  budget warnings at the rebaselined `2.6mb` / `5mb`. `npm run build:prod` builds the same bundle
  twice (server static + electron static) and both report 2.37 MB / 371.88 kB, which is the evidence
  that the two static bundles really do differ only in output path. The development figures were
  likewise reproduced exactly (initial total **5.43 MB**). **So Phase 6 changed the build pipeline
  without changing a single emitted byte of the client bundle.**

### Development bundle (measured, `--configuration development`)

> **⚠️ SUPERSEDED by backlog-emptying Phase 5.** This Webpack-era table is retained as a historical
> snapshot. The live esbuild figures — initial total **5.43 MB**, no `vendor.js`, no `runtime.js` —
> are in "Production bundle after backlog-emptying Phase 5" above.

Unminified, so not comparable against the production budgets; `vendor.js` dominates.

| Chunk | Raw |
|---|---|
| `vendor.js` | **8.13 MB** |
| `main.js` | 361.54 kB |
| `polyfills.js` | 116.11 kB |
| `styles.css` | 27.46 kB |
| `runtime.js` | 13.34 kB |
| **Initial total** | **8.65 MB** |
| `angular-animations-browser` (lazy) | 236.72 kB |

- **This supersedes the 9.18 MB development record** in `docs/2026_MIGRATION_BACKLOG.md` §2(b), which
  was measured at `d70817f` *before* Bootstrap was removed. The 9.18 → 8.65 MB drop is accounted for by
  migration Phase 7 (Bootstrap + ngx-bootstrap + the 215 KB glyphicons removed). Backlog §2(b) is
  **CLOSED** by this measurement.
- **Two rows of the table above were superseded by backlog-emptying Phases 3–4** (the rest —
  `vendor.js`, `polyfills.js`, `runtime.js`, the 8.65 MB initial total and the 236.72 kB lazy chunk —
  are unchanged): `main.js` is now **361.45 kB** (−92 B, from Phase 3 dropping
  `emitDecoratorMetadata`; the *production* build is unaffected because its optimiser already
  eliminated the metadata calls — production `main.js` hash `408265f1673ac6ef` is byte-identical
  before and after), and `styles.css` is now **26.44 kB** (26,444 B, from Phase 4's `@use` switch).
- **Build-warning inventory (Phase 0, at `ced1dc8`), correcting two counts the backlog still cites:**
  the CommonJS/AMD optimization-bailout warnings number **4 or 5 — the count is NOT stable across
  builds of an unchanged tree.** Three consecutive cold-cache production builds of one commit
  reported **5, 4, 5**. The Angular CLI dedups the warning *per dependency specifier*, but *which*
  importing file it names, and whether bare `moment` (reached via `MonthlyRecurrencePattern.ts`)
  survives as its own line or is subsumed by `moment-timezone`, depends on module-graph traversal
  order. The named reporter varies run to run between `creator.component.ts` and
  `settings.component.ts` for `moment-timezone`, and between `web-storage.service.ts` and
  `electron-storage.service.ts` for `file-saver`. The four always-present specifiers are
  `moment-timezone`, `file-saver`, `jalaali-js`, `deepmerge`; `moment` is an intermittent fifth.
  **Do not gate on this count** — Phase 13 must cite it as "4–5, nondeterministic". The "part of the
  TypeScript compilation but it's unused" warnings, by contrast, **are** stable: **5 in the
  production build but 6 in development** — dev additionally flags `environment.prod.ts`, which
  `fileReplacements` swaps in only for production. Note also that the build's own `Hash:` line
  differs on every run (it is a session hash, not a content hash); the per-asset hashes are stable
  and are the ones to compare. Backlog §2(c)/§2(d) still carry the pre-dedup "5".
- **⚠️ Phase 5 UPDATE — most of the inventory above no longer applies.** Under the esbuild
  application builder, measured with a cold `.angular/cache`:
  - **"part of the TypeScript compilation but it's unused" warnings: 5 prod / 6 dev → `0` / `0`.**
    The esbuild builder does not emit this diagnostic at all. **Backlog §2(d)'s "5 → 4" closure
    criterion is therefore unreachable and must be re-scoped** (Phase 7 can still delete the dead
    files; it just cannot cite a warning-count reduction as evidence).
  - **CommonJS/AMD bailouts: the message text changed** from Webpack's
    `Warning: <file> depends on '<dep>'. CommonJS or AMD dependencies can cause optimization bailouts.`
    to esbuild's `▲ [WARNING] Module '<dep>' used by '<file>' is not ESM`. The named specifier set grew
    from 5 to **6**: `moment-timezone`, `file-saver`, `moment`, `deepmerge`, `jalaali-js` **and a newly
    surfaced `uuid-random`** (via `node_modules/ical-generator/dist/index.js`) that Webpack never
    reported. **Phase 13 must cite six specifiers, not four.** Still nondeterministic — never gate on it.
  - **Sass deprecation warnings: 0 in both formats** (`Deprecation Warning on line N` and
    `▲ [WARNING] Deprecation [plugin angular-sass]`), in `ng build` production *and* development. The
    Webpack `sass-loader` is gone, so **its 0-based line-number off-by-one is gone with it** (§7).
  - **`emitDecoratorMetadata` warning: 0** — confirmed *not* to reappear now that the build really is
    esbuild, which is exactly why Phase 3 removed the flag.
  - **NG8xxx / NG0xxx: 0**, verified with the multi-line-safe histogram form from
    `docs/2026_MIGRATION_STATE.md` §1.
  - **The development build emits ZERO warnings of any kind.**
  - **The session `Hash:` line no longer exists** (see the chunk-structure bullets above), so the
    "never gate on `Hash:`" rule is moot rather than merely observed.

### CSS

| Measurement | Value |
|---|---|
| Global `styles.css`, dev build, Phase 1 (Bootstrap still imported) | 301.92 kB |
| Global `styles.css`, dev build, after Phase 7 | **27.46 kB** (27,459 B) — a 91% reduction |
| Global `styles.css`, dev build, after backlog-emptying Phase 4 (`@import` → `@use`) | **26.44 kB** (26,444 B) — `_palette.scss`'s 24 utility classes stop being emitted twice |
| Global `styles.css`, production (minified) | **20.95 kB** (20,951 B) — **unchanged** by Phase 4: the production CSS optimiser already deduplicated the double-emit, so only rule *order* changed (sha256 differs, byte count and selector multiplicities do not) |
| Distinct `--mat-sys-*` tokens in the production CSS | 165 |
| Bootstrap selectors (`.col-*-N`, `.btn-*`, `.form-control`, `.form-horizontal`, `.control-label`, `.has-danger`, `.navbar-fixed-top`, `.glyphicon`) in the production CSS | **0** |

### Tests — the 24 deferred failures

All 24 are loud, classified and recorded in `docs/2026_KNOWN_LIMITATIONS.md` (a); none is a migration
regression. Groups 4–6 were masked until Phase 6 fixed the TranslateStore NG0201 that aborted those
specs.

| Group | Count | Nature |
|---|---|---|
| ical-generator `toJSON()` drift | 10 | stale assertions — start/end are now ISO strings (were `Date`), event timezone is now `null` |
| nth-weekday `byDay` format | 7 | source bug — ical-generator rejects `'-3WE'`; bare weekday codes are still accepted |
| `saveAs` (`Cannot redefine property`) | 3 | `file-saver@2.0.5` is CJS-only; esbuild's synthesized namespace is non-configurable, so `vi.spyOn` cannot redefine it |
| CollisionDetector null-guard | 2 | source bug — `repeating: null` crashes `CollisionDetector.ts:61` |
| CollisionDetector stale expectation | 1 | stale date-holidays expectation, plus an assertion loop that iterates `i` but always compares index `[0]` |
| creator `saveText` | 1 | decided **option C** — accept reduced coverage; the drop is deferred to a user-initiated coverage review |

Also standing: i18n key parity — **138 EN / 138 DE** at Phase 8, now **127 EN / 127 DE** after
backlog-emptying Phase 10 deleted 14 orphaned keys and added 3 aria-label keys; compile-time NG8xxx
**0**, ProxyZone failures **0**.

### Build pipeline after backlog-emptying Phase 6 — Webpack retired

> **⚠️ The "Webpack pipeline" subsection this replaces described a broken pipeline that no longer
> exists.** For the whole migration, `npm run build` / `build:prod` failed because `client/main.ts`
> calls `bootstrapApplication(...)` while `webpack.client.config.js` expected
> `bootstrapModule(AppModule)` — backlog item **(e)**. The pipeline had been JIT-only with
> `ts-loader { transpileOnly: true }` (no type-checking, no `@angular/compiler` anywhere in
> `client/`), so it could not compile templates even before Phase 5.3. **Phase 6 deleted all four
> Webpack configs plus `postcss.config.js` and replaced them with one script.**

`scripts/build.mjs` is a native Node 24 ESM script — **no bundler builds the build script**. It uses
esbuild's **Node API** (`import * as esbuild from 'esbuild'`, pinned exact at `0.25.9`), not a CLI
string, so failures are typed objects and the script exits non-zero with a readable message.

| Product | How it is made | Replaces |
|---|---|---|
| `dist/electron/index.js` | esbuild, `format: cjs`, `platform: node`, `target: node24`, `external: ['electron']` | the `electron-main` config in `webpack.electron.config.js` |
| `dist/server/app.js` | esbuild, same options, `external: ['express', 'compression', 'path', 'os']` — they stay external because `server/package.json` declares them and a deployed server runs `npm install` against the copied manifest | the `target: node` config in `webpack.server.config.js` |
| `dist/server/static/browser/` | `ng build --configuration <mode> --output-path dist/server/static` | `webpack.client.config.js`, server invocation |
| `dist/electron/static/browser/` | the same `ng build`, different `--output-path` | `webpack.client.config.js`, electron invocation |
| `dist/electron/{package.json,manifest.json,LICENSE}`, `dist/server/package.json` | plain `copyFileSync` | the `CopyWebpackPlugin` patterns |

- **`--mode development|production`.** `development` skips minification of the two Node-side bundles,
  builds the Angular client with `--configuration development`, and skips the second (Electron)
  static bundle when `--target all`. `production` does the opposite and additionally asserts the
  Electron layout. `isElectron` stays `false` in both bundles (locked decision 17).
- **`--target all|server|electron`** backs `build:server` / `build:electron` and their `:prod` twins.
- **`--watch` is real and proven.** esbuild's `context.watch()` watches `electron/main.ts` and
  `server/app.ts`; a perturbation of `server/app.ts` produced `[watch] build started (change:
  "server/app.ts")` / `[watch] build finished` and a new `dist/server/app.js` md5 within **1 s**, and
  restoring the source byte-exactly returned the bundle to its original md5. **The Angular client is
  deliberately not watched here** — its supported hot-reload path is `npm run serve` (`ng serve`),
  which serves from memory and never writes `dist/`. Note that esbuild **0.25.9** removed the
  `onRebuild` callback (`WatchOptions` is now just `{ delay }`), so watch feedback comes from
  `logLevel: 'info'`, which is why watch mode logs at `info` and one-shot mode at `warning`.
- **The Electron nesting is the one leg that could silently break the desktop app.** The old
  `webpack.client.config.js` wrote the Electron client **flat** into `dist/electron/static`, but
  Phase 5 repointed `electron/main.ts` at `static/browser`. Because the second `ng build` also uses
  `@angular/build:application`, it emits `dist/electron/static/browser/` on its own — verified
  empirically: **`dist/electron/static/browser/index.html`, 10,687 B**. `scripts/build.mjs` asserts
  that path after every static build and fails loudly if it is missing.
- **`prebuild` was deleted.** It invoked `mkdirp`, which was never a declared dependency; esbuild and
  `ng build` both create their own output directories.
- **`serve` is now plain `ng serve`** (was `webpack serve --mode development`). The script name is
  load-bearing: `playwright.config.ts` starts it via `npm run serve`.
- **Deliberately dropped,** each because the Angular esbuild builder now owns it: `postcss.config.js`
  + autoprefixer (its only consumer was `postcss-loader` inside the deleted CSS chain),
  `html-webpack-plugin`, `mini-css-extract-plugin`, `source-map-loader`, `terser-webpack-plugin`,
  `splitChunks` / `runtimeChunk`, the `process.env.ELECTRON` `DefinePlugin` (no source file ever read
  it) and the Webpack devServer (port 4200 + `historyApiFallback`).
  **One inert loss worth recording:** `postcss.config.js`'s
  `overrideBrowserslist: ['last 2 versions', '> 1%', 'not dead']` was the **only browser-target
  declaration in the whole repository** — there is no `.browserslistrc` (it is `.gitignore`d *and*
  absent from disk) and no `browserslist` key in `package.json`. The file had already been ignored
  since Phase 5, when the esbuild builder took over autoprefixing and fell back to browserslist's own
  defaults; `styles-DRBU42VC.css` is byte-identical before and after this deletion (20,951 B, same
  hash), so nothing measurable changed. What changed is that the intent is no longer written down
  anywhere. Restoring it means adding a **tracked** `.browserslistrc` — a source change, deliberately
  not made here.
- **`dist/` is no longer tracked.** 42 ancient artefacts were untracked and the five narrow
  `.gitignore` rules collapsed into one `/dist/`. See §7 deviation 10.

**Runtime proof (inside Docker, one invocation — a green build is not enough):**

| Leg | Result |
|---|---|
| `npm run build:prod` | **exit 0**, cold `.angular/cache` |
| `node dist/server/app.js` → `curl -I http://localhost:8000/` | **200**, `Content-Type: text/html`, `Content-Length: 10687` — the built `index.html` |
| `curl -I /main-IJN2BJGT.js` | **200**, `application/javascript`, 2,157,337 B |
| `curl -I /polyfills-5CFQRCPP.js` | **200**, `application/javascript`, 34,585 B |
| `curl -I /styles-DRBU42VC.css` | **200**, `text/css`, 20,951 B |
| `curl -I /favicon.ico` | **200** |
| `dist/electron/index.js` is CJS | **0** top-level `import` / `export` / `await`; `require("electron")`, `require("path")` |
| `dist/server/app.js` is CJS | **0** top-level `import`; `require("compression")`, `require("express")`, `require("os")`, `require("path")` |
| `dist/electron/static/browser/index.html` | **present**, 10,687 B — the exact path `electron/main.ts` resolves |
| Electron actually launching | **UNVERIFIED — the one unverified leg.** `node_modules/electron/dist/electron` exits **127**: `error while loading shared libraries: libnss3.so: cannot open shared object file`. Electron cannot run headless in this container and no system packages were installed to make it work |

**`3rdpartylicenses.txt` decision — left where the builder puts it.** Two artefacts land at the
`outputPath` root, *outside* `browser/`: `3rdpartylicenses.txt` (52,007 B, production only) and
`prerendered-routes.json` (18 B, `{"routes": {}}`). Since `express.static` serves `static/browser`,
the licence file is **not** reachable as itself: `curl -I /3rdpartylicenses.txt` returns **200** but
with `Content-Type: text/html` and `Content-Length: 10687` — that is `index.html` from the
unconditional Express catch-all, not the 52,007 B licence text. A repo-wide grep found **no code that
fetches it**, so the layout stays as-is. A release-packaging step that wants it must look one level
above the served root.

### Final gate results and production bundle after backlog-emptying Phase 13 (migration closure)

Phase 13 (task #38) retired `docs/2026_MIGRATION_BACKLOG.md` into `docs/2026_KNOWN_LIMITATIONS.md` and
ran the full verification battery one last time, all inside Docker via
`docker compose run --rm duely-dev <cmd>`, batched with `;` + `echo "LABEL_EXIT=$?"`. It touched **zero**
client, server or electron source files — the only changes are documentation and the backlog deletion —
so this is a documentation-closure snapshot of an unchanged tree, not a code change.

| Gate | Command | Result |
|---|---|---|
| G1 — app type-check | `npx tsc --noEmit -p client/tsconfig.app.json` | **PASS**, exit 0 |
| G1b — server type-check | `npx tsc --noEmit -p server/tsconfig.json` | **PASS**, exit 0 |
| G1c — electron type-check | `npx tsc --noEmit -p electron/tsconfig.json` | **PASS**, exit 0 |
| G2 — spec type-check | `npx tsc --noEmit -p client/tsconfig.spec.json` | **PASS**, exit 0 |
| G3a — invariant | `grep -cE 'error (TS2322\|TS2531)'` over G1/G2 | **PASS**, literally `0` |
| G3b — dev build | `npx ng build --configuration development` | **PASS**, exit 0 |
| G4 — unit tests | `npm test` | **24 failed / 49 passed (73 specs)**, **5 failed / 12 passed (17 files)**, **0** NG8xxx, **0** NG0xxx, **44** icon-registration stderr warnings (D19 — test-harness only, all affected specs pass). Failing-name md5 `172d78996b50c84e38211b529d76ab0b` **== baseline**, 24 names, `diff` **EMPTY** |
| G5 — production build | `npm run build:prod` | **PASS**, exit 0, **0** budget warnings at `maximumWarning 2.55mb` / `maximumError 5mb`, **0** `anyComponentStyle` warnings; **12** CommonJS optimization-bailout occurrences (6 distinct specifiers × 2 output paths — see (b.3)) |
| lint | `npm run lint` | **PASS**, exit 0, **0 errors / 8 warnings** |
| e2e | `npx playwright test` | **16 passed / 0 failed** (10.0 s) |
| i18n parity | python3 key-set diff | **127 EN / 127 DE — IDENTICAL** |
| hygiene | — | `git ls-files dist` **0** · live Sass `@import` **0** (7 grep matches, all inside comments) · Webpack configs **0** · `docker ps -a --filter name=duely` **EMPTY** |

**The 73-spec baseline.** G4 reports **73** specs across **17** files, up from the **71** specs / **16**
files recorded through Phase 11. Phase 12 (`5bec199`) added `client/app/i18n-parity.spec.ts`
(**+2 passing** tests, **+1 passing** file). The **24-failure partition is byte-for-byte unchanged** —
the failing-name md5 still equals `.git/duely-failing-names-baseline.txt` and the diff is empty, so the
two new passing specs did not disturb a single deferred failure.

**Final production bundle (measured from `dist/server/static/browser/` after G5, exact bytes):**

| Chunk | Raw bytes | Role |
|---|---|---|
| `chunk-JZJ2L7GC.js` | **1,619,140 B** | initial, shared third-party |
| `main-UADZYEJY.js` | **279,047 B** | initial, app entry (sha256 `dad3b751…`) |
| `chunk-QBUSXI3J.js` | 190,283 B | initial, shared |
| `chunk-MY5TLO44.js` | 157,016 B | initial, shared |
| `polyfills-5CFQRCPP.js` | 34,585 B | initial |
| `styles-DRBU42VC.css` | 20,951 B | initial |
| `chunk-Z7MHJMDT.js` | 11,150 B | initial |
| **Initial total** | **2,312,172 B (2.31 MB)** | **371.55 kB** estimated transfer |
| `index.html` | 10,840 B | — |
| lazy `chunk-*.js` (animations, holiday catalogue, …) | — | route-level, Phase 11.1 |

- **Budget: 0 warnings.** The rebaselined `maximumWarning: "2.55mb"` (Phase 11.1) leaves headroom over
  the 2,312,172 B initial total; `maximumError` stays `5mb`; `anyComponentStyle` `6kb/10kb` still PASSes.
- **Phase 11.1 restructure.** Route-level lazy loading (`33a038e`) converted three routes to
  `loadComponent`, which split the former single 2.16 MB `main-IJN2BJGT.js` into a small ~279 kB entry
  plus the large shared `chunk-JZJ2L7GC.js`; the initial total is essentially unchanged (2.37 MB →
  2.31 MB) but the app entry itself shrank ~87%.
- **`main-4YER4DET.js` → `main-UADZYEJY.js` (+109 B) re-hash — NOT a Phase 13 change.** TASKBOARD §37.6
  recorded the post-OnPush entry as `main-4YER4DET.js` (278,938 B). The live entry is `main-UADZYEJY.js`
  (279,047 B), **+109 B**. The delta traces to commit `6e7aa73` (the Phase 11.4 `translate.onLangChange`
  follow-up), which landed after §37.6 was measured and was never re-baselined. **Phase 13 touched zero
  client files, so it changed no emitted byte.** Every other chunk is byte-identical to §37.6.

**Reduced visual pass (user decision — 10 screenshots, not the full 72).** Playwright headless ran
**inside one container**: a detached `ng serve` (`docker compose run --rm --service-ports -d duely-dev`)
plus a `docker exec` driver (`.git/duely-p13-shots.cjs`) into the same container, seeding
`localStorage['settings']` via `context.addInitScript()` with the real geo triple ES/CN/GC (§35.9).
5 routes (`/`, `/about`, `/legal`, `/settings`, `/404`) × 2 themes × 1440×900 = **10 fullPage PNGs**
under `.git/duely-p13-shots/`. **Every route: 0 console errors, 0 page errors, 0 NG8xxx, 0 NG0xxx.**
The creator route (`/`) logged **exactly 1** deprecation warning (the known `ngModel` + `formControlName`
combination). **D20 pixel-confirmed:** `getComputedStyle(document.body).backgroundColor` returned
`rgb(221, 221, 221)` **identically for light AND dark on every route** — the hardcoded
`body { background: #ddd }` never inverts (KNOWN_LIMITATIONS (i.1) / decision D20). Per-theme PNG byte
sizes still differ (some Material tokens do invert). Container stopped with `docker stop <id>`;
`docker ps` EMPTY afterwards; porcelain clean.

---

## 7. Known deviations

1. **CLOSED by backlog-emptying Phase 6 — the Webpack pipeline is gone (backlog item e).** It had
   been broken since Phase 5.3's `bootstrapApplication` switch; that was expected and was never a
   migration regression, because the CLI pipeline was green throughout. Phase 6 deleted
   `webpack.config.js`, `webpack.client.config.js`, `webpack.electron.config.js`,
   `webpack.server.config.js` and `postcss.config.js`, replaced them with `scripts/build.mjs`, and
   `npm run build:prod` now exits 0 with a runtime-probed artefact. See §6.
2. **`client/environments/environment.prod.ts` was missing from repo creation.** `angular.json`'s
   production `fileReplacements` pointed at a file that never existed, so the production
   configuration had never been exercised. Added in Phase 8 (`production: true`,
   `isElectron: false`, matching `environment.server-prod.ts`); this unblocked gate 4 and produced
   the first-ever production budget measurement.
3. **44 icon-registration stderr warnings in TestBed specs.** `provideDuelyIcons()` runs from
   `app.config.ts`, which spec TestBeds do not load, so `<mat-icon svgIcon="duely:...">` logs a
   lookup warning per render. Cosmetic — every affected spec still passes, and adding the provider
   to 10 TestBeds would only silence output.
4. **CLOSED by backlog-emptying Phase 4 — both legacy Sass `@import` sites are gone.** They were
   `client/styles.scss:7` and
   `client/app/creator/appointment-form/appointment-form.component.scss:1`, both pulling
   `_palette.scss`; both are now `@use … as palette` with namespaced members. `@import` is removed in
   Dart Sass 3.0. All SCSS in `client/` now uses `@use`. **Zero** live `@import` directives remain;
   the 7 surviving `@import` textual matches are all inside `/* */` header comments (prose, not
   Sass) in 5 files and are deliberately untouched. Two claims this item previously made were
   **wrong** and are corrected here from Phase 4's measurements:
   - **The warning count was never asymmetric.** *Both* pipelines emitted **2** warnings, one per
     site. The recorded "`ng build` emits only 1" was a **warm-`.angular/cache` under-count**: when
     `styles.scss` is served from cache its deprecation warning is suppressed. Reproducibly 2 on a
     cold *and* a warm cache in Phase 2, and 2 again in Phase 4. Both pipelines are now **0**. Any
     future Sass measurement must `rm -rf .angular/cache` first.
   - **The Webpack `sass-loader` prints 0-based line numbers.** It reported `styles.scss` at
     `line 6` and `appointment-form.component.scss` at `line 0` for what are really lines **7** and
     **1**; its own stack traces say `styles.scss 7:9 root stylesheet`. The esbuild pipeline behind
     `npm test` prints correct 1-based positions (`client/styles.scss:7:8`). Cite the esbuild
     numbers, and grep **both** warning formats — a single-format grep falsely reports 0.
   Effects of the switch: the palette double-emit is gone, so **dev** `styles.css` fell 27,459 B →
   **26,444 B** (each of `.label-red` / `.red` / `.border-red` went from 2 occurrences to 1).
   **Production** `styles.css` is byte-identical at 20,951 B with identical selector multiplicities
   — the production optimiser already deduplicated — but its content hash changed and the estimated
   transfer rose 1.91 kB → 1.94 kB, because `@use` emits a module's CSS at its first dependency
   encounter and `styles/_theme.scss` already `@use`d the palette, so the palette rules now hoist
   ahead of `:root`. That reorder is inert: the only palette classes any template uses are
   `.label-{accent}`, which set `color` and have no equal-specificity competitor, and a 72-shot
   Playwright matrix (6 route states × 2 themes × 2 accents × 375/800/1440) captured before and
   after inside one dev-server session was **byte-identical on all 72 PNGs**.
5. **CLOSED — `npm run lint` now runs and passes (former backlog item f).** It originally failed
   because `package.json` passed `--ext`, which ESLint 9 removed. Linting was restored with an ESLint 9
   **flat config** (`eslint.config.js`, commit `a002265`); `package.json` now runs plain `eslint .`, and
   a series of follow-ups (`d94c3d7` → `36bb13f` → `3ce6676` → `138a590`) drove the error count
   516 → 0. Phase 13's lint gate reports **exit 0, 0 errors / 8 warnings**. The `standalone` / `@for`
   conventions are still guarded primarily by gates 1, 2 and 3, but lint is no longer a dead gate.
6. **Deviation D5 from the plan persists:** `appointments.service.ts`'s `initializeCalendar()` was
   made `public` solely so `vi.spyOn` type-checks. The revert was deferred because that spec is
   deferred-red anyway; revisit with the CollisionDetector/appointments backlog work.
7. **`/settings` deep-links 404 on the dev server** — pre-existing `PathLocationStrategy` without a
   history fallback. Users reach Settings through in-app navigation from `/`.
   **FIXED by backlog-emptying Phase 5.** `@angular/build:dev-server` supplies the SPA history
   fallback that the Webpack dev-server did not. Measured against a live `ng serve` on :4200:
   `/settings` → **200** returning the app's `index.html`, an arbitrary `/nope/not/a/route` → **200**
   with `index.html` (the Angular router then renders `notFound`), while a genuinely missing asset
   `/assets/does-not-exist.png` still correctly → **404**. Deep links therefore work on the dev
   server; the Express catch-all in `server/app.ts` supplies the same fallback in production once
   Phase 6 makes that bundle runnable. **Phase 9's Playwright `server` project should re-test this
   rather than assume the 404.**
   **Phase 6 addendum — the two fallbacks are NOT equivalent.** The Express catch-all is
   *unconditional* (`app.use((req, res) => res.sendFile(...))`, with no `Accept` or extension test),
   so against a running `node dist/server/app.js` **every** unmatched path returns **200 with
   `index.html`**: measured `/definitely-not-here.txt` → 200 and `/assets/does-not-exist.png` →
   **200**, where the dev server correctly gives 404 for the same asset path. Deep links work in both;
   only genuine missing-asset detection differs. Pre-existing behaviour, not introduced by Phase 6,
   and left alone — but **Phase 9's `server` project must not port the dev server's 404 expectation**.
   Related: `client/index.html` has **no `<base href="/">`** and references its assets relatively, so
   at a multi-segment path the fallback serves `index.html` and every relative asset resolves against
   the wrong directory. Also pre-existing (the stale Webpack-era `dist/server/static/index.html` had
   the same defect), also deliberately untouched in Phase 6.
8. **Visual delta versus the `before/` baseline is large and legitimate** — the navbar overlay fix
   (`54a4ffb`) alone changes every route. The 18 before-shots and 72 after-shots live under
   `docs/migration-shots/` (git-excluded).
9. **NEW in backlog-emptying Phase 5 — the esbuild builder relocates browser output one level down.**
   `@angular/build:application` writes to **`{outputPath}/browser/`**, so with
   `outputPath: "dist/server/static"` the app now lands in `dist/server/static/browser/`, not
   `dist/server/static/`. Three consumers were repointed, each by the smallest possible edit (path
   segments only):
   - `server/app.ts` — `path.resolve(__dirname, 'static')` feeding `express.static(…)` →
     `path.resolve(__dirname, 'static', 'browser')`
   - `server/app.ts` — the catch-all's `path.join(__dirname, 'static/index.html')` →
     `path.join(__dirname, 'static', 'browser', 'index.html')`
   - `electron/main.ts` — `const clientFolder = path.resolve(__dirname, 'static')` →
     `path.resolve(__dirname, 'static', 'browser')`; the `loadURL` that interpolates `clientFolder`
     follows automatically.

   **Caveat — DISCHARGED by Phase 6.** `server/app.ts` and `electron/main.ts` sat outside every
   `tsconfig` include path, so no type-check gate covered them. Phase 6 authored
   `electron/tsconfig.json` (gate **G1c**), repaired `server/tsconfig.json` so it actually compiles
   (gate **G1b**), and both gates now pass with **0 errors**. The repair was substantive: the
   inherited `moduleResolution: "bundler"` combined with `module: "commonjs"` emitted **TS5095** (`server/tsconfig.json(6,25): error TS5095: Option 'bundler' can only be used
   when 'module' is set to 'preserve' or to 'es2015' or later.`) and aborted compilation with exit
   code 2 — neither silent nor green; no source-level type-checking was performed, and the gate was
   never exercised before Phase 6 added **G1b**. It also carried
   `noImplicitAny: false`, which weakened the root's `strict`. Fixed defects, all of them the ones
   Phase 5 deliberately left behind plus two the brief did not list: the `process.env.PORT || 8000`
   strict violation (→ `Number(process.env.PORT ?? 8000)`), the `import * as express` namespace style
   (→ default imports under `esModuleInterop`), **TS2532** on `network[name]` (an index-signature
   possibly-undefined, *not* the implicit-any that was expected), **TS2349** on the resulting call,
   `let mainWindow: Electron.BrowserWindow = null` (→ `BrowserWindow | null`), the implicit-any
   `(event)` in `ipcMain.on` (→ `IpcMainEvent`), the `console.log('ping')` Quick-Start leftover
   (deleted), **TS7016** for `compression` (→ `@types/compression@^1.8.1` added as a devDependency;
   no ambient shim, no `as any`).

   **Also note:** `3rdpartylicenses.txt` and `prerendered-routes.json` are written at the `outputPath`
   root, *outside* `browser/`, so the Express static root no longer serves `3rdpartylicenses.txt`.
   Nothing in the app requests it, but a release-packaging step that expects it under the served root
   must look one level up. **Phase 6 confirmed this empirically** rather than by inspection: the file
   is 52,007 B on disk, while `curl -I /3rdpartylicenses.txt` returns `Content-Type: text/html` /
   `Content-Length: 10687`, i.e. `index.html`. Decision: leave the layout as-is. Full evidence in §6.

10. **NEW in backlog-emptying Phase 6 — `dist/` is no longer tracked, and the contradiction that came
    with it is gone.** `.gitignore` carried five narrow `/dist/...` rules, one of which was
    `/dist/server/`, while **three files inside that very directory were tracked**
    (`dist/server/app.js`, `app.js.map`, `package.json`) — an ignore rule that git honours only for
    *untracked* paths, so the contradiction was invisible to `git status` and survived every previous
    cleanup. `git rm -r --cached dist` removed **42** files and the five rules collapsed into a single
    `/dist/`. The untracked artefacts were **ancient**: five `glyphicons-halflings-regular.*` font
    files and `assets/tech/bootstrap.svg` (both deleted back in migration Phase 7), Angular-4-era
    `inline.bundle.js` / `main.bundle.js` / `polyfills.bundle.js` / `styles.bundle.js` /
    `vendor.bundle.js` names, a `service-worker.js` generated by `sw-precache-v3-duely` /
    `sw-toolbox`, and a `vendor.bundle.js` whose embedded Angular version marker reads **4.4.6**.
    **They predate Git itself.** Both tracked `dist/*/package.json` manifests are copies of a version
    **`0.2.0`** `package.json` whose `repository` is `"type": "svn"`,
    `https://sep.isf.cs.tu-bs.de/svn/17-cio_1/`, whose `bugs.url` is a **Redmine** project on the same
    host, and whose licence string is the pre-SPDX `"MPL v2.0"`; the live root `package.json` is
    version `2.0.0`, `"type": "git"`, `https://github.com/tubraenschweig/duely`, `"MPL-2.0"`, and
    lists a fifth contributor the tracked copies do not have. So the tracked `dist/` was committed
    under Subversion and migrated across — it is not merely stale, it belongs to a different VCS, and
    `scripts/build.mjs`'s `copyManifests()` reproduces those `CopyWebpackPlugin` patterns and would
    overwrite both `dist/` copies from the live `server/package.json` and `electron/package.json` —
    version `2.0.0`, `"type": "git"`, GitHub — on the very next build anyway.
    Nothing consumed them: the only `dist/` references in `Dockerfile`, `docker-compose.yml` and the
    manifests are `COPY --from=builder /app/dist/server`, `CMD ["node","./dist/server/app.js"]`, the
    two `start:*` scripts in `package.json`, the `duely-build` service's `./dist:/app/dist` bind
    mount, `angular.json`'s `outputPath: "dist/server/static"` and **three** tsconfig `outDir`
    settings (root `./dist/out-tsc`, `../dist/server`, `../dist/electron`) — all of which build
    `dist/` themselves.
    `scripts/build.mjs` also reproduces Webpack's `output.clean: true` by pruning each static output
    directory before building, precisely so these Angular-4-era files cannot survive next to
    `browser/`.

11. **CLOSED by task #52 (commit C, 2026-09-18) — `@angular-devkit/build-angular` is removed, and the
    Webpack toolchain is now gone from `node_modules` too.** *Background:* it became a dead
    devDependency in backlog-emptying Phase 6, when all three `angular.json` architect targets moved to
    `@angular/build:*` (`application` line 18, `dev-server` line 70, `unit-test` line 85); there is no
    `extract-i18n`, `lint`, `e2e`, `app-shell`, `prerender`, `server` or `deploy` target. It was kept in
    Phase 6 — and deliberately *not* folded into Phase 7's dead-code commit `67d9465` — because a
    dependency change forces its own lockfile regeneration, image rebuild and full gate re-run, and
    mixing that with source deletions would have made the dead-code commit non-revertable in isolation.
    *Verification before removal:* `npm ls @angular-devkit/build-angular --all` showed only the root
    edge, and a recursive scan of **1280** installed manifests found **0** packages declaring it as a
    dependency, peer or optional peer — so unlike `@angular/animations` on v20 it was not load-bearing.
    The only tracked references were the `package.json` declaration itself plus prose in this document.

    **What landed (commit C):** the `"@angular-devkit/build-angular": "^20.3.23"` line was removed from
    `package.json` devDependencies; the lockfile was regenerated **inside Docker**
    (`npm install --package-lock-only`); the image was rebuilt **once** (`docker compose build
    duely-dev`, `3d6688fb1034` → `e73798458084`) so the pruned tree is baked in. `@types/file-saver`
    and `@types/compression` were deliberately **not** touched, and no source, `angular.json`, tsconfig,
    `Dockerfile` or `docker-compose.yml` was modified.

    **Lockfile delta:** `packages` keys **1407 → 1076** (nodes **1406 → 1075**, **−331**); file
    **18,523 → 13,915 lines** (**−4,608**). The exclusive transitive closure that left includes
    `webpack` 5.105.0, `webpack-dev-server`, `postcss-selector-parser`, `less`, `source-map-loader`,
    `copy-webpack-plugin`, `css-loader`, `@ngtools/webpack`, `babel-loader`, `terser`, `autoprefixer`,
    `sass-loader`, `mini-css-extract-plugin`, `serialize-javascript`, `postcss-loader`, `less-loader`
    and the whole de-hoisted `@angular-devkit/build-angular/node_modules/*` subtree. The 1,854
    insertions in the lockfile diff are **re-hoistings, not new dependencies**: packages that had been
    deduped *under* build-angular (`@angular-devkit/core`, `@angular-devkit/schematics` and their deps
    `ajv`, `chalk`, `ora`, …) were promoted to the top level at the **same versions** for
    `@angular/cli`. `npm audit` exposure dropped **60 → 45**.

    **postcss correction:** the prior claim that `postcss` was an audit entry "solely because of"
    build-angular was **incomplete**. The de-hoisted `postcss` **8.5.6** under build-angular did leave,
    but `postcss` **8.5.9 remains** as a legitimate dependency of `@angular/build` (via `beasties` and
    `vite`). `webpack-dev-server`, `postcss-selector-parser` and `less` are genuinely gone.

    **Post-removal state:** `npm ls @angular-devkit/build-angular` → `(empty)`; the directory
    `node_modules/@angular-devkit/build-angular` is absent; `npm ls --depth=0` is clean (no
    extraneous/UNMET/invalid). The "Webpack retired" claim is now true of the *pipeline*, the *direct*
    dependency list **and** `node_modules`.

    **Gates (all in Docker, rebuilt image `e73798458084`; Node 24.21.0, npm 11.19.0, TS 5.9.3):**
    G1/G1b/G1c/G2 `tsc --noEmit` exit 0; G3 `npm run build` exit 0 (dev initial 5.43 MB, 0 unused-file
    warnings); G4 `npm test` 24F/47P (71), 5F/11P files (16), 44 icon errors, 0 NG8xxx, failing-name
    diff vs baseline **EMPTY**, names md5 `172d78996b50c84e38211b529d76ab0b` unchanged; G5
    `npm run build:prod` exit 0, **0 budget warnings**, initial **2.37 MB / 372.17 kB**. Because commit
    C changes **no** file under `client/`, the production bundle is **byte-identical to Phase 7**:
    `main-XSJNV6OY.js` **2,157,313 B** (sha256 `34c0e0ef…`), `chunk-OBZMNR63.js` 157,016 B,
    `chunk-VOEP2MIL.js` 67,773 B, `polyfills-5CFQRCPP.js` 34,585 B, `styles-DRBU42VC.css` 20,951 B,
    `index.html` 10,687 B — every artefact and hash unchanged. i18n parity 138/138 preserved.

---

## 8. Commit chain

Newest first, from the migration handoff (`docs/2026_MIGRATION_STATE.md` §3):

```
87232ae     Phase 8: final gates and documentation
619390b     Phase 7: remove Bootstrap entirely
201f166     Phase 6: test(specs) — restore the regression net
0f22483     Phase 5: feat(shell) — standalone bootstrap, AppModule deleted
0483db3     Phase 4: feat(static-screens) — about, legal, notFound
0d53dfb     Phase 3.5: feat(creator)
ce7c6ff     Phase 3.4: feat(appointment-form), auto-resize directive deleted
8b1d40a     Phase 3.3: feat(recurring-settings)
bf6de16     Phase 3.2: feat(alarm-settings)
f334fe8     Phase 3.1: feat(advanced-settings)
2060558     Phase 2: feat(settings) — Material pilot, user sign-off APPROVED
348d835     Phase 1: feat(theme) — design foundation
e75d3c6     doc restructuring (PLAN / STATE / BACKLOG)
54a4ffb     fix(navbar): in-flow nav, right-aligned 25% logo
b88b3cf     docs(migration): correct two backlog facts
5a219bc     fix(dates): wall-clock-day dates into the datepicker controls
5c84fe6     docs(migration): plan corrections and deferred backlog
937a920     test(spec): waitForAsync specs execute under vitest
98f603f     fix(dates): timezone handling in the activated date handlers
d70817f     fix(build): ng serve under the Angular 20 dev-server schema
6a228f3     fix(build): app bundle compiles, unit tests execute
443f17c     (pre-migration) TS2322 / TS2531 driven to zero — the standing invariant
```

Branch `dev-v2` is unpushed with no upstream; nothing in the migration pushes or creates one.

### Backlog-emptying commit chain (Phases 0–13, the plan that retired the backlog)

The migration chain above ends at Phase 8 (`87232ae`). The **14-phase "Emptying and deleting
`docs/2026_MIGRATION_BACKLOG.md`" plan** then ran on top of it (tasks #25–#38). Newest first, with the
phase each commit belongs to; the security commits `3a3ce21`/`c379a4c` and the dependency-upgrade docs
commits `86f75bf`/`1f6fd97` are interleaved but belong to neither plan:

```
[Phase 13]  docs: retire the migration backlog into KNOWN_LIMITATIONS   (this closure commit)
1f6fd97     docs(upgrades): record the six upgrade-cycle decisions      (unrelated — HEAD before Phase 13)
5bec199     [Phase 12] test(i18n): assert en/de translation key parity
86f75bf     chore: dependency-upgrade task board + dep-graph visualizer (unrelated)
c24818c     docs(backlog): correct the markForCheck rationale attribution
6e7aa73     [Phase 11.4] fix(onpush): subscribe to translate.onLangChange
9ced4a4     [Phase 11.4] perf(change-detection): OnPush on the four appointment-form components
69c9ea2     docs(routes): correct the false lazy-chunk count
1b1dbba     [Phase 11.3] docs(backlog): trimmed moment-timezone CLOSED WITH RATIONALE (DECLINED)
57f0932     [Phase 11.2] refactor(collisions): extract HolidayCatalogService
33a038e     [Phase 11.1] perf(routes): lazy-load route components, re-tighten budget 2.6→2.55mb
138a590     [Phase 10-lint] chore(lint): bring vitest.setup.ts into ESLint scope
3ce6676     [Phase 10-lint] refactor(lint): reach lint exit 0 (111→0)
e289c18     [Phase 10d] fix(test): restore jsdom localStorage shadowed by the Node 26 getter
48989b0     [Phase 10c] fix(e2e): bump @playwright/test to ^1.64.1 (Node 26 extract-zip deadlock)
c379a4c     Switch base images to node:lts-slim                         (user security commit)
3a3ce21     Add Docker Hub security check script                        (user security commit)
36bb13f     [Phase 10-lint] refactor(lint): type moment/eventData/settings (441→111)
d94c3d7     [Phase 10-lint] fix(lint): eslint --fix mechanical corrections (516→441)
faca1d4     [Phase 10b] build(docker): bake Playwright Chromium into the dev image
be16352     [Phase 10a] fix(ical): guard against null repeating in ICS generation
0dbb401     [Phase 10] test(e2e): repair the six stale pre-migration selectors
51eee0d     [Phase 10] fix(ui): legal screen, aria labels, i18n keys, phantom service worker
29cce84     [Phase 10] fix(storage): validate persisted setting types on load
1a123cd     [Phase 10] fix(dates): clone the date-holidays Date instead of mutating it
05e0c51     [Phase 9A] chore(lint): decline prefer-inject (user decision)
13f91ae     [Phase 9] test(e2e): repair the Playwright config (dev-server + built-server projects)
a002265     [Phase 8] chore(lint): restore linting with an ESLint 9 flat config
aed844b     [Phase 7C] chore(deps): retire dead @angular-devkit/build-angular
67d9465     [Phase 7] chore: delete dead code, dead configs, unreachable ambient declarations
185c05d     docs: correct post-Phase-6 findings, consolidate untranslated-strings backlog
56bb8d5     [Phase 6] build(esbuild): retire the Webpack pipeline for one native esbuild script
4525785     [Phase 5] build(angular): switch build and serve to the esbuild application builder
6113520     [Phase 4] fix(styles): replace deprecated Sass @import with @use, end palette double-emit
0bf8577     [Phase 3] perf(tsconfig): drop emitDecoratorMetadata, which Ivy does not need
744d70a     [Phase 1/2] chore(deps): manifest hygiene, drop unused date-fns, bump the tar override
97e3120     [Phase 0] docs: rewrite the testing guide for the Vitest stack, retire stale test docs
ced1dc8     [Phase 0] docs: consolidate DEPENDENCIES_UPGRADED + DEPRECATION_ANALYSIS (rebaseline HEAD)
```

Phase 13 is the **terminal** commit of this chain: it authors `docs/2026_KNOWN_LIMITATIONS.md`,
`git rm`s the backlog, and repoints every inbound reference — no source file changes. See §6's
"Final gate results … after Phase 13" for its verification battery.

---

## 9. Pre-migration infrastructure upgrade

The Bootstrap-to-Material migration was preceded by an **Angular 19 → 20 LTS and Node.js 22 → 24
LTS infrastructure upgrade**, completed 2026-04-14 (~2 hours). It is not part of Phases 0–8; it
put the toolchain on the versions the migration then relied on — most importantly Angular 20's
`@angular/build:unit-test` builder, which is the only way to get official Vitest support and which
did not exist in Angular 19. Its two tracking documents (`ANGULAR_20_UPGRADE_PLAN.md` and
`ANGULAR_20_UPGRADE_COMPLETE.md`) were consolidated into this section and deleted.

| Component | Before | After |
|---|---|---|
| Angular | 19.2.20 | **20.3.18** |
| Angular CLI / @angular/build | 19.2.24 | **20.3.23** |
| TypeScript | 5.7.3 | **5.9.3** |
| Node.js | 22.x | **24.14.1** |
| vitest | not installed | **3.1.0** |
| jsdom | not installed | **26.1.0** |

Key changes: `ng update @angular/core@20 @angular/cli@20` schematics applied; Jasmine → Vitest
migration (18 spec files scanned, 9 transformed) with Karma/Jasmine removed and `karma.conf.js`
deleted; strict TypeScript mode enabled; deprecated API replacements (moment namespace → default
imports, `ical-generator` and `date-holidays` type usage). Six commits, oldest first:

```
1574db3     feat: prepare for Angular 20 + Node.js 24 LTS upgrade
0c1bd71     chore: upgrade ngx-bootstrap to v21 for Angular 20 compatibility
995e892     chore: update package-lock.json after ngx-bootstrap upgrade
c710232     feat: upgrade to Angular 20 LTS
dd594f2     feat: configure Vitest for Angular 20
54332f8     fix: update moment imports from namespace to default imports
```

The upgrade delivered working infrastructure but left the unit tests failing to compile against a
set of **pre-existing** issues that TypeScript 5.9's stricter checking only then surfaced:
strict-null errors, `ical-generator` / `date-holidays` type mismatches, missing return statements,
Bootstrap CSS import paths and spec compilation failures. None was caused by the upgrade itself.
All of them were subsequently resolved by Material migration **Phases 0–8** (§1), which reached the
green baseline recorded in §6 (tsc 0 / 0 errors, 24F / 47P). These six upgrade commits sit below
`443f17c` at the foot of the §8 commit chain.

### Webpack 2 → 5 config rewrite (March 2026)

Earlier still, in March 2026, the three Webpack configs (`webpack.client.config.js`,
`webpack.server.config.js`, `webpack.electron.config.js`) were rewritten from Webpack 2 to Webpack 5
for Angular 19: `@ngtools/webpack` / `awesome-typescript-loader` → `ts-loader`, `ExtractTextPlugin` →
`MiniCssExtractPlugin`, `node-sass` → Dart Sass, modern asset handling, and `postcss.config.js` added.
Its completion report (`WEBPACK_FIX_SUMMARY.md`) also listed 7 source-code errors then blocking the
build (`@angular/http` ×2, `ng2-datepicker` ×3, RxJS `Subscription` ×2); all 7 were resolved during
Phases 0–8, and its moment.js / Bootstrap 3→5 / strict-TypeScript follow-ups are covered by backlog
(g) and Phase 7. That report has been consolidated into this section and deleted. The Webpack
pipeline breakage it predates (backlog item **e**, §6) was unrelated to this rewrite — it was caused
by Phase 5's `bootstrapApplication(...)` switch, which left the JIT-only `ts-loader` pipeline
expecting the deleted `bootstrapModule(AppModule)`. **All three configs this subsection describes,
plus `webpack.config.js` and the `postcss.config.js` it added, were deleted by backlog-emptying
Phase 6**; §6 records what replaced them.

### v2.0 upgrade status report (March 2026)

The root-level `STATUS_REPORT.md` (dated 2026-03-13) tracked the v2.0 modernization — dependency,
Docker and configuration work complete, but Webpack configs, Angular source migration, Bootstrap
3→5, testing and production deployment listed as incomplete at "25% complete, Phase 1". Every open
item was subsequently finished by the Webpack 2→5 rewrite above, the Angular 19→20 upgrade, and
Material migration Phases 0–8; its genuine residue (the JIT Webpack pipeline, `npm run lint`, dead
Protractor/tslint configs, lazy loading) is already recorded in `docs/2026_MIGRATION_BACKLOG.md`
(a)/(e)/(f)/(g). The stale snapshot has been consolidated into this section and deleted.

### Angular 4 → 19 source-code migration (March 2026)

The root-level `SOURCE_CODE_MIGRATION_COMPLETE.md` (dated 2026-03-13) reported the Angular 4 → 19
source-code migration: `@angular/http` → `HttpClientModule`/`HttpClient`, RxJS 5 deep-path imports →
flat RxJS 7 `rxjs`, and `ng2-datepicker` → the `ngx-bootstrap` `BsDatepicker`. Every item is now
superseded — the `ngx-bootstrap` datepicker was itself replaced by the Angular Material datepicker and
Bootstrap (with `ngx-bootstrap` and the glyphicons) removed entirely in Phase 7, the `app.module.ts`
it edited was deleted in Phase 5, and strict TypeScript plus standalone components arrived with the
Angular 20 upgrade and Phases 1–6. Its unchecked testing items (date/exclusion/holiday selection,
recurring settings, timezone handling, recurrence patterns, collision detection, localization) were
subsequently covered by the Vitest suite (Phases 0–8) and the Playwright visual baseline, and its
optional follow-ups (moment → date-fns, code splitting / lazy loading, `OnPush`) are already recorded
in `docs/2026_MIGRATION_BACKLOG.md` (g). The stale report has been consolidated into this section and
deleted.

### v2.0 modernization planning documents (March 2026)

Three root-level documents tracked the v2.0 modernization from planning through partial completion:
`UPGRADE_CHANGELOG.md` (355 lines, a dependency analysis and six-phase migration plan written before
execution began, created in `1574db3`), `README_UPGRADE.md` (328 lines, a user-facing Docker and
upgrade guide with code examples and performance benchmarks, also `1574db3`), and
`UPGRADE_SUMMARY.md` (155 lines, a completion report for the Angular 20 + Node 24 step, created in
`54332f8`). All three are superseded: the six-phase plan was never followed (the actual path was the
Angular 19→20 upgrade then Material Phases 0–8), UPGRADE_SUMMARY's version table and remaining-issues
list are already captured in the Angular 20 subsection above (all four issues resolved by Phases 0–8),
and README_UPGRADE's Docker instructions duplicate `docker-compose.yml`. Their genuine residue (dead
Protractor/tslint configs, broken `npm run lint`, lazy loading, trimmed moment-timezone) is already in
`docs/2026_MIGRATION_BACKLOG.md` (e)/(f)/(g). **Fabricated claims NOT propagated:** README_UPGRADE
stated a production bundle of "~800 KB" (measured: **2.71 MB** under the Webpack builder, **2.37 MB**
since backlog-emptying Phase 5 switched to esbuild — §6), a Lighthouse score of 95 (no
Lighthouse measurement has ever been taken on this project), and "moment.js replaced with date-fns"
(`moment-timezone` ^0.5.47 remains a live dependency; `date-fns` was added alongside, not as a
replacement). The three stale documents have been consolidated into this section and deleted.

### v2.0 dependency upgrade and deprecation triage (March 2026)

Two further root-level documents came from the same March 2026 v2.0 snapshot — both added in
`1574db3` (2026-04-14), never modified since, internally dated 2026-03-13, which is why their version
tables stop at Angular 19 / TypeScript 5.7.2 and never reflect the April 2026 Angular 20 bump:
`DEPENDENCIES_UPGRADED.md` (434 lines, an executive summary of the dependency and Docker
modernization written *before* the work finished) and `DEPRECATION_ANALYSIS.md` (260 lines, a triage
of that month's `npm install` deprecation warnings). Neither had an inbound reference except a
self-reference at `DEPENDENCIES_UPGRADED.md:143`, and the summary's three outbound links
(`UPGRADE_CHANGELOG.md`, `README_UPGRADE.md`, `STATUS_REPORT.md`) were already dead. Their
irreplaceable content is the *starting* point of the modernization, recorded nowhere else:

| Package | v0.3.0 starting point | Current (`package.json`) |
|---|---|---|
| Angular | 4.4.6 (2017) | **^20.3.18** — via 19.0.0 |
| TypeScript | 2.4.0 | **~5.9.3** — via 5.7.2 |
| RxJS | 5.5.7 | **~7.8.1** |
| Webpack | 2.6.1 | **removed entirely** by backlog-emptying Phase 6. It had reached ^5.97.1 (5.105.0 resolved); the pipeline was broken — backlog (e) — and `scripts/build.mjs` replaced it. Webpack stayed *installed* (de-hoisted under the dead `@angular-devkit/build-angular`) only until task #52 (commit C) removed that package and pruned the entire Webpack subtree from `node_modules` — §7 deviation 11 (CLOSED) |
| Electron | 1.8.4 | **^34.0.0** (34.5.8 resolved) |
| zone.js | 0.8.20 | **~0.15.0** |
| Removed entirely rather than upgraded | core-js 2.5.3, node-sass, PhantomJS, `intl`, Protractor 5.3.0, TSLint 5.9.1, Karma 2.0.0, Jasmine 3.1.0, Bootstrap 3.3.7, ngx-bootstrap, `ng2-datepicker`, `ng2-slimscroll`, `@angular/http` | absent from `package.json`; the dead `protractor.conf.js` and `tslint.json` files are backlog (g) |

`package.json` pins `glob ^13.0.6` and `tar ^7.5.13` through npm `overrides` — the durable outcome of
that triage — because both are transitive dependencies of build tooling with no direct upgrade path.
Only two deprecations it named survive in today's tree, both unfixable upstream and **not to be
re-triaged**: `boolean@3.2.0` (`electron → @electron/get → global-agent`, optional dev) and
`rimraf@2.6.3` (`electron-builder → electron-winstaller → temp`, dev peer). `gauge`,
`are-we-there-yet`, `npmlog`, `@npmcli/move-file` and `inflight` have zero entries in
`package-lock.json` — they arrived via dependencies since removed — and the `rimraf@3.0.2` the triage
traced to `karma@6.4.4` no longer exists because Karma is gone. Its 11-row "Original Analysis" table
and "Action Plan" shell recipes are therefore not carried over: a host-side wipe-and-reinstall of
`node_modules` plus the lockfile is destructive and meaningless here, since lock regeneration runs
inside Docker via `docker compose run --rm duely-dev npm install --package-lock-only` plus one image
rebuild.

Three library substitutions were settled more concretely than the summary's option lists, and the
rationale lives nowhere else: `ical-generator` moved off the `MKBraun` GitHub fork to the official
npm package (`^7.2.0`, 7.2.0 resolved); `ng2-datepicker` was replaced by the Angular Material
datepicker (`MatDatepicker`, used in `appointment-form` and `recurring-settings`), not by
`ngx-datepicker` or a native `<input type="date">`; and `ng2-slimscroll` was dropped in favour of
native CSS scrolling rather than `perfect-scrollbar` or `overlay-scrollbars`.

**Fabricated or superseded claims NOT propagated.** The summary's "Impact Assessment" and
"Performance Benchmarks" numbers were invented, never measured:

| Claim | Measured reality |
|---|---|
| "Bundle size 2.5 MB → 800 KB (68% ↓)" | Production initial bundle is **2.71 MB** under the Webpack builder (`main.js` 2.65 MB raw / 402.94 kB transfer) and **2.37 MB** since backlog-emptying Phase 5 switched to esbuild (`main-*.js` 2.16 MB raw / 311.85 kB transfer) — §6 |
| "Lighthouse 65 → 95", "Accessibility 78 → 98" | No Lighthouse or accessibility audit has ever been run on this project; no config or tooling for either exists in the repo |
| Build 45s → 12s, prod build 90s → 35s, memory 256 → 128 MB, boot 2.1s → 0.5s, initial load 3.2s → 0.8s, "runtime 50% faster (Angular Ivy/Velte)" | **Never measured** — no benchmark artefact exists. "Velte" is not an Angular compiler name; Ivy is the renderer |
| "Moment.js 2.21.0 → removed, replaced with date-fns 4.1.0", and its "Moment.js ReDoS vulnerability eliminated" | **False.** `moment-timezone ^0.5.47` is live — 18 client source files carry a moment import, 13 of them literally `from 'moment-timezone'`. `date-fns ^4.1.0` is declared at `package.json:67` but imported by **zero** source files — backlog (g) |
| "Content Security Policy ready", "Subresource Integrity support", "regular `npm audit` integration", "automated dependency updates (Dependabot/Renovate ready)" | **All false.** `client/index.html` has no CSP meta tag or header and no `integrity=`/`crossorigin` attribute; and there is no CI at all — `.github/` does not exist, nor does `renovate.json` or `.renovaterc` |
| "Karma 2.0.0 → 6.4.4", "Jasmine 3.1.0 → 5.4.0", "Bootstrap 3.3.7 → 5.3.3" and "Bootstrap XSS vulnerabilities patched" | None was upgraded — all three were **removed**: Karma and Jasmine in the April 2026 Angular 20 step (replaced by Vitest 3.1 via `@angular/build:unit-test`), Bootstrap with ngx-bootstrap and the glyphicons in Phase 7 |
| "Angular 4.4.6 → 19.0.0", "TypeScript 2.4.0 → 5.7.2" | Superseded rather than false when written: the current values are `^20.3.18` and `~5.9.3` |
| "20+ CVEs eliminated" | **Unverifiable** — no historical `npm audit` artefact exists. The two CVE IDs cited are real identifiers (CVE-2018-1000136 Electron `remote`, CVE-2019-13174 Bootstrap XSS) and the risk genuinely is gone — Electron 34 ships no vulnerable `remote` module and `@electron/remote` is not a dependency, and Bootstrap is removed — but not by the path the doc describes |
| Triage: "`electron-builder` ^25.1.8 → ^26.8.1 applied"; "`rimraf@3.0.2` still present from `karma@6.4.4`" | Doc-vs-manifest drift — `package.json:91` declares `^26.0.12`, a caret range that admits 26.8.1 but is not the value stated; and the named rimraf source no longer exists |

Already covered elsewhere: the Sass `@import` deprecation the triage flagged is §7 item 4 (both
legacy sites were closed by backlog-emptying Phase 4 — `client/styles.scss:7` and
`client/app/creator/appointment-form/appointment-form.component.scss:1`), the Webpack pipeline was
closed by backlog-emptying Phase 6 (§6), and `npm run lint`, the dead Protractor/tslint configs and
the trimmed `moment-timezone` build remain backlog (f)/(g). The one genuinely new finding is
`date-fns` declared but never imported — backlog (g).
Both stale documents have been consolidated into this section and deleted.

### Test evaluation summary (March 2026)

The root-level `TEST_EVALUATION_SUMMARY.md` (283 lines, internally dated 2026-03-13, created in
`1574db3`) was a snapshot of the **pre-migration** test stack, written while the repo was still on
Angular 19.2.20 with Jasmine 5.4.0, Karma and `client/test.ts`. It catalogued why the suite did not
compile and proposed three fix options. Everything in it is superseded:

- **The stack it documents no longer exists.** `karma.conf.js` and `client/test.ts` are deleted —
  Karma/Jasmine were removed in the April 2026 Angular 20 step and `client/test.ts` in migration
  Phase 5. The runner is now **Vitest 3.1** via `@angular/build:unit-test` (§9 above; see
  `TESTING_GUIDE.md`), and Angular is 20.3.18, not 19.2.20.
- **The 28 TypeScript compilation errors it lists were all resolved by Phases 0–8.** Its seven
  categories — undefined-property access (×12), a moment.js call signature (×1), legacy
  `@angular/http` in `legal.component.spec.ts` (×4), the `date-holidays` constructor (×1),
  `ical-generator` type mismatches (×5), the removed `async` test utility (×2, → `waitForAsync`) and
  validator return types (×2) — are exactly the pre-existing strict-null / strict-template issues that
  TypeScript 5.9 surfaced and that the migration drove to the current 0-error tsc baseline (§6).
- **Its test-file status table (17 spec files, 8 working / 9 needing fixes) is a historical
  baseline.** The suite is now 16 spec files at 24 failed / 47 passed (§6); the 24 are loud,
  classified and deferred, not compile blockers.
- **Its `playwright.config.ts` "ready to use" claim is false today.** That config is still broken and
  is repaired in backlog-emptying Phase 9 — but the reason changed. Its `webServer` command
  `npm run serve` used to run `webpack serve` and died with Phase 5; **Phase 6 repointed `serve` at
  plain `ng serve`, so the command itself now works** (the script name was deliberately preserved for
  exactly this consumer). What remains wrong is its `webServer.url`, `http://localhost:8000`, while
  `ng serve` binds **4200** — a pre-existing mismatch Phase 6 left alone. The working visual tool is
  the Playwright-in-Docker capture recipe in `TESTING_GUIDE.md`. The `test:e2e*` npm scripts still
  exist but route through that broken config.
- **Its moment.js → date-fns recommendation (fix-priority Phase 3 / "Option A") was not taken.**
  `moment-timezone` ^0.5.47 remains live and `date-fns` is declared but never imported — backlog (g)
  and §9's dependency subsection.

Not propagated: its "Option B — disable strict mode" (strict mode is a standing invariant), its 70 %
coverage goal (no coverage target has ever been set on this project), and its Docker run instructions,
which cite the one-shot `duely-build` service rather than the `duely-dev` service every gate uses. The
stale snapshot has been consolidated into this section and deleted.

### Closure — the migration backlog is retired (backlog-emptying Phase 13)

The consolidation subsections above repeatedly cite `docs/2026_MIGRATION_BACKLOG.md` items (a)/(e)/(f)/(g)
as the home of the migration's genuine residue. **That file no longer exists.** Backlog-emptying
**Phase 13** (task #38, the terminal commit of the plan) retired it:

- Every **open** or **closed-by-decision** item was transcribed into **`docs/2026_KNOWN_LIMITATIONS.md`**,
  a new committed document with ten sections **(a)–(j)**, each entry stated as
  **WHAT · WHY-accepted · RISK · WHAT-WOULD-CHANGE-THE-DECISION**. The former backlog letters map onto
  it: (a) deferred test-and-date work, (b) accepted risks (the six CommonJS bailouts, the 44 icon
  warnings, the four env files, the Express catch-all), (c) declined modernisation, (d) upstream-owned
  deprecations (`moment`, `boolean@3.2.0`, `rimraf`, `@angular/animations`, `engines.node`),
  (e) the dependency-upgrade roadmap pointer, (f) Electron storage, (g) rejected alternatives, plus
  (h) Phase 11 deferrals, (i) the D20 UI defects and (j) the i18n carry-forward.
- Every genuinely **FIXED** item now lives only in the commit history and in this document's §6/§7 — it
  was **not** carried into KNOWN_LIMITATIONS, which records only what was deliberately *not* fixed.
- `docs/2026_MIGRATION_BACKLOG.md` was removed with **`git rm`**, and every live inbound reference was
  repointed at `docs/2026_KNOWN_LIMITATIONS.md`: `docs/2026_MIGRATION_PLAN.md` (6 sites),
  `docs/2026_MATERIAL_MIGRATION.md` (2 sites), `TESTING_GUIDE.md`, `TODO_UPGRADES.md` and the
  git-excluded `docs/2026_MIGRATION_STATE.md`. Historical references inside these §9 consolidation
  subsections — which describe what a *deleted* March-2026 snapshot said about the *then-current*
  backlog — are deliberately **left as-is**: they are prose history, not live pointers.

**Both plans are now complete.** The Bootstrap-to-Material migration (Phases 0–8) finished at
`87232ae`; the 14-phase backlog-emptying plan (Phases 0–13, tasks #25–#38) that this section's
consolidations fed into is finished by the Phase 13 closure commit. Phase 13 changed **no** source
file — only documentation and the backlog deletion — and its full verification battery (all gates
green, the reduced 10-screenshot visual pass, the 73-spec / 24-failure baseline unchanged) is recorded
in §6's "Final gate results … after Phase 13". The post-migration developer reference is this document;
the deferred/accepted work is `docs/2026_KNOWN_LIMITATIONS.md`; the session handoff and the durable
task-board mirror are the two git-excluded trackers (`docs/2026_MIGRATION_STATE.md` §11 row 13 and
`docs/2026_MIGRATION_TASKBOARD.md` §42).
