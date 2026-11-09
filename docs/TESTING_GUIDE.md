# Duely — Testing Guide

**Stack:** Vitest through Angular's `@angular/build:unit-test` builder · Playwright for visual/E2E
checks · Angular 20 · TypeScript 5.9 · Docker `node:lts-slim` (floating runtime, not pinned Node 24).
`package.json` / `package-lock.json` are authoritative for declared / resolved versions.
**Documentation consolidated:** 2026-11-09, against source at `f527f26` and existing migration records.

The former Karma/Jasmine stack and `client/test.ts` are gone. This guide preserves the latest
recorded migration-closure verification snapshot (§4), not a new test/build/browser run. The
separate Material migration reference has been retired; completed history remains in Git.

---

## 1. What the unit-test stack actually is

Duely's unit tests run on **Vitest** (`package.json` declares `"vitest": "^3.1.0"`; the recorded
resolved version is 3.2.4), driven by the official Angular builder. The `test` target in
`angular.json` is:

```jsonc
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "buildTarget": "duely:build:development",
    "tsConfig": "client/tsconfig.spec.json",
    "runner": "vitest",
    "setupFiles": ["vitest.setup.ts"]
  }
}
```

`runner: vitest` is what selects Vitest; `buildTarget` compiles the specs against the **development**
build configuration.

### Karma, `karma.conf.js` and `client/test.ts` are GONE — do not go looking for them

There is **no Karma, no Jasmine, no `karma.conf.js` and no `client/test.ts`** anywhere in this repo:

- `karma.conf.js` — deleted. `ls karma.conf.js` → *No such file or directory*.
- `client/test.ts` — deleted in migration Phase 5 (it was the old Karma webpack entry whose only
  functional line was `import './app/app.module';`).
- `package.json` contains **zero** `karma` or `jasmine` references (`grep -niE 'karma|jasmine'
  package.json` → nothing). Karma 6.4.4 and Jasmine were removed in the April 2026 Angular 20 step
  and replaced by Vitest.

If a doc, a blog post or an old memory tells you to edit `karma.conf.js` or add a launcher to it,
that guidance is stale. The runner is configured entirely through `angular.json`'s `test` target and
`client/tsconfig.spec.json`.

### Globals — no imports needed

`client/tsconfig.spec.json` lines 8–10 set:

```jsonc
"types": [
  "vitest/globals"
]
```

so `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi` and the rest are **globals** in every
`*.spec.ts`. You do **not** import them from `vitest`. (`vi` — the Vitest mock/spy object — is a
global too; you will see `vi.spyOn(...)`, `vi.fn()` used bare.)

---

## 2. The Docker-only rule (mandatory)

**Every** `npm` / `ng` / `tsc` / test command runs inside Docker, from the repo root, as:

```bash
docker compose run --rm duely-dev <cmd>
```

Dependencies are installed in the `duely-dev` image and live in an anonymous `/app/node_modules`
volume. `Dockerfile` uses the floating `node:lts-slim` tag. Host execution can fail or silently use
another toolchain; there is no supported host verification path.

- If the Docker daemon is unavailable, **STOP** — do not fall back to the host.
- `docker compose run --rm` discards the container's `/tmp` on exit, but the repo is bind-mounted
  (`.:/app`), so files written under the repo survive. Files under `.git/` are invisible to
  `git status --porcelain`; the failing-name baseline (§7) relies on this.
- Re-check `docker ps` at session end. Stop only containers created for your verification, using
  `docker stop <id>` (not `docker compose down`); do not stop unrelated containers.

The npm scripts (from `package.json`) and their Docker form:

| Script | Underlying command | Docker invocation |
|---|---|---|
| `npm test` | `ng test --watch=false` | `docker compose run --rm duely-dev npm test` |
| `npm run test:watch` | `ng test` (watch) | `docker compose run --rm duely-dev npm run test:watch` |
| `npm run test:coverage` | `ng test --coverage --watch=false` | `docker compose run --rm duely-dev npm run test:coverage` |
| `npm run test:e2e` | `playwright test` | `docker compose run --rm duely-dev npx playwright test` — browsers pre-installed, see §8 |

