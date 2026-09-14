# Duely — Testing Guide

**Stack:** Vitest 3.1 unit tests run through the Angular `@angular/build:unit-test` builder ·
Playwright for the visual/E2E pass · Angular 20.3.18 · TypeScript 5.9.3 · Node 24.
**Last rewritten:** 2026-09-14, at commit `ced1dc8`, for the post-migration stack.

> This guide was rewritten from scratch. The previous version documented a stack that **no longer
> exists** (Jasmine 5.4.0 + Karma 6.4.4 + `karma.conf.js` + `client/test.ts` on Angular 19). Every
> claim below is verified against the repository at `ced1dc8`.

---

## 1. What the unit-test stack actually is

Duely's unit tests run on **Vitest 3.1** (`package.json` declares `"vitest": "^3.1.0"`), driven by
the official Angular builder. The `test` target in `angular.json` (lines 90–97) is:

```jsonc
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "buildTarget": "duely:build:development",
    "tsConfig": "client/tsconfig.spec.json",
    "runner": "vitest"
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

The host `node_modules` is **empty** — dependencies live in an anonymous volume baked into the
`duely-dev` image (`node:24-bookworm`). Running `npm test`, `ng build` or `tsc` on the host will fail
or, worse, silently use a different toolchain. There is no supported host path.

- If the Docker daemon is unavailable, **STOP** — do not fall back to the host.
- `docker compose run --rm` discards the container's `/tmp` on exit, but the repo is bind-mounted
  (`.:/app`), so anything written under the repo (including under `.git/`) survives on the host and
  is invisible to `git status --porcelain`. The failing-name baseline (§7) relies on this.
- Always re-check `docker ps` at the end of a session; if a container survived `--rm`, remove it with
  `docker stop <id>` (never `docker compose down`).

The npm scripts (from `package.json`) and their Docker form:

| Script | Underlying command | Docker invocation |
|---|---|---|
| `npm test` | `ng test --watch=false` | `docker compose run --rm duely-dev npm test` |
| `npm run test:watch` | `ng test` (watch) | `docker compose run --rm duely-dev npm run test:watch` |
| `npm run test:coverage` | `ng test --coverage --watch=false` | `docker compose run --rm duely-dev npm run test:coverage` |
| `npm run test:e2e` | `playwright test` | see §8 — **routes through the currently-broken `playwright.config.ts`** |

---

## 3. Test layout

- **Location:** `client/app/**/*.spec.ts` (16 spec files at `ced1dc8`).
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

---

## 4. The gate set

Every phase of the backlog-emptying work asserts the same gates, in this order, all in Docker. This
is the set recorded in `docs/2026_MIGRATION_STATE.md` §11.

| Gate | Command | Expected |
|---|---|---|
| **G1** — app type-check | `docker compose run --rm duely-dev npx tsc --noEmit -p client/tsconfig.app.json` | **0 errors** |
| **G2** — spec type-check | `docker compose run --rm duely-dev npx tsc --noEmit -p client/tsconfig.spec.json` | **0 errors** (authoritative count) |
| **G3** — strict-null invariant | pipe G1/G2 output to `grep -cE 'error (TS2322\|TS2531)'` | literally **0** on both |
| **G4** — unit tests | `docker compose run --rm duely-dev npm test` | **24 failed / 47 passed (71)**, **5 failed / 11 passed files**, **44** icon messages, **0** NG8xxx, **0** NG0xxx — then the failing-name diff (§7) **must be empty** |
| **G5** — production build | `docker compose run --rm duely-dev npx ng build --configuration production --output-path /tmp/probe-dist` | **exit 0** (budget *warning* is expected, not an error) |
| **G6** — clean tree + no stray containers | `git status --porcelain && docker ps` | both empty after the commit |

> **Never build into the configured `outputPath`.** Probe builds always pass
> `--output-path /tmp/probe-dist` (or `/tmp/probe-dist-dev`) so the real `dist/` is never touched.

G1/G2 also exist in server/electron variants in later phases (G1b/G1c, added by backlog-emptying
Phase 6); they are not part of the core set today.

---

## 5. The baseline contract (must not move)

Until the deferred failures are addressed in a future test-and-date phase, `npm test` must report
**exactly**:

| Metric | Value |
|---|---|
| Tests | **24 failed / 47 passed (71 executing)** |
| Test files | **5 failed / 11 passed (16)** |
| `Error retrieving icon duely:*` messages | **44** |
| Compile-time `NG8xxx` errors | **0** |
| Runtime `NG0xxx` errors | **0** |
| G1 / G2 tsc | **0 / 0 errors** |
| G3 `TS2322\|TS2531` | **0** |
| i18n key parity | **138 EN / 138 DE** |

The **44 icon messages** are cosmetic: `provideDuelyIcons()` runs from `app.config.ts`, which spec
TestBeds do not load, so each `<mat-icon svgIcon="duely:...">` logs a lookup warning per render.
Every affected spec still passes. This is a documented limitation (locked decision 12), not a bug to
silence.

The baseline must **neither improve nor regress** (locked decision 3: *no test work in the
backlog-emptying phases*). A phase whose failing-name diff is non-empty is **reverted, never patched
forward**.

---

## 6. The 24 deferred failures — partition

All 24 are loud, classified and deferred. None is a migration regression; the 19 in groups 4–6 were
masked until migration Phase 6 fixed the `TranslateStore` NG0201 that aborted those specs. Copied
from `docs/2026_MIGRATION_STATE.md` §3:

| Owner | Count | Groups |
|---|---|---|
| **Backlog — Q1 (`saveAs`)** | 3 | `web-storage.service.spec` ×2, `electron-storage.service.spec` ×1 |
| **Backlog — Q2 (CollisionDetector)** | 1 | `CollisionDetector.spec` stale `date-holidays` expectation |
| **Backlog — option C (`saveText`)** | 1 | `creator.component.spec` stale valid-array expectation |
| **Backlog — CollisionDetector null-guard (source bug)** | 2 | `appointments.service.spec` — `repeating: null` crashes `CollisionDetector.ts:61` |
| **Backlog — ical-generator `toJSON()` drift (stale assertions)** | 10 | `appointments.service.spec` — start/end now ISO strings (were `Date`), event timezone now `null` |
| **Backlog — nth-weekday `byDay` format (source bug)** | 7 | `appointments.service.spec` — ical-generator rejects `'-3WE'`; bare codes still accepted |

**Per-file totals (the 5 failed files):**

| File | Failures |
|---|---|
| `CollisionDetector.spec` | **1** |
| `appointments.service.spec` | **19** (toJSON drift 10 + nth-weekday byDay 7 + null-guard 2) |
| `creator.component.spec` | **1** |
| `electron-storage.service.spec` | **1** |
| `web-storage.service.spec` | **2** |
| **Total** | **24** |

### Why they are still red

The 24 failures are **deferred by user decision to a separate future test-and-date phase.** They are
*not* fixed, dropped or skipped in the backlog-emptying work, and the baseline must stay frozen until
that phase runs. Their full diagnosis and disposition will be recorded in
**`docs/2026_KNOWN_LIMITATIONS.md`**, which backlog-emptying **Phase 13 will create** (the file does
not exist yet — this forward reference is intentional).

---

## 7. The reproducible failing-name capture (and the trap that broke the naive version)

The strongest form of the baseline contract is a sorted list of the failing test **names**, diffed
against a committed baseline. The baseline lives at
**`.git/duely-failing-names-baseline.txt`** (durable on the host via the `.:/app` bind mount, invisible
to `git status --porcelain`).

### The validated capture command (use this identical command every time)

```bash
docker compose run --rm duely-dev npm test 2>&1 \
  | grep -E '^[[:space:]]*FAIL[[:space:]]' \
  | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
  | sort > .git/duely-failing-names-baseline.txt