---

## 3. Test layout

- **Location:** `client/app/**/*.spec.ts` (17 spec files since Phase 12 added `i18n-parity.spec.ts`;
  16 at `ced1dc8`).
- **Included by:** `client/tsconfig.spec.json` (`"include": ["**/*.spec.ts", "**/*.d.ts"]`).
- **Runner:** Vitest, via the builder above. Vitest reports file/suite/test in the form
  `FAIL  |duely| <compiled-spec-file> > <suite> > <test>`.

### Writing a spec (standalone-component conventions)

All 10 components are `standalone: true`; there is no NgModule left in `client/`. This shapes the
TestBed setup:

- A standalone component goes into TestBed **`imports`**, never `declarations`. When you flip a
  component to standalone, grep **every** `*.spec.ts` for its name — other specs may declare it too.
- Add `provideNativeDateAdapter()` to `providers` for any spec that renders a `mat-datepicker`.
- `TranslateModule.forRoot()` — not the bare `TranslateModule` — is required wherever a component
  injects `TranslateService` / `TranslateStore`.
- Animations are not needed in specs: Material templates render under `fixture.detectChanges()`
  without `provideAnimations()`.
- `provideDuelyIcons()` is deliberately **not** added to spec TestBeds; the resulting
  `Error retrieving icon duely:*` stderr output is cosmetic (see §5) — every affected spec still runs.

### `vi.spyOn` usage

`vi.spyOn` is used in **8** of the 16 spec files (verified with
`grep -rl "vi.spyOn" client --include='*.spec.ts' | wc -l` → `8`):

```
client/app/app.component.spec.ts
client/app/creator/appointments.service.spec.ts
client/app/creator/creator.component.spec.ts
client/app/creator/appointment-form/alarm-settings/alarm-settings.component.spec.ts
client/app/creator/appointment-form/recurring-settings/recurring-settings.component.spec.ts
client/app/storage/storage.service.spec.ts
client/app/storage/web-storage.service.spec.ts
client/app/storage/electron-storage.service.spec.ts
```

Note the `saveAs` failures (§6): `file-saver@2.0.5` is CJS-only, and esbuild's synthesized module
namespace is non-configurable, so `vi.spyOn` **cannot** redefine `saveAs` — that is the root cause of
three of the deferred failures, not a test-authoring mistake.

### The i18n key-parity spec (Phase 12, task #37)

`client/app/i18n-parity.spec.ts` is a **data-contract test**, not a component test: it asserts that
`client/assets/i18n/en.json` and `client/assets/i18n/de.json` define the **identical set of
translation keys** (extracted recursively as dot-separated paths, so future nesting is handled; both
files are flat with **127 keys** today). On failure the assertion message lists the full **symmetric
difference** — every key present in only one locale — so drift is diagnosed directly from the test
output. It exists because a key missing from one locale silently renders as its raw key text at
runtime, and no build, lint or other spec gate catches that (backlog §2(g)-7, closed by this spec).
Two authoring notes:

- It **imports the JSON files directly** (`resolveJsonModule`) instead of using `node:fs`: the
  `@angular/build:unit-test` builder bundles specs through esbuild with the **browser** platform,
  where `node:fs` fails to resolve ("Could not resolve \"node:fs\"").
- Its second `it()` block pins both key sets to be **non-empty**, so an accidentally truncated or
  emptied locale file cannot pass the parity assertion trivially at 0/0.

The spec adds **2 passing tests** (suite `I18nKeyParity`) and moves the baseline total from
71 → **73**; the 24-failure partition is untouched (verified: failing-name md5 unchanged). A parity
test deliberately cannot detect orphaned keys, wording problems or missing runtime translation
rendering — those are symmetric across locales (backlog §3).

---

## 4. The gate set

Run every execution gate in Docker. Source/spec and server/Electron type-checks are separate:
Node-side bundling does not substitute for TypeScript checking.

| Gate | Command | Recorded baseline |
|---|---|---|
| **G1** — app type-check | `docker compose run --rm duely-dev npx tsc --noEmit -p client/tsconfig.app.json` | **0 errors**, exit 0 |
| **G1b** — server type-check | `docker compose run --rm duely-dev npx tsc --noEmit -p server/tsconfig.json` | **0 errors**, exit 0 |
| **G1c** — Electron type-check | `docker compose run --rm duely-dev npx tsc --noEmit -p electron/tsconfig.json` | **0 errors**, exit 0 |
| **G2** — spec type-check | `docker compose run --rm duely-dev npx tsc --noEmit -p client/tsconfig.spec.json` | **0 errors**, exit 0 |
| **G3** — strict-null invariant | count `error (TS2322\|TS2531)` matches in G1/G2 output | literally **0** on both |
| Dev probe build | `docker compose run --rm duely-dev npx ng build --configuration development --output-path /tmp/probe-dist-dev` | exit 0 |
| **G4** — unit tests | `docker compose run --rm duely-dev npm test` | **24 failed / 49 passed (73)**, **5 failed / 12 passed files**, **44** icon messages, **0** NG8xxx/NG0xxx; failing-name diff (§7) empty |
| **G5** — production probe | `docker compose run --rm duely-dev npx ng build --configuration production --output-path /tmp/probe-dist` | exit 0, **0** budget warnings |
| Lint | `docker compose run --rm duely-dev npm run lint` | exit 0, **0 errors / 8 warnings** |
| E2E | `docker compose run --rm duely-dev npx playwright test` | **16 passed / 0 failed**, with coverage gaps below |

Probe builds must override `outputPath` to `/tmp/probe-dist` or `/tmp/probe-dist-dev` so they do not
touch real `dist/`. A deliberate distribution build uses
`docker compose run --rm duely-dev npm run build:prod`; it writes both output trees (INSTALL.md).
Inspect `git status --porcelain` and `docker ps` afterward, preserving existing user work and
stopping only containers created for the verification. No commit is implied by running gates.

### Latest recorded closure snapshot (2026-11-09)

Transferred from the completed Material migration reference's Phase 13 closure record (task #38;
closure commit `9ba8d62`). **These are existing results, not rerun during this consolidation.**
App/server/Electron/spec type-checks and the dev/production builds exited 0. Lint reported 0 errors /
8 warnings, Playwright reported 16 passed, and locale keys were identical at **127 EN / 127 DE**.
Units remained **24 failed / 49 passed**, not fully green; 24 failing names matched the baseline,
md5 `172d78996b50c84e38211b529d76ab0b`. Strict-null TS2322/TS2531 and NG8xxx/NG0xxx counts were 0.

The production distribution build recorded these initial assets:

| Asset | Raw bytes |
|---|---|
| `chunk-JZJ2L7GC.js` | 1,619,140 |
| `main-UADZYEJY.js` | 279,047 |
| `chunk-QBUSXI3J.js` | 190,283 |
| `chunk-MY5TLO44.js` | 157,016 |
| `polyfills-5CFQRCPP.js` | 34,585 |
| `styles-DRBU42VC.css` | 20,951 |
| `chunk-Z7MHJMDT.js` | 11,150 |
| **Initial total** | **2,312,172 (2.31 MB), 371.55 kB estimated transfer** |

`index.html` was 10,840 B. Budgets were **2.55mb warning / 5mb error** for initial raw size and
**6kb / 10kb** for component styles, with 0 budget warnings. Compare new measurements against this
snapshot, not superseded Webpack figures. Three secondary routes are lazy, but the holiday catalogue
remains in the eager graph (Known Limitations (h.4)); a smaller app-entry file is not a comparable
reduction of the whole initial payload. CommonJS warnings are identified by dependency, not a
stable count (Known Limitations (b.3)).