```

### The diff command (must be empty)

```bash
docker compose run --rm duely-dev npm test 2>&1 \
  | grep -E '^[[:space:]]*FAIL[[:space:]]' \
  | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
  | sort > .git/duely-failing-names.txt
diff .git/duely-failing-names-baseline.txt .git/duely-failing-names.txt   # MUST be empty
```

If the diff is **not** empty, STOP: revert the working tree, do not commit, and report. A non-empty
diff means the failing set moved.

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

## 8. Playwright-in-Docker screenshot capture (the validated visual recipe)

This is the mechanism behind the migration's visual pass and the working path for browser
screenshots **today**. Documenting it is what closes the "add a Playwright Docker service" backlog
item: the user's decision was that **the recipe is the answer**, not a dedicated compose service.

### `playwright.config.ts` is currently BROKEN (repaired in Phase 9)

`playwright.config.ts` exists but does not work: its `webServer.command` is `npm run serve`, which is
`webpack serve --mode development` — dead since migration Phase 5 switched `main.ts` to
`bootstrapApplication(...)` (the Webpack pipeline still expects `bootstrapModule(AppModule)`). Its
`baseURL` is `http://localhost:8000`. Consequently `npm run test:e2e` (which is `playwright test`)
cannot start its web server.

**Backlog-emptying Phase 9 repairs `playwright.config.ts`** with two projects — a dev-server project
on **4200** and a built-server project on **8000** (locked decision 18). Until then, **the capture
scripts are the working path**, not `playwright test`.