The user-approved reduced final visual pass captured **10 full-page PNGs** (five routes × two themes
at **1440×900**) under `.git/duely-p13-shots/`. Every route had 0 console/page errors; Creator had
one dual-binding deprecation warning. Body background remained `rgb(221, 221, 221)` in both themes,
confirming the accepted hardcoded-shell defect. This was not a full 72-state interaction check or
an Electron launch. Coverage gaps are recorded in Known Limitations (k.1)–(k.2), with desktop runtime
separately in (f).

---

## 5. The baseline contract (must not move)

Until the deferred failures are addressed in a future test-and-date phase, `npm test` must report
**exactly**:

| Metric | Value |
|---|---|
| Tests | **24 failed / 49 passed (73 executing)** |
| Test files | **5 failed / 12 passed (17)** |
| `Error retrieving icon duely:*` messages | **44** |
| Compile-time `NG8xxx` errors | **0** |
| Runtime `NG0xxx` errors | **0** |
| G1 / G2 tsc | **0 / 0 errors** |
| G3 `TS2322\|TS2531` | **0** |
| i18n key parity | **127 EN / 127 DE** |

The **44 icon messages** are cosmetic: `provideDuelyIcons()` runs from `app.config.ts`, which spec
TestBeds do not load, so each `<mat-icon svgIcon="duely:...">` logs a lookup warning per render.
Every affected spec still passes. **D19 supersedes decision 12:** this is test-harness-only, not
user-facing (Known Limitations (b.2)); browser registration uses bundled literal SVGs.

The deferred failing-name partition must **neither improve nor regress** without the user-initiated
test/date or coverage phase. Do not silently fix, drop, skip or rebaseline a deferred test. If the
partition changes unexpectedly, stop and investigate while preserving unrelated working-tree edits.

---

## 6. The 24 deferred failures — partition

All 24 are loud, classified and deferred. Phase 6's `TranslateStore` repair unmasked the 19
appointments-service failures. Later commit `be16352` fixed the null-repeating crash, exposing
residual assertions in two of the same tests; their names and the partition stayed unchanged.
Known Limitations (a.1)–(a.3), (a.6)–(a.7) are the current diagnosis/disposition.

| Group | Count | Current failure |
|---|---|---|
| `saveAs` | 3 | `web-storage.service.spec` ×2, `electron-storage.service.spec` ×1; non-configurable CJS namespace |
| CollisionDetector | 1 | Stale holiday expectation plus index-0 assertion loop |
| `saveText`, option C | 1 | `creator.component.spec` stale valid-array expectation; removal deferred to coverage review |
| ICS-string / simple-event expectations | 2 | Missing expected UTC `Z` suffix; event timezone `null` instead of `Europe/Berlin`, **not** an unresolved null crash |
| `ical-generator toJSON()` drift | 10 | Start/end ISO strings rather than Date objects; event timezone `null`; separate production collision-boundary defect in (a.7) |
| Ordinal-weekday `byDay` | 7 | Source passes rejected `'-3WE'`-style codes; inverse calculation also passes day-of-month as month |

**Per-file totals (the 5 failed files):**

| File | Failures |
|---|---|
| `CollisionDetector.spec` | **1** |
| `appointments.service.spec` | **19** (toJSON drift 10 + ordinal-weekday 7 + residual ICS/timezone expectations 2) |
| `creator.component.spec` | **1** |
| `electron-storage.service.spec` | **1** |
| `web-storage.service.spec` | **2** |
| **Total** | **24** |

### Why they are still red

The failures are **deferred by user decision** to a future test-and-date phase or, for the positive
`saveText` test, a user-initiated coverage review. Do not fix, drop or skip them under unrelated work.
`docs/2026_KNOWN_LIMITATIONS.md` (a) holds the full diagnosis and disposition, including production
recurrence/collision defects that test-only expectation changes would not repair.

---

## 7. The reproducible failing-name capture (and the trap that broke the naive version)

The strongest form of the baseline contract is a sorted list of the failing test **names**, diffed
against the saved baseline at **`.git/duely-failing-names-baseline.txt`**. It is durable via the
`.:/app` bind mount but **not committed** or portable to another checkout. The recorded md5 is
`172d78996b50c84e38211b529d76ab0b`; preserve an existing baseline instead of overwriting it.

### Initial capture (only when no baseline exists)

Bare `npm test` reproduces the recorded baseline in the Docker image without a manual environment
variable. Node 26's `localStorage` getter previously broke storage specs; **`vitest.setup.ts`**,
registered under `setupFiles` in `angular.json`, restores jsdom's storage globals before specs run
(§9). This is not a guarantee for arbitrary future Node majors. Do not pass
`-e NODE_OPTIONS="--localstorage-file=…"`: it would mask a broken or missing setup file.

After confirming that no baseline file exists, capture it once:

```bash
(
  set -C
  docker compose run --rm duely-dev npm test 2>&1 \
    | grep -aE '^[[:space:]]*FAIL[[:space:]]' \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
    | sort > .git/duely-failing-names-baseline.txt
)
```

`set -C` prevents overwriting an existing baseline. Check the full test result, the **24-line**
count and recorded md5 before accepting the file; an empty/truncated capture is not a valid baseline.
`grep -a` preserves textual extraction if captured output contains NUL bytes.

### The diff command (must be empty)

```bash
docker compose run --rm duely-dev npm test 2>&1 \
  | grep -aE '^[[:space:]]*FAIL[[:space:]]' \
  | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
  | sort > .git/duely-failing-names.txt
diff .git/duely-failing-names-baseline.txt .git/duely-failing-names.txt   # MUST be empty
```

If the diff is **not** empty, stop and report the changed names. Diagnose it without resetting the
working tree or overwriting the baseline; preserve unrelated edits. Review the full unit output
as well, because a names-only pipeline does not verify successful compilation or all counts.

### Why the naive `grep -E '^\s*(×|✗|FAIL)'` pattern does NOT work

This is a genuine trap worth documenting:

- The Vitest reporter prints **every failure twice** — once as a `×` **summary** line and once as a
  stable `FAIL  |duely| <file> > <suite> > <test>` **detail** line.
- The `×` summary line carries a **volatile millisecond timing suffix** (`38ms`, `31ms`, …) that
  changes on every run.
- So the naive pattern matches **48 lines** (both the 24 `×` summary lines *and* the 24 `FAIL` detail
  lines), and because of the timings it is **non-reproducible** — two identical runs produce different
  output and the diff is never empty.

The working command matches only `^[[:space:]]*FAIL[[:space:]]`, i.e. **only the 24 stable detail
lines**, which are byte-identical run to run. Reproducibility was verified: two consecutive fresh
`docker compose run --rm … npm test` captures produced byte-identical 24-line output (`diff` empty).

The 24 captured names (sorted) are exactly the failures partitioned in §6 — 1 CollisionDetector, 19
AppointmentsService, 1 CreatorComponent, 1 ElectronStorageService, 2 WebStorageService.

---

## 8. Playwright-in-Docker e2e suite and screenshot capture

This is the mechanism behind the migration's visual pass and the working path for browser-based
testing **today**. Chromium and its OS-level dependencies are **baked into the `duely-dev` image**
at build time (Phase 10); no manual install step is required.

### `playwright.config.ts` — REPAIRED in Phase 9

`playwright.config.ts` now defines **two projects** per locked decision 18:

| Project | `baseURL` | `webServer.command` | Port |
|---|---|---|---|
| `dev` | `http://localhost:4200` | `npm run serve` (= `ng serve`) | 4200 |
| `server` | `http://localhost:8000` | `npm run build:prod && npm run start:server` | 8000 |

Both servers start inside the same container as Playwright, so `localhost` resolves correctly.
The `server` project's `webServer.timeout` is **300 s** to cover the production build step.
`testMatch` is explicit (`**/*.spec.ts`) so only the Playwright-convention spec is collected.

**Historical defect (pre-Phase 9):** the old config pointed `baseURL` and `webServer.url` at
`:8000` while `npm run serve` published `:4200` — the port mismatch meant Playwright's readiness
wait never resolved, so `npm run test:e2e` hung indefinitely.