### How the container and ports work

- The `duely-dev` service (`docker-compose.yml`) is `node:24-bookworm`, bind-mounts `.:/app`, keeps
  `node_modules` as an anonymous volume, and **publishes ports `8000`, `4200` and `49152`**.
- **Port 4200** = the Angular dev server (`ng serve`) — this is what the capture scripts shoot
  (`BASE_URL = 'http://localhost:4200'`, resolved *inside* the container).
- **Port 8000** = the Express static server (`server/app.ts`, `const port = process.env.PORT || 8000`,
  serving `dist/server/static`) — the built-app path Phase 9's second project will target.
- The `duely-dev` image ships Playwright (`@playwright/test ^1.49.0`; the migration used 1.59.1) but
  **no browser cache**, so the Chromium binary must be installed into the container first.

### The recipe

```bash
# 1. Start a long-running dev server on 4200, named so it can be exec'd into.
#    (The migration used the name `duely-phase8-serve`; any stable name works.)
docker compose run --rm --name duely-serve -d duely-dev \
  npx ng serve --host 0.0.0.0 --port 4200

# 2. Install the Chromium shell INTO that container (image ships no browser cache).
docker exec -w /app duely-serve npx playwright install chromium --only-shell

# 3. Run the capture script inside the same container (it targets localhost:4200).
docker exec -w /app duely-serve node e2e/capture-after-shots.cjs

# 4. Stop the container when done (never `docker compose down`).
docker stop duely-serve
```

Because `.:/app` is bind-mounted, the PNGs land directly on the host under
`docs/migration-shots/` (git-excluded), no copy step needed.

### The capture matrix

`e2e/capture-after-shots.cjs` captures the **after** baseline: **6 route states × 2 themes × 2
accents × 3 viewports = 72 PNGs** (it exits non-zero if it captures fewer than 72).

- **Viewports:** widths **375 / 800 / 1440**, height 900. (800 is the exact fixed Electron window
  width at `electron/main.ts:30-32` and is trivially forgotten.)
- **Themes:** `light`, `dark` (`settings.themeMode`).
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
| 5 | `/legal` | renders raw i18n keys today (a known limitation) |
| 6 | unknown path (`/nope`) | wildcard redirect to `/404` |

For states 2–6 the script seeds `localStorage['settings']` (colour, themeMode, `Europe/Berlin`,
`en`, calendar metadata) before navigating; state 1 deliberately uses an **empty** localStorage so
the guard redirect fires. The 01/02 pairs are byte-identical per width by design — the guard redirect
renders the same DOM as a direct `/settings` visit.

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

---

## 9. Troubleshooting

- **`npm test` on the host does nothing / fails.** Expected — host `node_modules` is empty. Use the
  Docker form (§2).
- **Failing-name diff is non-empty.** The failing set moved. STOP and revert; do not commit (§7).
- **`× … 38ms` lines appear in your capture.** You used the naive pattern; switch to the
  `^[[:space:]]*FAIL[[:space:]]` command (§7).
- **44 `Error retrieving icon duely:*` lines.** Cosmetic and expected (§5). Do not "fix" by adding
  `provideDuelyIcons()` to TestBeds.
- **`npm run test:e2e` cannot start / hangs.** `playwright.config.ts` is broken until Phase 9 (§8);
  use the capture recipe instead.
- **Playwright: "browser not found".** The image ships no browser cache — run
  `npx playwright install chromium --only-shell` inside the container first (§8).
- **A container is still listed by `docker ps` after a run.** `docker stop <id>` it; never
  `docker compose down`.

---

## 10. Related documents

- `docs/2026_MIGRATION_STATE.md` §3 (failure partition) and §11 (resume tracker, baseline numbers,
  the 18 locked decisions, the failing-name capture command) — git-excluded, the live handoff.
- `docs/2026_MATERIAL_MIGRATION.md` §6 (final gate results + bundle measurements) and §9
  (pre-migration infrastructure, including the historical *Test evaluation summary*).
- `docs/2026_MIGRATION_BACKLOG.md` §1 (the deferred test work) and §2 (build/tooling backlog).
- `docs/2026_KNOWN_LIMITATIONS.md` — **forthcoming** (backlog-emptying Phase 13); will hold the full
  diagnosis and disposition of the 24 deferred failures, the 44 icon messages, and the other
  won't-fix/deferred items.