> **Express catch-all limitation.** The `server` project cannot assert on HTTP 404 status codes
> because `server/app.ts`'s unconditional catch-all returns 200 + `index.html` for every unmatched
> path. Client-side routing (Angular's `AutoRedirectGuard` / wildcard) still works — the limitation
> is HTTP-level only. The accepted disposition is in Known Limitations (b.5).

### How the container and ports work

- The `duely-dev` service (`docker-compose.yml`) is `node:lts-slim` (a **floating tag** — it
  resolved to Node 26.13.0/trixie as of the task-#60 rebuild; it silently crossed the Node 24 → 26
  major when `node:lts` moved to Lithium), bind-mounts `.:/app`, keeps
  `node_modules` as an anonymous volume, and **publishes ports `8000`, `4200` and `49152`**.
- **Port 4200** = the Angular dev server (`ng serve`) — this is what the capture scripts shoot
  (`BASE_URL = 'http://localhost:4200'`, resolved *inside* the container).
  Note: the default compose command (`npm run serve` = `ng serve`) binds to `localhost` inside the
  container, so published port 4200 is **not reachable from the Docker host** without an explicit
  `--host 0.0.0.0` override (the capture recipe below passes it). This is not a regression — at the
  parent the container ran `webpack --watch` and served nothing on 4200, so host access never worked.
  The in-container capture workflow is unaffected and in fact improved: the dev container now
  auto-serves on 4200.
- **Port 8000** = the Express static server (`server/app.ts`,
  `const port: number = Number(process.env.PORT ?? 8000)`, serving `dist/server/static/browser`) —
  the built-app path targeted by the second Playwright project.
- The `duely-dev` image ships Playwright (`@playwright/test ^1.64.1`; resolved to 1.64.1 by the
  lockfile, Chromium revision **v1248** = Chrome for Testing 156.0.8078.4) **with Chromium and all
  OS-level dependencies baked in at build time** (Dockerfile
  `development` stage). No manual browser installation step is needed.

### The recipe

**Running the full e2e suite** (16 tests, both projects):

```bash
# Single command — browsers are pre-installed in the image, both web servers
# are started automatically by playwright.config.ts webServer entries.
docker compose run --rm duely-dev npx playwright test
```

No `-T` flag is required when invoking from a standard interactive terminal. The `-T`
(no pseudo-TTY) flag is only needed when the calling environment lacks a TTY — for example,
piping stdout, running from certain CI harnesses, or invoking through a subprocess without
`stdin` attached. If you see `the input device is not a TTY`, add `-T`.

**Screenshot capture workflow** (for visual regression passes):

```bash
# 1. Start a long-running dev server on 4200, named so it can be exec'd into.
docker compose run --rm --name duely-serve -d duely-dev \
  npx ng serve --host 0.0.0.0 --port 4200

# 2. Run the capture script inside the same container (it targets localhost:4200).
#    --output-dir is MANDATORY; omitting it aborts to protect the reference baseline.
docker exec -w /app duely-serve node e2e/capture-after-shots.cjs \
  --output-dir docs/migration-shots/phase9-after

# 3. Stop the container when done (never `docker compose down`).
docker stop duely-serve
```

> **Historical note (pre-Phase 10):** Steps 2 and 3 of the old recipe required manual
> `npx playwright install-deps chromium` and `npx playwright install chromium --only-shell`
> inside the running container. These are now **obsolete** — the Dockerfile's `development`
> stage provisions Chromium and all OS-level libraries (libnss3, libatk, libgbm, libasound2,
> libatspi2.0, …) at build time, pinned to the exact `@playwright/test` version from
> `package-lock.json`. A build-time assertion hard-fails if the driver and browser versions
> diverge.

Because `.:/app` is bind-mounted, the PNGs land directly on the host under
`docs/migration-shots/` (git-excluded), no copy step needed.

### The capture matrix

`e2e/capture-after-shots.cjs` captures the **after** baseline: **6 route states × 2 themes × 2
accents × 3 viewports = 72 PNGs** (it exits non-zero if it captures fewer than 72).

**`--output-dir` is mandatory** (CLI flag or `CAPTURE_OUTPUT_DIR` env var). The script refuses to
run without it and refuses to target the reference baseline directory
(`docs/migration-shots/after`). This prevents accidental overwrite of the stored 72-PNG set.

- **Viewports:** widths **375 / 800 / 1440**, height **900**. Matching Electron's 800px width does
  **not** test its actual 800×600 window or expanded-form density (Known Limitations (k.1)).
- **Themes:** `light`, `dark` (`settings.themeMode`) for seeded settings states.
- **Accents:** `red`, `blue` (`settings.color`).
- **Context:** a fresh `browserContext` per route-state × width, with `locale: 'en-US'` and
  `timezoneId: 'Europe/Berlin'`.
- **The six route states** (there is no `/creator` route — the creator *is* `/` with settings loaded):

| # | Route state | Notes |
|---|---|---|
| 1 | `/` with **empty** localStorage | `AutoRedirectGuard` redirects to `/settings` |
| 2 | `/settings` | timezone, language, location, colour scheme, calendar metadata |
| 3 | `/` with settings loaded | the creator: full appointment form |
| 4 | `/about` | licence and architecture |
| 5 | `/legal` | translated notice; cold-load/language-change rendering repaired in Phase 10.3 |
| 6 | unknown path (`/nope`) | wildcard redirect to `/404` |

For states 2–6 the script seeds `localStorage['settings']` (colour, themeMode, `Europe/Berlin`,
`en`, calendar metadata) before navigating; state 1 uses **empty** localStorage so the redirect
renders default Settings. Its filenames vary theme/accent, but that branch never applies them:
those are duplicate default-state captures, not independent dark/blue coverage. A seeded Settings
visit is not necessarily identical to the empty-storage redirect.

Static images and 16 passing E2E executions do not prove the full functional matrix. The timezone
test conditionally skips a nonexistent selector, the collision test is a logging placeholder, the
ICS test does not read file contents, and daily recurrence checks only selector/panel state.
Known Limitations (k.2) retains these test-coverage obligations without changing the suite.

**Readiness waits (do not skip):** before each shot the script waits for `document.fonts.ready`, for
every `<img>` to `decode()`, then an 800 ms settle. **Never** use `waitForLoadState('networkidle')` —
the dev server's HMR websocket keeps the connection open and hangs the wait indefinitely.

### Where the images land, and how they are diffed

- **After baseline:** `docs/migration-shots/after/` — **72 PNGs** (`<route>-<width>-<theme>-<accent>.png`).
- **Before baseline:** `docs/migration-shots/before/` — **18 PNGs** (6 route states × 3 widths, single
  theme/accent). The before-shots were captured with a companion `e2e/capture-before-shots.cjs`; that
  script was **git-excluded and removed after the migration session**, so only
  `e2e/capture-after-shots.cjs` survives on disk today. The before baseline PNGs remain.
- **Diffing:** full-page PNGs are compared before-vs-after per route state × width. Expect a **large,
  legitimate** visual delta on *every* route: the navbar overlay fix (`54a4ffb`, which took the nav
  out of `position: fixed` and rendered it in flow above `main`) alone changes every page, on top of
  the whole Bootstrap→Material restyle. This delta is the point of the migration, **not** a
  regression — do not file it as one.

### ⚠️ Route `03-creator` date hazard

The creator route (`/` with settings loaded) renders **today's date** in the appointment form's
date inputs. Any visual diff against a stored baseline will therefore produce **12 permanent false
positives** (1 route × 2 themes × 2 accents × 3 widths) that change daily and cannot be resolved
by fixing code.

**Mitigation for future visual passes:** use same-session before/after isolation (capture both
within minutes of each other so the date is identical), or freeze/mock the date in the test
context (`page.clock.install()` in Playwright 1.45+), or mask the date-input region before diffing.

---

## 9. Troubleshooting

- **`npm test` on the host does nothing / fails.** Expected — host `node_modules` is empty. Use the
  Docker form (§2).
- **Failing-name diff is non-empty.** Stop and investigate/report; preserve the baseline and unrelated
  working-tree edits (§7).
- **`× … 38ms` lines appear in your capture.** You used the naive pattern; switch to the
  `^[[:space:]]*FAIL[[:space:]]` command (§7).
- **44 `Error retrieving icon duely:*` lines.** Cosmetic and expected (§5). Do not "fix" by adding
  `provideDuelyIcons()` to TestBeds.
- **`npm run test:e2e` cannot start / hangs.** Verify the port alignment: `playwright.config.ts`
  `webServer[0].url` must match the dev server's actual port (4200), and `webServer[1].url` must
  match Express (8000). If a port is occupied, identify its owner rather than killing an unrelated
  process; stop only the verification server you created.
- **Playwright: "browser not found".** Should not occur — Chromium is baked into the `duely-dev`
  image at build time. If you see this, the image is stale: run `docker compose build duely-dev`
  to re-provision. Verify with `docker compose run --rm duely-dev npx playwright --version`
  (expect 1.64.1) and `docker compose run --rm duely-dev ls /root/.cache/ms-playwright/`.
- **`npm test` suddenly fails ~37 extra specs with `TypeError: Cannot read properties of undefined
  (reading 'getItem')` in `StorageService.loadSettings`.** **FIXED 2026-11-01 — this should no longer
  happen.** Cause, for the record: Node ≥ 26 defines an experimental `localStorage` getter on
  `globalThis` that returns `undefined` unless `--localstorage-file` is passed, and Vitest 3.2.4's
  jsdom `populateGlobal` copies a window key only when it is absent from the Node global or
  allowlisted (`LIVING_KEYS`/`OTHER_KEYS`); `localStorage` and `sessionStorage` are neither, so
  jsdom's working implementations were never installed. It was a Node-major artefact of the floating
  `node:lts-slim` base, never a suite regression. The permanent repair is **`vitest.setup.ts`**,
  registered under `setupFiles` in the `test` target of `angular.json`, which reads the real jsdom
  window Vitest already created (`globalThis.jsdom.window` — *not* `window`, which `populateGlobal`
  aliases back onto `globalThis`) and re-installs both storage globals with a
  `populateGlobal`-shaped accessor. If the symptom returns, check in this order: (1) the `setupFiles`
  entry still points at `vitest.setup.ts`; (2) `vitest.setup.ts` still exists at the repo root;
  (3) Vitest is still 3.2.4 and still exposes `globalThis.jsdom`. Do **not** reach for
  `-e NODE_OPTIONS="--localstorage-file=…"` — that workaround was rejected because it breaks the
  project's zero-manual-steps property.
- **~32 lines of `ExperimentalWarning: localStorage is not available because --localstorage-file was
  not provided` on stderr, in one block right after the `RUN v3.2.4 /app` banner.** Expected and
  harmless. `vitest.setup.ts` reads Node's broken getter once per forked worker to detect the
  shadowing, and Node prints the warning each time. It is a warning, not an error: it does not affect
  the 24F/49P counts, the 44 icon messages or the failing-name diff, and it does **not** mean the
  flag is required.
- **A container is still listed by `docker ps` after a run.** `docker stop <id>` it; never
  `docker compose down`.

---

## 10. Related documents

- [Known Limitations](2026_KNOWN_LIMITATIONS.md) — current diagnosis/disposition of deferred test/date
  work (a), harness-only icon warnings (b.2), other accepted/deferred work (b)–(j), and verification gaps (k).
- [README](../README.md) — current standalone, layout/theme/icon and Settings development guidance.
- [Installation](../INSTALL.md) — Docker setup, build-output/runtime paths and licence artefact distribution.
- `docs/2026_MIGRATION_STATE.md` / `docs/2026_MIGRATION_TASKBOARD.md` — git-excluded historical
  session trackers. Older classifications and snapshots there may be superseded by this guide and
  Known Limitations. Git history retains completed migration and retired documentation records.
