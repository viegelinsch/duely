# Duely — Testing Guide

**Stack:** Vitest through Angular's `@angular/build:unit-test` builder · Playwright for visual/E2E
checks · Electron 45.2.3 on the `app://duely` protocol · Angular 22 · TypeScript 6 · Docker
`node:26-slim` (Node 26 updates retained; B0/A1/A4/A2/I3/D2/B12/I4/E1/E1a/E2 verified).
`package.json` / `package-lock.json` are authoritative for declared / resolved versions.
**Documentation consolidated:** 2026-11-09, against source at `f527f26` and existing migration records.

The former Karma/Jasmine stack and `client/test.ts` are gone. This guide preserves the historical
migration-closure snapshot, **P0 baseline run**, **isolated P1 candidate results**, the approved
**I1 integrated regression baseline**, **B0 clean-install/runtime verification**, **A1 reviewed
bounded security refresh**, the **A5/D1/D4 batch plus I3 integration**, the **D2 date-library
migration**, the **B12 desktop protocol/launch/packaging acceptance**, the **I4 combined-snapshot
rebuild**, the **E1 risk-focused review and runtime verification** and the **E2 clean reproduction and
final audit** (§4). The separate Material migration reference has been retired; completed history
remains in Git.

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

> **A2 note (2026-11-10).** The working tree now runs **Vitest 5.1.0** with **jsdom 31.0.0** (declared
> `"vitest": "5.1.0"`, `"jsdom": "31.0.0"`), still through `@angular/build:unit-test` 22.2.6 and still
> with `setupFiles: ["vitest.setup.ts"]` and **no explicit `environment`** — the builder resolves
> happy-dom when installed and jsdom otherwise. Since Vitest 5 lists `localStorage`/`sessionStorage` in
> its jsdom allowlist, jsdom's working storage is installed before setup files run and `vitest.setup.ts`
> takes its already-installed branch; it is retained as a capability guard and proved non-load-bearing
> (see §9). Vitest 5 rejects `vi.mock`/`vi.hoisted` files that contain an async arrow under this builder;
> put awaited assertions in an `async function` — Known Limitations (b.14).

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

**Every** npm/Node/Angular/TypeScript/lint/test/build diagnostic runs inside Docker. If the daemon
is unavailable, **STOP**; there is no host fallback. Host source editing and Git inspection are allowed.
All three Docker stages use `node:26-slim`; B0 measured Node 26.13.0 / npm 11.20.0 on Linux arm64.

For upgrade acceptance, use a task-specific, rebuilt image with the approved source/lock and private
image-layer dependencies, cache and output. Serialize provisioning and builds/E2E; keep Playwright
and both servers in one container. Do not mount the host dependency tree or reuse anonymous volumes.
A read-only baseline check of the retained B0 or A1 image can run as:

```bash
docker run --rm --pull never --name duely-b0-unit-check duely-b0-development:20261109-v2 npm test
docker run --rm --pull never --name duely-a1-unit-check duely-a1-development:20261110 npm test
```

These run the frozen B0/A1 image sources, not later main-tree edits. After source/lock changes, provision a
new approved candidate/tag and record its identity; the old image cannot accept those changes.
Retain logs and artifacts in a unique evidence mount for a full gate run (§4).

The Compose commands below remain normal development conveniences, **not clean-install acceptance**:
`docker compose run --rm duely-dev <cmd>`. Compose bind-mounts `.:/app` and overlays an anonymous
`/app/node_modules` volume; rebuilding an image alone does not prove that volume is current. It also
writes distributions/cache/reports into the main tree. Use isolated copies for upgrade gates to
preserve existing artifacts. One-shot Compose runs do not publish service ports by default.

- Re-check `docker ps` at session end. Stop only containers created for your verification; never use
  blanket Compose shutdown or pruning. No staging, commit or push is implied by verification.
- `.git/` evidence is invisible to Git status and is not committed/portable. Keep each dated capture;
  never overwrite historical failing-name files or protected screenshots/reports.

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
Node-side bundling does not substitute for TypeScript checking. `server/tsconfig.json` and
`electron/tsconfig.json` explicitly pair CommonJS emit with `moduleResolution: "node16"`; inheriting
the root's `bundler` resolution causes TS5095 and a nonzero exit (recorded exit 2), not a silent
green. **Since A4 (TypeScript 6) the `node10` resolver no longer exists (`TS5107`), so do not restore
it.** After changing these configs, verify G1b/G1c with a deliberate type error in an isolated
temporary copy of the source/configuration tree inside Docker, preserving relative paths. Confirm
diagnostics plus a nonzero exit before trusting the positive run.

The E2E file-list type-check in the battery uses
`tsc --noEmit --ignoreConfig --strict --skipLibCheck --target ES2022 --module node16 --moduleResolution node16 e2e/app.e2e.spec.ts`;
`--ignoreConfig` is required because TS 6 rejects a file list when a `tsconfig.json` sits beside it
(`TS5112`). The historical rows below still show the pre-TS 6 `--module commonjs --moduleResolution node`
form as the record of those runs.

| Gate | Command | Historical migration/P0 baseline (latest B0 results below) |
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

### Pre-upgrade baseline — P0, 2026-11-09

P0 was authorized by the user's request to start the first upgrade-board task. All diagnostics ran
inside the **existing, unchanged Docker image**, against an isolated copy of the current source.
No test/application/dependency/lockfile changes, image rebuilds, installs, commits or pushes occurred.
The historical migration snapshot above and `.git/duely-failing-names-baseline.txt` remain intact.

**Attribution and isolation:**

- Branch/HEAD: `dev-v2` / `1546c4ff41056de41c4dd2b8c9c3b23899cc26d8`. Input included existing user
  edits to `docs/TODO_UPGRADES.md` and Known Limitations; unrelated `.DS_Store` was preserved.
  `TODO-notes-he.md` was excluded without reading/copying/editing it.
- Source snapshot: 130 copied files; SHA-256
  `efef55fafca1eef116866c1bdb579c7d6c1f53c494bedada14d80d034051ba98` (sorted path/size/mode/content-hash
  inventory). Input diff SHA-256: `1f183fd6543d457708e362b48b086fd6e30b82df368fdb3f5a545e3b1be8835b`.
- Image ID/repository digest:
  `sha256:51a1db850fe8590388e60d8702ceb140f35f5d8e7d741846787c4824eb02aed0`;
  original `duely-duely-dev:latest`, task alias `duely-p0:20261109-1748`, created 2026-11-01.
  Docker Desktop server 29.9.2 was available. Node **26.13.0**, npm **11.20.0**, Linux arm64;
  registry `https://registry.npmjs.org/`. No manual Node storage flags were used.
- Root lockfile and image lockfile SHA-256 both
  `eb1eb198ea70c5906a885f45d3f9ca396b6e315a007ae6e2dc2a0d5076f94253`.
  All **44 unique direct installed/locked versions** matched across root/server/Electron declarations;
  `npm ls --depth=0 --json` exited 0. Secondary manifests were recorded, not independently installed.
- Unique one-shot `docker run --rm --pull never` containers mounted the workspace at `/workspace:ro`
  and task evidence at `/evidence`. Gates ran from `/evidence/source`, using the unchanged image's
  `/app/node_modules` through a snapshot-local symlink; each container had its own dependency layer
  and npm cache. No shared dependency volume or published ports. Builds/E2E were serialized, and
  both Playwright servers ran with the runner in the same container.
- Source/lock/version identities were checked before gates. 11,145 protected files had identical
  before/after hashes, including existing `dist/`, `.angular/`, screenshot/report/result artifacts,
  the historical failing-name list, `.DS_Store` and Known Limitations. Documentation recording is the
  only tracked change made by P0, in this guide and the existing upgrade board.

**Fresh gate results (actual child-process exits retained, not parser/pipeline exits):**

| Gate | Actual isolated-container command | Result |
|---|---|---|
| G1 app | local `tsc --noEmit -p client/tsconfig.app.json` | exit 0, no diagnostics |
| G1b server | local `tsc --noEmit -p server/tsconfig.json` | exit 0, no diagnostics |
| G1c Electron types | local `tsc --noEmit -p electron/tsconfig.json` | exit 0, no diagnostics; not a runtime launch |
| G2 specs | local `tsc --noEmit -p client/tsconfig.spec.json` | exit 0, no diagnostics |
| G3 | unchanged strict/template/injection configs; G1/G2 logs | no TS2322/TS2531; no suppressions introduced |
| Lint | `npm run lint` | exit 0, **0 errors / 8 warnings** |
| G4 units | `npm test` | exit 1, **24 failed / 49 passed**, 5 failed / 12 passed files |
| G5 dev/prod probes | local `ng build --configuration development\|production --output-path /tmp/duely-p0-<configuration>` | both exit 0 |
| G5 distribution | `npm run build`, then `npm run build:prod` | both exit 0; isolated distribution only |
| G6 | `npm run test:e2e -- --trace on --reporter list,json,html --output /evidence/e2e-results` | exit 0, **16 passed**, no failed/skipped/flaky tests, both projects |
| Full audit | `npm audit --json` | exit 1; 6 critical / 35 high / 39 moderate / 5 low = **85** |
| Production audit | `npm audit --omit=dev --json` | exit 1; 1 critical / 7 high / 5 moderate / 3 low = **16** |
| Desktop version probe | local `electron --version` | exit 1; no extracted Electron binary in image |

Unit stderr retained **44** missing-icon messages, **17** experimental Node storage warnings,
and no NG0xxx/NG8xxx diagnostics. The storage warnings are worker-dependent, not a new fixed gate.
Lint advisories were all `@typescript-eslint/no-deprecated`: `RouterTestingModule` in About, App,
NotFound and Settings specs; `ApplicationConfig` and `provideAnimationsAsync` in `app.config.ts`;
legacy `saveAs` argument usage in the two storage implementations. Exact locations/messages remain
in the raw lint log. Production CommonJS specifiers were `deepmerge`, `file-saver`, `jalaali-js`,
`moment`, `moment-timezone` and `uuid-random`; no budget warnings occurred.

**Failure accounting:** current sorted 24-name md5 is **`fa0bdd93490bc4cbdf2103d7a63878fe`**.
The only delta from historical `172d78996b50c84e38211b529d76ab0b` is the authorized holiday-test
**2017 → 2032 title rename**. No other failing names changed. Full names and per-failure diagnostics
are retained in `failing-names.txt` / `unit-failures.json`; the current causes are:

| Suite / test or scenario | Cause |
|---|---|
| CollisionDetector: holidays of Lower Saxony/Augsburg in 2032 | Received `2031-12-31T00:00:00.000Z`, expected `2031-12-31T23:00:00.000Z`; existing collision time-policy/oracle mismatch, index-0 loop unchanged |
| AppointmentsService: valid iCal string | Missing expected `Z` in `DTSTART:20170713T060000Z` |
| AppointmentsService: simple event | Event timezone `null`, expected `Europe/Berlin` |
| AppointmentsService: daily, never ending | ISO start string versus Date |
| AppointmentsService: daily, 2 events | ISO start string versus Date |
| AppointmentsService: daily, until | ISO start string versus Date |
| AppointmentsService: weekly-thursday, interval 2, never-ending | ISO start string versus Date |
| AppointmentsService: monthly, every 2. wednesday, interval 2, 2 events | Rejected ordinal byDay; API accepts SU/MO/TU/WE/TH/FR/SA |
| AppointmentsService: monthly, every last, interval 2, 2 events | ISO start string versus Date |
| AppointmentsService: monthly, every 3. last wednesday, interval 2, never-ending | Rejected ordinal byDay |
| AppointmentsService: monthly, every 3. last wednesday, interval 2, 2 events | Rejected ordinal byDay |
| AppointmentsService: yearly, every first friday of january, interval 2, never-ending | Rejected ordinal byDay |
| AppointmentsService: yearly, every first wednesday of january, interval 2, 2 events | Rejected ordinal byDay |
| AppointmentsService: yearly, every second last friday, interval 2, never-ending | Rejected ordinal byDay |
| AppointmentsService: yearly, every last friday, interval 2, 2 events | Rejected ordinal byDay |
| AppointmentsService: yearly, last day of december, interval 2, 2 events | ISO start string versus Date |
| AppointmentsService: yearly, 2. last workday, interval 2, 2 events | ISO start string versus Date |
| AppointmentsService: yearly, 2. workday, interval 2, 2 events | ISO start string versus Date |
| AppointmentsService: monthly, 2. workday, interval 2, 2 events | ISO start string versus Date |
| AppointmentsService: monthly, 2. weekend day, interval 2, 2 events | ISO start string versus Date |
| CreatorComponent: saveText/getICalString with valid input | `saveText` spy not called; separately deferred option C |
| ElectronStorageService: save file | Cannot redefine `saveAs` |
| WebStorageService: download files | Cannot redefine `saveAs` |
| WebStorageService: save file | Cannot redefine `saveAs` |

This is a **known-red baseline**, not a passing unit suite. No failing test was repaired, skipped,
removed or loosened. Existing public recurring/export defects and policy ambiguities still require
P1E/D1/D2 coverage and approved contracts; the first observed assertion does not prove later fields.

**Payload/browser/security evidence and limits:**

- The seven initial assets total **2,312,172 raw B**, with index **10,840 B**; each asset size equals
  the historical snapshot. Hashed filenames differ in isolation, including lazy imports; comparison
  with the preserved distribution found all seven initial contents identical after normalizing chunk
  import names. Angular reported 371.81 kB estimated transfer here versus historical 371.55 kB;
  changed hash strings affect compression. This is an estimate, not measured network/gzip savings.
- All **16 Playwright traces**, JSON/HTML reports and browser console/network events were preserved.
  No captured console errors, page errors or failed/error-status network responses. Four dev-browser
  dual-binding warnings remain; Vite connection and Angular development-mode logs were informational.
- A **364-B** final copy of `/tmp/duely.ics` was retained, showing `ICS Download Test`, one event,
  `09:00`–`10:00` floating DTSTART/DTEND without `Z`/TZID. Both tests use the same temporary filename;
  this last-write copy is not separate evidence for each project. The suite still does not assert ICS
  contents, persisted timezone, collision results or exported recurrence; EN/DE datepicker/metadata/
  exclusion semantics remain P1W work. No full visual matrix or new semantic guards were claimed.
- Registry queries for all 44 locked direct versions exited 0, retaining peers/optional-peer metadata,
  engines, dist-tags and deprecation fields. Current deprecated direct versions are
  `@angular/animations@20.3.18` and `eslint@9.39.4`. `@eslint/js@9.39.5` has no deprecation flag in
  this refreshed response, correcting that claim in the preparation evidence; no target was installed.
- Complete audits have the same totals as the earlier dated research. They include propagated
  findings and are **not security clearance**. Root production audit does not represent an independently
  installed deployed server or an image scan. Override declarations/resolved glob/tar/yauzl/extract-zip
  paths were retained for later review, not altered. No clean install was attempted.
- Electron 34.5.8 is the installed **package** version only. `/app/node_modules/electron/dist/electron`
  is absent; the CLI throws `Electron failed to install correctly`. Embedded Node/browser versions,
  GUI, custom protocol, offline routes and packaging are **blocked/unverified**, not passed by G1c or
  bundle success. Earlier installer/GTK evidence remains historical; no extraction/install repair ran.

**Durable local evidence:** `.git/duely-p0-20261109-1748/` contains the copied source/manifests,
`identity.json`, `docker-environment.json`, `input.diff`, `commands.json` with command exits/timestamps,
raw stdout/stderr logs, complete audit/registry JSON, current and preserved historical failing-name
lists, per-failure details, payload/override/config comparisons, all traces/reports, browser events and
the download. These local artifacts are not committed or portable; this dated result is maintained
here and in the upgrade board. P0 is complete and execution is paused for explicit next-task approval.

---

### Regression-guard batch — P1 candidates, 2026-11-09

The user explicitly approved P1C/P1F/P1E/P1W. All four **test-only candidates are complete** in
`.git/duely-p1-20261109-batch/{c,f,e,w}/source`, with classified red guards. **At P1 completion** they
were not integrated and no combined full-suite baseline existed. The subsequently approved I1 record
below establishes that baseline. No production repair, dependency change/install, commit or push
occurred in either task. P0 and the historical baseline above remain intact.

**Identity and isolation:** HEAD `1546c4ff41056de41c4dd2b8c9c3b23899cc26d8`; four identical current
130-file inputs included approved uncommitted documentation. Input source-inventory SHA-256
`beeea981f919c61768823e12e4d99a0b1796f546ec6d8fbda8554e330b49f0e2`; input diff SHA-256
`54ca0ac29720d6d8b8bb528aa44b3130617cd2586c2d920218890bff82fc0900`. P0's image ID/lock hash and
44 direct installed versions were unchanged. Unique `duely-p1c/p1f/p1e/p1w:20261109` image aliases
point to that same image. All diagnostics ran in isolated one-shot Docker containers, with private
image-layer dependencies, per-candidate source links/caches/outputs and no shared dependency volume.
Builds/E2E remained serial within each candidate. No manual Node storage flags were used.

**Final commands and actual child-process exits:**

| Candidate / final logs | Commands in that candidate | Result |
|---|---|---|
| Every candidate | local `tsc --noEmit -p client/tsconfig.spec.json`; local ESLint on leased test paths | all exit 0; no lint errors/warnings |
| C v1 | `npm test -- --include client/app/DatesAndCollisions/CollisionDetector.spec.ts`, UTC and Berlin | each exit 1, **1F/4P (5)** |
| F v3 | `npm test -- --include client/app/creator/appointment-form/appointment-form.component.spec.ts --include client/app/creator/appointment-form/recurring-settings/recurring-settings.component.spec.ts`, UTC and Berlin | each exit 1, **2F/17P (19)** |
| E v4 | `npm test -- --include client/app/creator/appointments.service.spec.ts`, UTC | exit 1, **48F/17P (65)** |
| W v2 | local `tsc --noEmit --strict --skipLibCheck --target ES2022 --module commonjs --moduleResolution node e2e/app.e2e.spec.ts` | exit 0 |
| W v2 | `npm run test:e2e -- --trace on --reporter list,json,html --output /evidence/w/e2e-results-v2` | exit 1, **8F/14P (22)**, 0 skipped/flaky; **4F/7P per project** |

C/F set `TZ=UTC` / `TZ=Europe/Berlin`; E uses UTC. W's runner and both servers live in the same
container. Final raw logs, environment/commands/process exits and earlier attempts are retained per
candidate. Focused stderr contains C/E 0 icon messages and one storage warning; F 51 icon messages
and two storage warnings in each zone. These are harness messages, not reasons to weaken assertions
or predict a combined-suite count.

**New coverage and failure attribution:**

- C repairs both repeated-index-0 loops with cardinality and every date/reason, verifies the preserved
  raw 15-holiday 2032 union, and separately characterizes host-local collision time under UTC/Berlin.
  Bounded translated explicit exclusions check both dates and exclude a date outside UNTIL. The old
  holiday failed name remains (0 added/removed), but now all 15 dates expose the raw-midnight versus
  host-time mismatch; 14 were previously unchecked. Raw fixtures and current policy were not retuned.
- F uses real date/time/title input/change/blur events and input lifecycle, observes model validity,
  native adapter Dates, duration, exported form values, child alarm-array identity and rendered
  imperative OnPush recurrence summary. The assertion-free validation test now checks COUNT/UNTIL.
  Two newly failing names in both zones: backward end-date retains intended 22:00 start but receives
  23:00; saved UNTIL first reveal/reopening expects April 3, 2032 but receives empty input/null.
  Picker-selected UNTIL/model/public export passes. None of the old failed names disappear.
- E adds 43 independent `addAppointment()` → `getICalString()` → `getCollisions()` guards, preserving
  the old 19 failures and exposing 29 new failures. Semantic ICS assertions ignore generated UID/stamp
  volatility. The exact new failure families/fixtures/causes are recorded in the upgrade board's P1
  record and `attribution.json`; their complete partition is:

| E added failed family | Count | Cause |
|---|---:|---|
| MONTHLY/YEARLY forward/inverse weekdays on February 7, 14, 28 (2031/2032 fixtures) | 16 | Rejected ordinal byDay encoding; subsequent position checks remain masked until D1 repair |
| MONTHLY/YEARLY inverse workdays on February 20, 2031/2032 | 4 | Wrong month argument; BYSETPOS -1 instead of -7/-6 |
| DAILY/WEEKLY/MONTHLY/YEARLY COUNT exports without exclusions | 4 | Malformed empty `EXDATE:` |
| Literal floating sentinel | 1 | `TZID=floating`, not floating output |
| Repeated alarm content/trigger/repeat/interval | 1 | Numeric repeat rejected; package requires an object |
| Explicit UNTIL exclusions, February 8/9 | 1 | Exclusions silently missing from EXDATE/collisions |
| COUNT pre-exclusion set, in-set/out-of-set dates | 1 | `date.setHours is not a function` on serialized values |
| Bounded Augsburg holiday/name | 1 | `eventData.start.getHours is not a function` on serialized values |

Passing E guards cover simple/floating/explicit named/omitted zone/UTC, supplied exclusive all-day
boundaries, a single alarm and alias, date-only UNTIL serialization, forward workdays and last leap-
February workday. Known crashes remain real attempted export assertions, not `toThrow` acceptance.

- W now unconditionally requires the real timezone selector, saves/reloads Settings and checks named
  09:00/10:00 exports. Each execution retains its own downloaded ICS rather than a shared `/tmp` file.
  DAILY COUNT3 and real EN/DE April 6 exclusions replace panel-only/download-name/logging coverage.
  Both projects fail the same four scenarios: daily empty EXDATE; EN and DE exclusion download timeouts
  after export throws; German Material calendar day-label mismatch. Exclusion row/reason assertions
  are present but remain unreached until D1 repair. EN/DE metadata and field labels, English calendar
  labels, timezone persistence and simple downloads pass. Material locale/provider repair is proposed
  for A3's approval, not implemented or implicitly authorized by P1.

**Deliberate negative controls (not just nonzero totals):**

| Disposable mutation | Actual result | Previously passing guards killed |
|---|---|---|
| C second-date corruption; separately second-reason corruption | each exit 1, 4F/1P | indexed explicit exclusions, full host-time holiday array, bounded translated exclusions (three each) |
| F start-date listener bypass | exit 1, 3F/16P | real listener/duration |
| F clone child alarm array | exit 1, 3F/16P | blur/export alias identity |
| F remove parent recurrence markForCheck | exit 1, 3F/16P | rendered imperative recurrence summary |
| E v4 suppress public add | exit 1, 63F/2P | 14 passing public-flow guards and old add-appointment test |
| E v4 suppress alarm creation | exit 1, 49F/16P | single alarm action/trigger/description |
| W suppress Settings save | exit 1, 2F/0P | timezone persistence/named export on both projects |
| W corrupt downloaded summary | exit 1, 2F/0P | simple downloaded content on both projects |

All nine controls mutate isolated disposable copies only. `attribution.json` compares exact failed
names/causes against the canonical candidate and P0; no old failed unit name was removed. Repeated
`expect.soft` diagnostics are deduplicated by test name, not counted as separate failed tests (§7).

**Browser evidence and limits:** all 22 final traces, 12 Settings/calendar/exclusion PNGs and six
independent downloads (364-B simple, 454-B named, 407-B daily, one of each per project) are retained in
`w/e2e-results-v2/`. Four console errors occur only during real exclusions: production reports
`TypeError: n.setHours is not a function` in `dateWithoutTime` → export; dev captures generic ERROR
handles. No captured page errors or failed/error-status network responses. In the interactive browser,
dev timezone/EN/DE metadata/German calendar/COUNT3-exclusion generation were exercised; production
was checked only for accessibility/default English Settings. The automated suite covers both servers,
including the German calendar's English labels. Screenshots are functional context, not a full visual
matrix. Session-created `duely-p1w-browser` (published 14200/18000) was stopped; no containers remain.

**Downstream contracts:** the upgrade board's **P1E downstream contract inventory** separates RFC
5545 rules from observed behavior. Four product choices remain for explicit approval before affected
D1/D2 repairs: named wall components versus Date instants; omitted public timezone fallback versus
inheritance; selected UNTIL day's cutoff; inclusive versus exclusive UI all-day end. Current named
serialization is a characterization, not evidence of instant-preserving conversion or complete
VTIMEZONE interoperability. Standard COUNT counts before EXDATE subtraction (no implicit refill),
explicit floating does not inherit a calendar zone, supplied public all-day DTEND is exclusive, and
host-local holiday policy stays unchanged unless separately approved. UID/stamp byte equality is not
a contract. No unresolved policy was made green by changing Dates into strings or editing Z suffixes.

**Preservation/handoff:** all 130 frozen main input files and 11,145 protected artifacts were unchanged
before these completion records. Candidate changes are confined to five leased test files; main tests,
production source/manifests/lockfile, existing dist/cache/reports/screenshots/baseline, Known Limitations
and `.DS_Store` remain untouched. `TODO-notes-he.md` was not read/copied/edited/staged. Each normalized
`candidate.patch` was inspected and `git apply --check` exited 0 without application. `identity.json`,
per-candidate `candidate.json`/`commands.json`, raw final logs, negative copies/logs, `attribution.json`,
`browser-events.json`, `ical-probe.json`, `quality.json` (hashes/exits/artifact inventory) and `finish.json`
retain local evidence. Only this guide and the existing upgrade board receive P1 main-tree edits.
P1 paused for separate I1 approval, which was subsequently received and executed below; local
candidate artifacts remain uncommitted and non-portable.

### Integrated regression baseline — I1 DONE, 2026-11-09

The user explicitly approved integration of P1C/P1F/P1E/P1W. Exactly the five leased test files were
integrated into the checked-out **`dev-v2` working branch**, without switching branches or committing.
Every file matches its approved candidate **byte-for-byte**; candidate patches, leases, hashes and
all nine effective negative controls were checked against retained P1 evidence before integration.
Controls were not rerun or production-mutated during I1. Its baseline, reproduced by B0 below, is **known red**.

**Input and execution identity:** unchanged HEAD `1546c4ff41056de41c4dd2b8c9c3b23899cc26d8`;
130-file input SHA-256 `8fc1f2b2fedf11c54ed1e5bcd2c169b973c351467566eca7375de64f81b4e1e1`;
input diff SHA-256 `6695217edcecf51706ba391973d7c25cb6570cbf9442976bfeebee8ae3396fe4`.
Measured integrated source SHA-256 `113b0054021998e0c6e2ea4a4bc6370f8c466e4677453b397aa2d15dd33bc9f0`
uses sorted path/content-hash/mode entries; it includes the completed P1 documentation but precedes
this I1 record. P0's image ID and lockfile hash remain unchanged; all 44 direct installed versions
match the lock across the three manifests. Node 26.13.0 / npm 11.20.0 / Linux arm64; no manual storage
flags. Gates used the unchanged `duely-p1e:20261109` image; `duely-i1:20261109` is the same image's
I1 handoff alias. No image rebuild/pull, dependency install or refresh occurred.

All execution ran **serially inside Docker**, from `.git/duely-i1-20261109-integration/source`, using
snapshot-local `/app/node_modules`, private image-layer dependencies and npm cache. The main
workspace and P1 evidence were read-only mounts. Probe outputs were task-specific `/tmp` paths;
distribution/cache/E2E outputs stayed in the isolated source/evidence tree. The Playwright runner and
both servers shared one container; no published ports or shared dependency volumes were required.

| Gate / retained log | Actual command inside the container | Result |
|---|---|---|
| G1/G1b/G1c/G2 | local `tsc --noEmit -p` app/server/Electron/spec configs | all exit 0, no diagnostics |
| E2E types | local `tsc --noEmit --strict --skipLibCheck --target ES2022 --module commonjs --moduleResolution node e2e/app.e2e.spec.ts` | exit 0 |
| G3 | unchanged strict compiler/template/injection configs; app/spec logs | 0 TS2322/TS2531, no suppressions |
| Lint | `npm run lint` | exit 0, **0 errors / 8 existing warnings** |
| G4 `units-UTC.log` | `TZ=UTC npm test` | exit 1, **55 failed / 70 passed (125)**; **7 failed / 10 passed files (17)** |
| C/F timezone check | `TZ=Europe/Berlin npm test -- --include` the three C/F test paths | exit 1, **3 failed / 21 passed (24)**; same three candidate failed names |
| G5 dev/prod probes | local `ng build --configuration development\|production --output-path /tmp/duely-i1-<mode>` | both exit 0, 0 budget warnings |
| G5 isolated distributions | `npm run build`, then `npm run build:prod` | both exit 0 |
| G6 `e2e.log` | `npm run test:e2e -- --trace on --reporter list,json,html --output /evidence/e2e-results` | exit 1, **8 failed / 14 passed (22)**, 0 skipped/flaky; both projects |

The unit suite adds **52 executing cases** over P0's 73 (C +2, F +7, E +43). All 24 P0 failed names
remain, with the two F and 29 E additions already classified by P1; the complete 55-name set equals
that union and every associated error matches the retained P0/P1 cause. **0 removed, 0 unexplained
names/causes.** C now diagnoses all 15 holiday-date mismatches rather than only index 0. The 31 added
failure families are the two form defects and the E partition above, not new integration defects.
Full output has 73 missing-icon messages (additional real form renders), 17 experimental Node storage
warnings, and no NG0xxx/NG8xxx diagnostics. No browser icon-registration failure is inferred from
these TestBed messages. The eight existing lint advisories and six production CommonJS specifiers
are unchanged from P0; no warning or budget was suppressed.

The new **deduplicated, whitespace-normalized** 55-name file is
`.git/duely-i1-20261109-integration/failing-names.txt`: md5 **`21fcb83db9ddf496dd1afddc24a40300`**,
SHA-256 `aa4a992f3774861b15ce58cebb01b91a8bd2dc41ab7111f1a3d731cb98dd5a00`.
It is a separate approved baseline, not a replacement of P0 or the migration capture. Extraction
strips ANSI/NUL, trims/collapses whitespace and sorts unique FAIL detail names; count must equal the
actual 55 failed tests. `attribution.json` retains every failed name/error and the P0 delta.

**Browser evidence:** project/test statuses exactly match P1W: per project one daily empty-EXDATE
failure, two EN/DE exclusion download timeouts and one German calendar-label failure. Later exclusion
row/date/reason assertions remain unreached. All 22 traces, 12 PNGs and six independent downloaded
calendars are retained. Four exclusion console errors match P1; production shows `setHours is not a
function`, dev captures generic ERROR handles. No captured page/network errors. This is a repeated
functional E2E run over both servers, not a passing suite, new interactive visual matrix or desktop acceptance.

**Contracts and limits:** I1 approval does not resolve the four recorded named-time/omitted-zone/
UNTIL/UI-all-day policy choices; they still require decisions before affected D1/D2 repairs. Explicit
floating, exclusive supplied public DTEND, pre-EXDATE COUNT and current host-local holiday behavior
remain as recorded by P1. No production behavior was repaired or expectation loosened. Security
audits/registry metadata and Electron extraction/launch/packaging were not rerun; P0's limitations
remain, with clean-install/runtime bootstrap reserved for separately approved B0.

**Preservation and handoff:** only these five tests and this guide/upgrade-board completion record
changed during I1. All 11,145 protected artifacts, unrelated Known Limitations/`.DS_Store`, production
source, manifests/lockfile and historical/P0/P1 evidence are preserved. `TODO-notes-he.md` was excluded
without reading/copying/editing/staging it. `identity.json`, `input/`, `input.diff`, `integrated.json`,
`source/`, actual-exit `commands.json`, raw gate logs, `attribution.json`, `quality.json`, browser
artifacts/events and `completion.json` retain local evidence. `approved-source/` exports the same
measured application/test input plus these final documentation records, with its inventory/hash in
`completion.json`; it has no dependency tree and is not a commit. All session containers exited with
`--rm`. **I1 DONE; paused for explicit B0 approval.** No successor, commit or push occurred.

---

### Clean-install/runtime bootstrap — B0 DONE, 2026-11-09

The user explicitly approved B0. Exactly six bootstrap files changed: `Dockerfile`, `.dockerignore`,
root manifest/lockfile and Electron/server manifests; all match the verified isolated candidate
**byte-for-byte**. Application/test behavior, strict configs, build scripts and existing overrides
are unchanged. No desktop GUI/protocol/offline/packaging acceptance or production repair is implied.

**Identity:** unchanged `dev-v2` / HEAD `1546c4ff41056de41c4dd2b8c9c3b23899cc26d8`.
The 130-file approved I1 input inventory SHA-256 is
`919cd00ee749c32ca5d2fa9e8acc1a81f05a5b2720af96eca767a8fbb388202e`; input diff SHA-256
`996017f3cb971b52d9fa0506b997a5503e51cb575cf4da48ac51fc404595ad46`.
Measured/integrated source before B0 documentation:
`7e8fa415e5b81626ebe9f6ec68f433f7ae6e26db50c08fc2f246fd08d27b1e98`.
New generated lock SHA-256:
`9e29f5932170b9bc8cc0f00ff191129bbae26fabbe7d79e3781b644c1ce7de34`.
Only Electron **34.5.8 → 45.2.3** and electron-builder **26.8.1 → 26.18.1** changed among 44 direct
installed versions. Root Node typings remain unchanged; D4 still owns their tooling alignment.

**Provisioning:** `node:26-slim` availability/package engines were verified before building; selected
base digest `sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072`,
Node **26.13.0**, npm **11.20.0**, Debian trixie/Linux arm64. All three engines now declare Node
`^26.0.0` / npm `^11.20.0`. Coordinator lock-only resolution used
`npm install --package-lock-only --no-audit --no-fund --engine-strict` (exit 0), with no force/peer
bypass or handmade lock nodes. Reviewed all 289 changed lock entries: 179 version/add/remove and
110 metadata-only. Desktop dependency/peer resolution and 14 shared node-gyp-hoist removals explain
the delta; 0 unexplained changes and 0 locked Node engine incompatibilities.

Clean development/builder installs use `npm ci`; production uses `npm ci --omit=dev`. Global CLI,
peer-bypassed fallback and ignored-script install were removed. Playwright **1.64.1** and its
provisioning/version assertion remain (Chromium/headless shell 1248, FFmpeg 1013). No host/shared
node_modules or dependency volumes were reused. `.dockerignore` excludes private `.git` evidence,
prohibited notes, Angular cache, historical screenshots and test/report outputs.

An earlier production build unexpectedly ran builder/runtime installs concurrently after a cache
assumption failed. Final runtime manifests copy from the completed builder **before** runtime `npm ci`,
enforcing stage sequencing. Earlier attempts/logs/images are retained, not presented as fully serial.
Accepted final rebuilt images:

| Image tag | Verified image ID |
|---|---|
| `duely-b0-development:20261109-v2` | `sha256:7d78d275ae998ae439f52b3e4cbb77b4ae434b62e8edd417a1e4d5a0e90456bf` |
| `duely-b0-production:20261109-v2` | `sha256:f30667814bb9d68e48380ade4e4a2b9642c78b821d49eb49cc72532c05275dd8` |

**Electron prerequisite verification:** Electron 45 lazily downloads on its first require. Initial
path-capture checks failed because download status text polluted the shell variable; explicit
`node -e "require('electron')"` provisioning before `node -p "require('electron')"` fixes that harness
issue without manual unzip, skipped scripts or yauzl override. Extracted executable
`/app/node_modules/electron/dist/electron` is executable, SHA-256
`b7052902b810a4d13b46a0abcedd73a3dc3c876ce96ae6674673299591a10297`.
`ELECTRON_RUN_AS_NODE=1` exits 0 and reports **Electron 45.2.3 / embedded Node 24.22.2 / Chrome
156.0.8078.80**, independently of container Node. `ldd` exits 0 with no missing libraries.
GTK3 3.24.49-3 (`libgtk-3-0t64`), Xvfb 21.1.16-1.3+deb13u4 and xauth 1.1.2-1.1 are installed.
This is actual extraction/library evidence, **not a BrowserWindow launch or B12 acceptance**.

**Final gate results:** all diagnostics ran in one-shot Docker containers; builds/E2E serially,
no published ports or manual Node storage flags. `commands.json` records all 15 actual exits.

| Gate | Actual container command | Result |
|---|---|---|
| Full tree / Playwright | `npm ls --all --json`; local `playwright --version` | both exit 0; Playwright 1.64.1 |
| G1/G1b/G1c/G2 / strict E2E types | same local TypeScript commands as I1 above | all exit 0; 0 strict-null diagnostics |
| Lint | `npm run lint` | exit 0; **0 errors / 8 existing warnings** |
| G4 UTC units | `TZ=UTC npm test` | exit 1; **55F/70P (125), 7F/10P files (17)** |
| C/F Berlin | `TZ=Europe/Berlin npm test -- --include` three C/F paths | exit 1; **3F/21P (24)** |
| Dev/prod probes | local `ng build --configuration <mode> --output-path /tmp/duely-b0-<mode>` | both exit 0; no budget warnings |
| Dev/prod distributions | `npm run build`, then `npm run build:prod` | both exit 0 |
| Both-project E2E | `npm run test:e2e -- --trace on --reporter list,json,html --output /evidence/e2e-results` | exit 1; **8F/14P (22), 0 skipped/flaky** |

Every unit failed name/error and E2E project/test/status/known cause matches I1: **0 new, removed or
unexplained failed names/causes**. These remain classified red suites. Separate B0 normalized
`failing-names.txt` retains md5 **`21fcb83db9ddf496dd1afddc24a40300`**, SHA-256
`aa4a992f3774861b15ce58cebb01b91a8bd2dc41ab7111f1a3d731cb98dd5a00`.
73 TestBed icon messages, 17 Node storage warnings, no NG0xxx/NG8xxx diagnostics and the same six
production CommonJS specifiers remain; no warning suppression. All 22 traces, 12 PNGs and six
independent calendars are retained. Four known exclusion console errors, no captured page/network
errors; later exclusion assertions remain unreached. No new interactive visual matrix was run.

**Production image smoke:** uid **1000 (`node`)**, matching lock and all 20 root runtime direct
versions; `npm ls --omit=dev --all --json` exits 0. Electron/local/global development CLI are absent.
Eight 200 responses cover root, one actual JavaScript asset, `/creator`, `/settings`, `/about`,
`/legal`, EN/DE JSON. Actual `<rac-root>` markup is checked after correcting the first harness's
`<app-root>` assumption; JavaScript content type is verified and HTML fallback rejected.
`/creator` is an HTTP SPA fallback check, not an accepted Angular route. The child server was stopped
with SIGTERM. **Compose's curl healthcheck remains unchanged/unverified for C1.**

**Residual installation/security limits:** npm 11.20 `allowScripts` warnings remain, but lifecycle
logs prove watcher/electron-winstaller/lmdb/both esbuild scripts ran and exited 0. `ignore-scripts`,
`legacy-peer-deps` and `force` are false. Optional msgpackr-extract exited 1 and was omitted; both I1
and B0 lack native acceleration and pass a JavaScript round-trip. No scripts were silently skipped,
no blanket script approval or speculative native-toolchain repair was made. Install audit summaries
were full **76 (5 low/41 moderate/24 high/6 critical)** and production **16 (3/5/7/1)**; these are not
complete reviewed audit deltas, security clearance, an image scan or A1 completion.

**Preservation/handoff:** all 11,145 protected artifacts and unrelated Known Limitations/`.DS_Store`
are unchanged; host dependencies and existing distributions/caches/screenshots/reports were not used
or mutated. Finalization rechecks 5,009 retained P0/P1/I1 evidence entries. Prohibited notes were not
read/copied/edited/staged. Only six bootstrap files and this guide/upgrade board changed during B0.
`.git/duely-b0-20261109-bootstrap/` retains frozen input/candidate, metadata/lock review, npm lifecycle
logs, build-history exports (including failed attempts), `measured-v2.json`, actual-exit `commands.json`,
`quality.json`, `attribution.json`, browser evidence/events, `production.json`, `integrated.json` and
`completion.json`. `approved-source/` exports the measured application/tests/bootstrap plus final
records, with its inventory/hash in completion; local evidence is not a commit or portable checkout.
All session containers exited with `--rm`. **B0 DONE; paused for explicit A1 approval**, without staging,
commit, push or successor work. Four calendar policy choices and B12 desktop acceptance remain pending.

### Reviewed bounded security refresh — A1 DONE, 2026-11-10

The user explicitly approved A1 only. Exactly three files changed in main: root `package.json`,
`package-lock.json` and `server/package.json` — integrated as a **pure coordinator transfer** (main was
asserted to be pristine B0 state first, then the files were copied from the verified candidate and
proven byte-identical to the measured image source). No source, test, config or Dockerfile change.

**Patch set (all registry metadata verified in Docker):** exact pins Angular framework seven +
`compiler-cli` 20.3.35, `@angular/build`/`@angular/cli` 20.3.42, `compression` 1.8.2 (root and server),
`concurrently` 9.2.5, `rimraf` 6.1.4; override `glob` `^13.0.6` → `^14.0.4`. `tar` `^7.5.22` unchanged;
Material/CDK untouched; no calendar/holiday resolution and no majors hidden in the patch label.
New generated lock SHA-256:
`aee15fa3c132635869c3b56a51a737e8d982630f9368112a5468284fa8c85f90`.

**Lock resolution honesty:** plain and explicit-spec `npm install --package-lock-only --engine-strict`
both failed ERESOLVE — npm 11 cannot incrementally move the peer-coupled Angular set out of the B0 lock
(stale placements pin each other via exact peers). The recorded workaround prunes exactly the 14 stale
top-level lock entries (13 targets + `glob`) so npm re-places them from the staged manifest while
reusing every other entry (`lock-pruning.json`). The lock is still fully npm-generated; no
`--force`, `--legacy-peer-deps` or handwritten nodes. Result: 94 changed entries (91 version, 3
metadata-only), 0 changes outside the reviewed closure, 0 engine failures.

**Audit delta (not security clearance):** full **73 (5/38/24/6) → 48 (4/28/13/3)**; production
**16 (3/5/7/1) → 8 (3/2/2/1)**. Cleared: compression, concurrently + shell-quote, rimraf, glob, the
Angular framework set, `@angular/build` and transitively **piscina (critical) + vite (high)**.
Explicitly unresolved: `@angular/cli` **moderate** remainder (advisory DB shift 2026-11-10, range
≤ 22.1.0-rc.0 via pacote/minimatch, fix only in future major 22.2.6 — the previous ≤ 20.3.39 high
advisory is cleared) → A3; tinypool/vitest critical → A3/A2; proxy-addr critical → C1; date-holidays
low → D3; electron-builder chain and typescript-eslint remain pre-existing deferred paths.

**Images (unchanged B0 Dockerfile, candidate context):**

| Image tag | Verified image ID |
|---|---|
| `duely-a1-development:20261110` | `sha256:15bc87a7e5cb7080e216471bda2bd451d23c91deffeae294c58f50e67e7ebf7b` |
| `duely-a1-production:20261110` | `sha256:c06a7398a98371ec1623fc7ceaba2235efb4cc074c773920755d8ed69a998358` |

`measure` proved only the three manifest/lock files changed, all 44 direct installed versions match
the lock, and every reviewed target is installed at its pinned version.

**Gate results:** all 15 gates ran in the A1 development image. The 12 green gates exit 0 (dependency
tree, Playwright 1.64.1, four tsc configs, strict E2E types, lint 0E/8W, four builds, no budget
warnings); the three classified red gates exit 1 as before: units **55F/70P (125)**, Berlin focus
**3F/21P (24)**, E2E **8F/14P (22), 0 skipped/flaky**. Attribution vs B0 is **exact** — identical
failed names (md5 `21fcb83db9ddf496dd1afddc24a40300`, SHA-256
`aa4a992f3774861b15ce58cebb01b91a8bd2dc41ab7111f1a3d731cb98dd5a00`) and identical causes, 73 icon
messages, 17 storage warnings, 0 NG0xxx/NG8xxx, 0 strict-null diagnostics, same six production
CommonJS specifiers, all 22 traces/12 PNGs/6 calendars retained, 4 known console errors, 0 page/network
errors. **0 unexplained regressions.**

**Production smoke:** uid **1000 (`node`)**, compression 1.8.2 installed, no Electron/CLI in
production node_modules, eight 200 responses with `<rac-root>` markup, and the root document answered
**`Content-Encoding: gzip`** — compression 1.8.2's middleware acceptance evidence. Compose's curl
healthcheck remains unchanged/unverified for C1.

**Preservation/handoff:** all 11,145 protected artifacts, historical P0/P1/I1/B0 evidence and the
prohibited notes remain untouched (finalization rechecks them). `.git/duely-a1-20261110-refresh/`
retains frozen input/candidate, registry/audit queries, lock pruning/resolution/review, measured
identity, 15 actual-exit `commands.json` plus logs, `attribution.json`, `quality.json`,
`summary.json`, browser evidence, `production.json`, `integrated.json` and `completion.json` with the
exported `approved-source/`. All session containers exited with `--rm`. **A1 DONE; paused for explicit
A3 + C1 + D3 batch approval**, without staging, commit, push or successor work.

### Lint/export/tooling batch and I3 integration — DONE, 2026-11-10

A5 (ESLint 10.14.0 / `@eslint/js` 10.0.1 / typescript-eslint 8.72.2), D1 (ical-generator 11.1.3 plus the
boundary/ordinal contract repairs) and D4 (sass 1.108.1, tslib 2.9.1, zone.js 0.16.3, `@playwright/test`
1.65.0, esbuild 0.28.2, concurrently 10.0.7, `@types/node` 26.6.6) each ran as an isolated candidate on
its own image. **I3** then integrated them in the approved order onto five paths — the three D1 source
files plus the two manifests — because A5 and D4 carry only the shared CR-1 `appointments.service.ts`
repair, which D1's copy already contains verbatim.

**The target after I3** (kept as history; the current target follows it, §5 keeps the older partitions
as history):

| Metric | I3 integrated value |
|---|---|
| Units (`npm test`, UTC) | **4 failed / 122 passed (126)** over **4 failed / 13 passed files (17)**, failing-name SHA-256 `eb0f981c49e1f5ff180cf8f3f6836ca95d29a0ceec8bc00d6c3d3bb32f90b50d` |
| Focused C/F Europe/Berlin | **3 failed / 21 passed (24)** with the same three names |
| E2E | **20 expected / 2 unexpected**, 0 skipped, 0 flaky, both projects |
| Lint | **0 errors / 7 warnings** (the same `no-deprecated` set) |
| Export contracts | 10 calendars: 2 daily without `EXDATE`, 4 exclusion with exactly one wall-clock value, 2 floating with a bare `DTSTART` |
| Production initial | **2.41 MB / 388.77 kB** gzip, no budget warning |
| Full / production audit | **24 / 4** advisories, dependencies 995 → **946** |

- **Why 48 failures disappear:** D1's repairs make the floating sentinel, empty `EXDATE`, ordinal
  `BYDAY`/`BYSETPOS`, alarm `repeat` and serialised-date expectations pass. The four residual failures
  are the accepted A2 ones outside this batch (2032 holiday oracle, CreatorComponent `saveText`,
  AppointmentForm 22:00, RecurringSettings UNTIL) and stay **red on purpose**.
- **Why E2E improves without a test edit:** the six public export guards in `e2e/app.e2e.spec.ts` flip
  because the production serializer now emits the shapes they assert; the two remaining failures are the
  baseline German Material calendar labels. The four A2 `setHours is not a function` console errors are
  **gone** (console errors 4 → 0).
- **Lock and images:** one lock re-resolved from the A2 seed (`e3ec2aea…`, 996 packages) to
  `6d867cc3…` (947 packages); 165 changed entries = 61 A5 + 2 D1 + 102 D4, 0 unexplained, re-resolve a
  byte-identical fixed point, a single `moment-timezone` 0.6.6. Image
  `duely-i3-development:20261110` = `sha256:b358ac0d17c7c5be8c01c197020fea1605b31c82381aa3d729dfa9e44f9333ae`
  runs Node v26.13.0 / npm 11.20.0 with Playwright 1.65.0 and Chromium 1254; all 646 declared
  `engines.node` ranges accept the interpreter.
- **Accounting:** 86 interaction deltas, **0 unexplained / 0 unused** (51 unit rows, 14 web rows,
  18 artifact rows, 2 build-warning rows, 1 browser row); PNG byte changes are capture noise, proved by
  a second E2E run of the same image. The holiday oracle is delta-free against A2 in UTC and
  Europe/Berlin.
- **Evidence:** `.git/duely-batch-20261110/{a5,d1,d4}/record.json` for the candidates and
  `.git/duely-batch-20261110/i3/` for the integration (`record.json`, `completion.json`,
  `merge-plan.json`, `integrated.diff`, `approved-source/`, lock/audit/oracle reports, 16 command logs,
  E2E results with the control run). Uncommitted and unstaged; **paused for D2 + B12 approval**.

### Date-library migration and D2 integration — DONE, 2026-11-10

D2 replaced Moment with **`date-fns` 4.4.0 + `@date-fns/tz` 1.5.0** — the user's decision, which
supersedes the plan text's Luxon wording after two measured feasibility probes (`ical-generator` 11.1.3
accepts a native `Date`; `@date-fns/tz`/`Intl` offsets agree at Berlin 2126/2200 and in negative,
non-hour and southern zones). It ran as one candidate on its own image and was integrated into the
working tree on 24 paths: 18 client files, both manifests and four new modules (`shared/wall-clock.ts`,
`shared/time-zone-names.ts` + spec, `creator/alarm-trigger.ts`).

**The current target for this working tree** (§5 keeps the older partitions as history):

| Metric | D2 integrated value |
|---|---|
| Units (`npm test`, UTC) | **2 failed / 130 passed (132)** over **2 failed / 16 passed files (18)** — the six new `time-zone-names` tests are added, two D2 repairs leave the red set |
| Focused C/F Europe/Berlin | **1 failed / 23 passed (24)**, only the 2032 holiday oracle |
| E2E | **22 expected / 0 unexpected**, 0 skipped, 0 flaky, both projects; a control run of the same image repeats 22/0/0/0 |
| Lint | **0 errors / 7 warnings** (the same `no-deprecated` lines) |
| Export contracts | 10 calendars line-identical after ignoring generated `UID`/`DTSTAMP`; guard families unchanged |
| Production initial | **2.46 MB / 399.41 kB** gzip, no budget warning (budget still 2.55 MB) |
| Full / production audit | **24 / 4** advisories, dependencies 946 → **948** |

- **Why two failures disappear:** the stale-start guard (`appointment-form.component.ts` re-reads the
  start after the same-month day correction) and the UNTIL hydration guard
  (`recurring-settings.component.ts` → `pickerDayFromWallValue`) are now repaired, in UTC and in
  Europe/Berlin. The residuals are the accepted ones outside the batch; `MAT_DATE_LOCALE` plays no part
  in the unit red set.
- **Why E2E reaches 22/0:** `app.config.ts` provides `MAT_DATE_LOCALE` from the saved language, so the two
  German Material calendar guards see German `aria-label`s. `e2e/app.e2e.spec.ts` is unedited.
- **Date oracle:** 25 instants × 6 zones = 150 offsets checked against `Intl.DateTimeFormat` in the
  Moment image and again in the D2 image (**0** mismatches); the 13 historical Berlin rows, both sides of
  the 2031/2035 transitions, `America/New_York`, `Asia/Kolkata`, `Australia/Lord_Howe`, `Pacific/Kiritimati`,
  `UTC` and three aliases hold; the default UNTIL is a date-only `2126-11-10`; leap projection gives
  `2025-02-28` (+1 y) and `2124-02-29` (+100 y); the four alarm offsets are identical to Moment's,
  including the calendar-day drift across the spring transition.
- **Lock and images:** one lock re-resolved from the I3 seed (`6d867cc3…`, 947 packages) to
  `4e6a0264…` (949 packages): exactly two added entries (`date-fns`, `@date-fns/tz`), none removed, one
  changed (root `dependencies`). The re-resolve is a byte-identical fixed point. The Moment closure is
  exactly `moment` 2.30.1 + `moment-timezone` 0.6.6, owned by `caldate` 2.1.0 under `date-holidays`.
  Image `duely-d2-development:20261110` =
  `sha256:ad2c92221351fc063469f1cf0ed16622668cdfbe3680165107158928671e0eec` runs Node v26.13.0 / npm 11.20.0
  with Playwright 1.65.0 and Chromium 1254; 46 direct versions match the lock and all 646 declared
  `engines.node` ranges accept the interpreter.
- **Payload, measured per file in both images:** distribution tree 15,113,578 → 15,584,276 B (+470,698,
  of which `main.js.map` +353,182 and `main.js` +114,123), ten JS chunks 934,380 → **954,618** B gzip
  (+20,238), production initial 2.41 → **2.46 MB** / 388.77 → **399.41 kB**. No gzip saving is claimed;
  the growth is date-fns' imported format/parse/addYears surface plus `TZDate`, and the production build
  still reports `moment-timezone` through `caldate/src/CalDate.js`.
- **Build/lint/audit:** production CommonJS specifiers are `deepmerge`, `file-saver`, `moment-timezone`
  (the `moment` bailout is gone); 0 lint errors and the same 7 warnings; audit 24 full / 4 production,
  unchanged in composition; no `as any`, `@ts-ignore`, `NO_ERRORS_SCHEMA`, budget or config change.
- **Accounting:** 27 interaction deltas, **0 unexplained / 0 unused** (4 unit/Berlin rows, 2 web stats,
  17 artifact rows — 10 `.ics` files differing only in `UID`/`DTSTAMP` and 7 PNGs —, 2 build-warning and
  2 payload rows), plus 10 explained new attachment copies. The one deterministic German screenshot is
  byte-identical to the control run; the other six PNGs are capture noise proved by it.
- **Evidence:** `.git/duely-batch-20261110/d2/` (`identity.json`, `candidate/`, lock review and
  resolution logs, `measured.json`, `engine-strict.json`, 16 command logs and `commands.json`,
  E2E results with the control run and both reports, the Moment and date-fns oracle dumps plus
  `date-oracle-delta.json`, `ics-semantic.json`, payload dumps with per-file listings, `quality.json`,
  `attribution.json`, `summary.json`, `integrated.diff`, `approved-source/`, `completion.json`).
  Uncommitted and unstaged, 11,145 protected artefacts unchanged; **paused for B12 approval**.

### Desktop protocol, launch and packaging acceptance (B12) — DONE, 2026-11-10

The desktop is no longer launched from `file://`. `electron/main.ts` registers the privileged
`app://duely` scheme before `ready`, installs the handler on `session.defaultSession` after `ready` and
before the window exists, and serves only `GET app://duely/…` from `dist/electron/static/browser`
through `net.fetch(pathToFileURL(…))` so Chromium assigns the media types. Request paths are decoded
once and rejected (`400`) on NUL, backslash, encoded separators or dot segments and on any lexical
escape; the resolved file must also survive `realpath` containment, so a symlink inside the root cannot
be served. A missing file **with** an extension is `404`; a path without one is the SPA route fallback
and returns the same document as `/`. `angular.json` sets `baseHref: "/"`, so the emitted document
carries `<base href="/">` before every script and link for **both** targets — this is what closes
Known Limitations (i.9) without the old `file://` hazard.

The whole acceptance is scripted and Docker-only; nothing runs on the host:

```bash
cd .git/duely-batch-20261110/b12
./run.sh build      # development + production images from candidate/Dockerfile
./run.sh init       # freezes identity against the accepted D2 record (134 files, 4 reviewed paths)
./run.sh measure    # image == candidate, 46 direct versions, Electron/Chromium/ldd facts
./run.sh gates      # 16-command battery, E2E twice, distribution snapshot
./run.sh payload    # per-file distribution listing
./run.sh web        # production image: server, deep paths, base href, assets, dictionaries
./run.sh desktop    # Xvfb + CDP: window, routes, protocol probes, console/network
./run.sh package    # arm64 AppImage + deb into an isolated output, payload and launch checks
./run.sh analyze    # attribute every delta against D2
./run.sh finalize   # copy the measured candidate into the working tree
```

**Container facts this recipe depends on.** `desktop` and `package` run with
`--security-opt seccomp=unconfined`, because Docker's default seccomp profile blocks the namespace
clone Chromium's sandbox performs; that is a container restriction, not an application setting. The app
itself is started **as uid 1000** under its own Xvfb display, never with `--no-sandbox`. Electron ships
`chrome-sandbox` as `0755`; the desktop step arms it `4755 root:root` (SUID sandbox) and proves a root
launch is still refused, while the packaging step applies the deb `postinst` policy (namespace branch
`0755` when `unshare --user true` works, SUID branch otherwise). **Do not use Playwright for the desktop
window:** its launcher appends `--no-sandbox`, which would hide the property under test; the harness
drives the renderer over the DevTools protocol instead. The deb target needs `xz-utils` + `binutils`
and the AppImage inspection needs `zlib1g-dev`, so the development stage installs them.

**Recorded results (image `duely-b12-development:20261110` / `duely-b12-production:20261110`):** 16/16
gates at the expected status — units **2F/130P** (132 in 18 files), Berlin **1F/23P**, E2E **22/0**
twice, lint **0E/7W**, production initial **2.46 MB / 399.41 kB**; desktop **44** checks (800×600,
uid 1000, `--enable-sandbox`, seven route states including the empty-storage redirect and a deep
unknown path, **19** protocol probes, **34** local `app://` requests and **0** HTTP(S) requests);
web **39** checks over the shipped Express build; packaging **24** checks — AppImage **127,595,082 B**
and deb **97,278,640 B**, 25 shipped client files (2,674,968 B) byte-identical to the build, deb control
fields and `postinst`, AppImage unpacked with its own `--appimage-extract`, unpacked tree launched as
uid 1000 (`Seccomp: 2`, `NoNewPrivs: 1`); payload 15,596,974 B (+12,698 B, fully attributed); **26**
explained deltas and **0** unexplained. macOS/Windows packages remain unverified. Evidence:
`.git/duely-batch-20261110/b12/` (`desktop.json` + `desktop-shots/`, `packaging.json` + `packaged/`,
`web.json`, `quality.json`, `artifact-review.json`, `completion.json`).

**Scope update (user, 2026-11-10).** The project does not need AppImage packaging: the `deb` is the
artifact to keep and ship, the AppImage above stays as measured evidence for this record, and a later
batch does not build one without an explicit request. macOS packaging is the deferred task **M1** in
`docs/2026_KNOWN_LIMITATIONS.md` (l); it needs a macOS host, runs interactively with the user, and no
current approval authorizes it.

### Combined-snapshot verification (I4) — DONE, 2026-11-10

I4 rebuilt the **combined** tree instead of merging the two parents: D2's 24 paths and B12's 4 had
already been integrated one after the other, so this battery froze the 134-path working tree and
rebuilt it from scratch (`duely-i4-development:20261110` / `duely-i4-production:20261110`). This is the
snapshot E1 must review; nothing ran on the host and nothing was committed.

- **Source parity:** every gated file is byte-identical to B12's measured candidate. Only four
  documents differ — `README.md`, `docs/TODO_UPGRADES.md`, `docs/TESTING_GUIDE.md` and
  `docs/dep-graph.mmd` — and no gate command reads any of them. The candidate equals the working tree
  file by file, modes included.
- **Same results on the rebuilt snapshot:** 16/16 gates at the expected status, units **2F/130P** and
  focused Europe/Berlin **1F/23P** with the same names, E2E **22/0** twice with an identical
  specification set, lint **0E/7W**, lock `4e6a0264…` and all **46** direct versions equal to B12's
  record.
- **Payload byte-identical:** 15,596,974 B over 53 files with **0** per-file deltas, production
  initial 2.46 MB / 399.41 kB, the same six CommonJS bailout lines. A byte-identical shipped tree is
  why the screenshot differences below cannot be application behaviour.
- **Desktop and web re-proved:** 44 desktop checks (800×600 as uid 1000 **without** `--no-sandbox`,
  `Seccomp: 2` / `NoNewPrivs: 1`, root launch still refused, 7 route states, 19 protocol probes,
  34 local and 0 external requests) and 39 web checks in the production image.
- **Packaging is deb-only, per the scope update above:** 17 checks. `duely_2.0.0_arm64.deb` is
  **97,278,628 B**, 12 B under B12's archive while the payload, control block and 2,855 B `postinst`
  are identical field for field (archive metadata); the unpacked tree launches
  `app://duely/settings` under Electron 45.2.3. No AppImage is built; macOS/Windows stay with M1 in
  Known Limitations (l).
- **Attribution:** 31 deltas and **0 unexplained** — 20 calendars that differ only in generated
  `UID`/`DTSTAMP`, 7 capture-noise PNGs and the 4 documents; 0 payload, unit, web or build-warning
  deltas. Three PNGs are fresh control-run noise; the other four already differed between B12's own
  run and its control run (two oscillate between two states), so they are renderer capture, not
  behaviour — every assertion on those pages passes and the payload is byte-identical.
  `diff-crops/` keeps the differing regions.
- **Evidence:** `.git/duely-batch-20261110/i4/` (`identity.json`, `candidate/`, `measured.json`,
  16 command logs plus `commands.json`, both E2E runs with reports and `e2e-results/`,
  `dist-electron.json`, `payload-files-i4.json`, `desktop.json` + `desktop-shots/`, `web.json`,
  `packaging.json` + `packaged/` and `packaging-postinst.sh`, `quality.json`, `attribution.json`,
  `summary.json`, `diff-crops/`, `integrated.diff`, `approved-source/`, `completion.json`).
  Uncommitted and unstaged, 11,145 protected artefacts unchanged;
  **paused for E1 approval**.

### Risk-focused review and runtime verification (E1) — DONE, 2026-11-10

E1 reviewed the I4 snapshot instead of rebuilding it: `init` re-verified all 134 paths against
`i4/identity.json` and proved the image source equals the I4 candidate file by file, with the two
documents I4 wrote after its own finalize as the only drift. Nothing was committed or staged.

- **Review verdict:** one read-only reviewer covered the four risk areas in a single pass — protocol
  boundary, ICS/date semantics, long-range time zones and installer/override choices — with **0 critical
  and 0 high** findings. `review-findings.json` holds the evidence and states what was not covered: no
  historical visual matrix, no macOS/Windows artifact, and no advisory or container scan (E2).
- **One medium finding, repaired in E1a:** a new appointment inherited a stored legacy time-zone alias
  (`US/Eastern`) from Settings, but the advanced-settings select was built for `floating` on
  `ngOnChanges` and never rebuilt on `ngOnInit`, so the alias had no matching option. The value was kept
  and exported unchanged (`TZID=US/Eastern`); before D2 the select listed `moment.tz.names()`, aliases
  included. `ngOnInit` now sets the stored zone first, rebuilds the list for it and creates the form with
  that value, and a regression spec stores the alias and asserts the option, the selected value and the
  unchanged appointment model.
- **Gates unchanged:** 16/16 at the expected status — units **2F/130P**, focused Europe/Berlin
  **1F/23P**, E2E **22/0** twice, lint **0E/7W** — and no gate command changed a source file.
- **Real desktop interactions, 87 checks at 800×600:** English and German label sets from the
  dictionaries, save of `de` + `Europe/Berlin` surviving a reload, cancel discarding an unsaved
  `America/New_York`, switching to `en` + floating, filling the form, expanding recurrence from `NEVER`
  to `DAILY`/`COUNT 3`, a floating export of `DTSTART:20320405T090000` / `RRULE:FREQ=DAILY;COUNT=3;
  INTERVAL=1`, a second form added and removed, a named-zone export with
  `DTSTART;TZID=Europe/Berlin:20320405T090000` and `DTEND;TZID=Europe/Berlin:20320405T100000` and no
  floating start, and clicked `legal`/`about`/`/` lazy routes — with 34 local and **0** external
  requests. The window ran as uid 1000 without `--no-sandbox`, the helper is `4755 root:root`, the
  renderer carries `--enable-sandbox`, and a root launch is still refused (status 133).
- **Behaviour the run documented rather than changed:** `MAT_DATE_LOCALE` is resolved when the first
  date picker is created, so a language change needs one reload before typed dates parse as `en-US` (the
  export proves the parsed day); the named-zone export emits `TZID` parameters without a `VTIMEZONE`
  block, the accepted residual behaviour; and the remove button's click bubbles to the card-header
  toggle, collapsing the survivor — the same template at `HEAD`, with removal itself leaving one
  appointment and no remove button.
- **Manifest reconciliation:** all three manifests accept the measured build runtime (Node 26.13.0 / npm
  11.20.0). Electron 45.2.3 embeds Node 24.22.2 / Chromium 156.0.8078.80, which `engines` neither covers
  nor can cover — the embedded runtime is pinned by the `electron` devDependency — while the packaged
  main process requires only `electron`, `fs`, `path` and `url`, all present in that runtime, and
  targets ES2022. The root lock covers the root manifest only; `server/` and `electron/` are not
  workspaces (`manifests.json`).
- **Sandbox provenance:** the `Seccomp: 2` / `NoNewPrivs: 1` values in the I4 note come from the unpacked
  deb's renderer (`i4/packaging.json`, `rendererSandbox`), not from the development launch that
  `i4/desktop.json` records. E1's run adds the development-side proof — `4755 root:root` helper,
  `--enable-sandbox` on the renderer process, a root launch refused with status 133 — so the packaged and
  the development launch are each covered, by different runs.
- **E1a repaired both actionable findings:** the alias list/control above, and `electron/package.json`
  `build.linux.target` reduced to `["deb"]`, the only artifact every measured build ships. 8/8 gates at
  the expected status — units **2F/131P** over the same `2F/16P` files, Berlin 1F/23P, E2E **22/0**, lint
  **0E/7W** — with the three failing attempts kept beside the passing run (an `any` in the new spec, a
  wrong expected file count in the runner, a one-shot write collision).
- **Platforms and evidence:** Linux arm64 in the container images is tested; macOS (Known Limitations
  (l)) and Windows stay unverified. Evidence in `.git/duely-batch-20261110/e1/` (`identity.json`,
  `identity-gates-image.json`, `image-rebuild.json`, `protected-before.json`, `measured.json`,
  `manifests.json`, 16 gate logs with `commands.json`/`gate-status.json`, `dist-electron.json`, both E2E
  runs with reports and `e2e-results/`, `desktop.json` + `desktop-shots/`, `review-findings.json`,
  `completion.json`) and `.git/duely-batch-20261110/e1a/` (`gate-status.json`, eight gate logs,
  `repair.json`, `completion.json`, the failing attempts). 11,145 protected artefacts unchanged;
  **E2 next**.

### Clean reproduction and final audit (E2) — DONE, 2026-11-11

E2 rebuilt everything instead of trusting the earlier images: the accepted working tree was frozen into a
`source/` directory (the same 134 paths, 1,377,560 B, HEAD `1546c4ff`, 61 modified paths, nothing staged),
and both images were built from it with `docker build --no-cache`. The image build is therefore the fresh
peer-respecting install, and `identity` proves it file by file: every one of the 134 source files matches
the image, `RUN npm ci` appears in the builder and development stages with no `.npmrc`, no
`--legacy-peer-deps` and no `--force`, `npm config get legacy-peer-deps` reads `false`, and only the two
known install deprecations (`boolean@3.2.0`, `rimraf@2.6.3`) are reported. The development stage installed
800 packages in 46 s and Playwright 1.65.0 with Chromium 158 in 104 s; the production stage installed 117
packages.

- **Gates 16/16 at the expected status:** units **2F/131P (133)** over **2F/16P (18)** with exactly the
  two accepted failing names, Europe/Berlin **1F/23P (24)**, E2E **22/0** twice, lint **0E/7W**, negative
  control 2, and no gate mutated a measured file.
- **Distribution:** 31 files / 2,766,079 B against I4's 2,766,019 B. The drift allowlist holds: only
  `package.json` (−21 B, the E1a `["deb"]` target) and `static/browser/*` (main +81 B, two renamed lazy
  chunks) moved; `index.js`, `index.js.map` and the Node-side bundles are byte-identical.
- **Payload listing (`payload`):** the same 53-file development listing I4 measured, 15,597,528 B
  (+554 B), reproduced in a container whose `dist/` started empty. The only moved files are
  `server/static/browser/main.js` and `main.js.map` — the component E1a changed; every other file keeps
  both its byte count and its gzip size, which is what pins them to the accepted content.
- **Packaging (`manifests`):** `electron/package.json` declares the deb only, `electron-builder` produces
  exactly `duely_2.0.0_arm64.deb` (97,278,672 B) plus its own artefacts and no AppImage, the control
  fields are duely/2.0.0/arm64/MPL-2.0 with the accepted `Depends`, the shipped client tree and bundle
  are the ones this container built, and the `postinst` is byte-identical to I4's. The step also asserts
  one node per declared dependency for all three manifests and that `docs/dep-graph.mmd` matches.
- **Audits:** full tree `0C/4H/17M/3L = 24`, identical to the accepted I3 set, the four highs being
  transitive tool findings; `--omit=dev` `0C/0H/1M/3L = 4`; the audit inside the production image also
  `0 critical / 0 high`. Both overrides remain effective (single hoisted `glob@14.0.4`, `tar@7.5.22`).
- **Container scan:** trivy on the production image reports **0 critical** and 54 high — 48 Debian
  base-package rows and 6 in `undici@6.28.0`/`brace-expansion@5.0.9` under
  `/usr/local/lib/node_modules/npm`, i.e. inside the base image's npm, not in the shipped dependencies.
  `docker scout` needs a Docker ID login here and its refusal is recorded next to the trivy output.
- **Server smoke:** the production image answers HTTP 200, recorded with its image ID.
- **Evidence:** `.git/duely-batch-20261110/e2/` — `snapshot.json` + `source/`, `identity.json`,
  `build-development.log`, `build-production.log`, `gate-status.json` + 16 gate logs + `commands.json`,
  `dist-electron.json`, `manifests.json` + `packaging-builder.log` + `packaged/`, `payload-files-e2.json`,
  `audits.json` + both audit JSONs, `audit-deployed-server.json`, `scan-production.json`/`.log`,
  `scan-scout-probe.log`, `server-smoke.json`/`.log`, `completion.json`, and the attempt directories that
  keep each harness mistake beside its passing run. The finalize records 62 modified paths — the 61 it
  froze plus `INSTALL.md`, which E2 itself corrected — with nothing staged. **R1 next.**

---

## 5. The baseline contract (must not move without authorization)

The last full-suite migration run reported the partition below. Commit `74a271d` subsequently changed
holiday fixtures and the failing CollisionDetector test title from 2017 to 2032; its focused Docker
run stayed **1 failed / 2 passed**, and spec type-checks passed. The full suite and failing-name hash
were **not** remeasured at that fixture-refresh checkpoint. The subsequent authorized P0 full run
is recorded separately in §4. Preserve the migration counts/hash as historical evidence; the renamed
test cannot match the old failing-name list verbatim.

The explicitly approved I1 task integrated P1 and established the **current 55F/70P unit and
8F/14P E2E baseline**, reproduced exactly by B0's clean images and again unchanged by A1's patched
images in §4. Preserve that classified failure set unless separately authorized work
changes it, and account for names **and causes**, not just totals. The following migration/P0 partition
is retained **as historical evidence**, not the current main-tree gate target:

> **Superseding note (A3 → I2 → A4 → A2, 2026-11-10).** The authorized Angular 21/Vitest 4 batch moved the
> unit baseline: the working tree now runs **52 failed / 74 passed (126)** over **5 failed / 12 passed
> files (17)** with the same failure names and causes, the focused C/F Europe/Berlin selection stays
> **3F/21P (24)**, E2E stays **8 unexpected / 14 expected** with 0 skipped/flaky, lint stays
> **0 errors / 7 warnings**, and the harness emits **73** `Error retrieving icon` messages because more
> specs execute. A4 (Angular 22 / TypeScript 6) reproduced every one of those numbers exactly, and A2
> (Vitest 5.1.0 / jsdom 31.0.0) reproduced them again with a byte-identical failing-name set while
> removing the per-worker storage warnings (**13 → 0** for the full suite, **3 → 0** in the focused
> run). Treat 55F/70P as the A1-era record, not as the target for a current Docker run; re-derive
> failing names against the current tree with §7's recipe.
>
> **Superseded again by I3 (2026-11-10).** The approved lint/export/tooling batch changed the target:
> units are **4 failed / 122 passed (126)** over **4 failed / 13 passed files (17)** with names hash
> `eb0f981c…` (48 A2 failures repaired, none added), focused Europe/Berlin stays **3F/21P (24)**, and
> E2E is **20 expected / 2 unexpected** (0 skipped/flaky) because the six public export guards now pass
> without any `e2e/app.e2e.spec.ts` edit. Lint stays 0E/7W, the holiday oracle is delta-free in UTC and
> Europe/Berlin, and the worktree now runs Playwright 1.65.0/Chromium 1254 in
> `duely-i3-development:20261110`. Use the §4 I3 table as the live target.
>
> **Superseded once more by D2 (2026-11-10).** The date-library migration repaired the stale-start and
> UNTIL-hydration guards but added six `time-zone-names` tests, so units are now
> **2 failed / 130 passed (132)** over **2 failed / 16 passed files (18)**, focused Europe/Berlin is
> **1F/23P (24)**, and E2E is **22 expected / 0 unexpected** (0 skipped/flaky) with an identical control
> run. Use the §4 D2 table as the live target.

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

## 6. Historical migration/P0 partition — 24 deferred failures

This table preserves the pre-P1 diagnosis, not current test/source coverage. P1/I1 added executing
guards and repaired the collision assertion loops; B0 reproduces the 55-name baseline in §4.
All original 24 failed names remain loud, classified and deferred. Phase 6's `TranslateStore` repair unmasked the 19
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

The strongest form of the baseline contract is a sorted list of failing test **names**, with their
causes, compared against the applicable approved capture. Current A1 uses
**`.git/duely-a1-20261110-refresh/failing-names.txt`** (55 normalized names, byte-identical to B0's and
the retained I1 capture; §4). Do not compare
current main tests to the historical 24-name file as though no test integration had been approved.
The historical capture remains at **`.git/duely-failing-names-baseline.txt`**. It is durable via the
`.:/app` bind mount but **not committed** or portable to another checkout. The historical md5 is
`172d78996b50c84e38211b529d76ab0b`; preserve an existing baseline instead of overwriting it.
Commit `74a271d` intentionally renamed the failing holiday test to 2032 (§5), so the old names are
not a current exact-match oracle. P0's separately authorized full-suite capture (§4) recorded only that known rename and established
`fa0bdd93490bc4cbdf2103d7a63878fe` in its task-specific file, without replacing this historical baseline.

### Historical capture recipes (preserved; select the current approved baseline first)

Bare `npm test` uses the Docker test setup without a manual environment variable.
Node 26's `localStorage` getter previously broke storage specs; **`vitest.setup.ts`**,
registered under `setupFiles` in `angular.json`, restores jsdom's storage globals before specs run
(§9). Since A2 (Vitest 5.1.0) the runner installs that storage itself and the setup file is a guard, so
this is not a guarantee for arbitrary future Node or runner majors — re-run §9's checks when either
moves. Do not pass `-e NODE_OPTIONS="--localstorage-file=…"`: it would mask a broken or missing setup
file.

After confirming that no baseline file exists, capture it once:

```bash
(
  set -C
  docker compose run --rm duely-dev npm test 2>&1 \
    | grep -aE '^[[:space:]]*FAIL[[:space:]]' \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
    | sort -u > .git/duely-failing-names-baseline.txt
)
```

`set -C` prevents overwriting an existing baseline. Check the full test result, the expected name
count and independently computed md5 before accepting the file; an empty/truncated capture is not
valid. The historical capture had **24 lines**; account explicitly for authorized changes (§5),
including the 2032 title, instead of requiring an obsolete hash or silently rebaselining.
`grep -a` preserves textual extraction if captured output contains NUL bytes.

### The diff command (must be empty against an established current baseline)

```bash
docker compose run --rm duely-dev npm test 2>&1 \
  | grep -aE '^[[:space:]]*FAIL[[:space:]]' \
  | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
  | sort -u > .git/duely-failing-names.txt
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

The working command matches only `^[[:space:]]*FAIL[[:space:]]`. P1's `expect.soft` guards can emit
multiple detail lines for one failed test (15 in C; four details for two failed F tests), so `sort -u`
deduplicates names. Require the unique-name count to equal the actual test reporter's failed-test
count; inspect every associated cause and preserve actual process exits. Historically, **24 unique
stable detail names** were byte-identical run to run. Reproducibility was verified: two consecutive fresh
`docker compose run --rm … npm test` captures produced byte-identical 24-line output (`diff` empty).

The historical 24 captured names are the failures partitioned in §6 — 1 CollisionDetector, 19
AppointmentsService, 1 CreatorComponent, 1 ElectronStorageService, 2 WebStorageService. I1 preserves
all of those and adds the two form and 29 public-export failed names (§4). Its normalized extractor
also collapses internal whitespace and strips ANSI/NUL; apply the same normalization before diffing
against I1. Keep every prior capture and write a new task-specific file for an authorized successor.

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

- The `duely-dev` service builds Dockerfile's `development` target, now **`node:26-slim`** after B0
  (Node 26.13.0/trixie measured). The old floating `node:lts-slim` crossed Node majors historically.
  Compose bind-mounts `.:/app`, keeps `node_modules` as an anonymous volume, and declares ports
  `8000`, `4200`, `49152`; one-shot `run` needs explicit port publication. Upgrade gates use isolated
  task-specific images/outputs instead of that main-tree bind mount (§2).
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

**Running the full E2E suite** (22 executions across both projects since I1; B0 reproduces 8F/14P):

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

Static images and the historical 16 passing E2E executions do not prove the full functional matrix.
P1W replaced the conditional nonexistent selector, collision logging and filename/panel-only checks
with real semantic guards; separately approved I1 integrated them. B0's clean images reproduce
8F/14P across both projects (§4). Production defects remain attributable, not repaired or waived.

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
- **44 `Error retrieving icon duely:*` lines.** Cosmetic and expected (§5). Count the error message,
  not every line containing `icon`: stack frames doubled the historical broad-match count to 88.
  Do not "fix" by adding `provideDuelyIcons()` to TestBeds.
- **Watch builds appear unchanged.** Verify a temporary executable source change, not a comment-only
  edit that emits identical bytes; restore only your own probe. `build:watch` watches Node bundles,
  not the Angular client (README, Commands overview).
- **Build output appears stalled.** Run one build per target with plain-progress output; a buffering
  output pipe or Docker-client CPU usage does not establish Docker-VM progress. Inspect build logs
  before launching a duplicate build or discarding useful cache.
- **Type-aware `eslint --fix-dry-run` cascades.** The historical run mixed in-memory fixes with an
  on-disk TypeScript Program. Verify the intended on-disk edits with normal lint before treating
  dry-run-only cascades as new source defects.
- **Custom browser harness fetch/selection differs.** Check `localhost` IPv4/IPv6 resolution against
  the server binding (the recorded Node-fetch workaround used `127.0.0.1`). A `mat-option` property
  binding need not appear as an HTML `value` attribute; assert the actual option selection/value.
- **`npm run test:e2e` cannot start / hangs.** Verify the port alignment: `playwright.config.ts`
  `webServer[0].url` must match the dev server's actual port (4200), and `webServer[1].url` must
  match Express (8000). If a port is occupied, identify its owner rather than killing an unrelated
  process; stop only the verification server you created.
- **Playwright: "browser not found".** Should not occur — Chromium is baked into the `duely-dev`
  image at build time. If you see this, the image is stale: run `docker compose build duely-dev`
  to re-provision. Verify with `docker compose run --rm duely-dev npx playwright --version`
  (expect 1.64.1) and `docker compose run --rm duely-dev ls /root/.cache/ms-playwright/`.
- **`npm test` suddenly fails ~37 extra specs with `TypeError: Cannot read properties of undefined
  (reading 'getItem')` in `StorageService.loadSettings`.** **FIXED 2026-11-01 and RE-PROVED BY A2 —
  this should no longer happen.** Cause, for the record: Node ≥ 26 defines an experimental
  `localStorage` getter on `globalThis` that returns `undefined` unless `--localstorage-file` is passed,
  and the Vitest 3.2.4 jsdom `populateGlobal` copied a window key only when it was absent from the Node
  global or allowlisted (`LIVING_KEYS`/`OTHER_KEYS`); neither storage key was allowlisted, so jsdom's
  working implementations were never installed. It was a Node-major artefact of the floating
  `node:lts-slim` base, never a suite regression. The original repair was **`vitest.setup.ts`**,
  registered under `setupFiles` in the `test` target of `angular.json`, reading the real jsdom window
  Vitest created (`globalThis.jsdom.window` — *not* `window`, which `populateGlobal` aliases back onto
  `globalThis`) and re-installing both storage globals. **Since A2 (Vitest 5.1.0) the allowlist itself
  contains both keys**, so jsdom's storage is installed before setup files run and the setup file takes
  its already-installed branch; A2 kept the file as a capability guard and proved it non-load-bearing
  (probe and storage/FileSaver/locale surface pass with and without `setupFiles`; the full suite without
  it reproduces the same 52 failure names). If the symptom returns, check in this order: (1) the
  `setupFiles` entry still points at `vitest.setup.ts`; (2) `vitest.setup.ts` still exists at the repo
  root; (3) the installed Vitest still allowlists both storage keys and still exposes `globalThis.jsdom`
  (A2's `vitest-environment.json` records the chunk and counts). Do **not** reach for
  `-e NODE_OPTIONS="--localstorage-file=…"` — that workaround was rejected because it breaks the
  project's zero-manual-steps property and would mask a broken setup.
- **~32 lines of `ExperimentalWarning: localStorage is not available because --localstorage-file was
  not provided` on stderr.** **HISTORICAL — 0 such lines since A2.** They appeared once per forked
  worker because the old setup file read Node's inert getter to detect the shadowing (13 blocks in the
  full suite, 3 in the focused run under A4). Vitest 5.1.0 installs jsdom's storage before setup files
  run, so nothing reads that getter and the block disappears; the counts did not move. If the block
  returns, it means something is reading `globalThis.localStorage` *before* the environment is
  installed — investigate rather than ignore.
- **`Error: N calls in "<file>" were defined outside of the module's top level scope` at transform
  time, pointing at correctly top-level `vi.mock`/`vi.hoisted` calls.** Vitest 5.1.0's mock-hoisting
  validation false-positives under the Angular builder when the same spec file also contains an **async
  arrow function**. Do not move or disable the mocks: move the awaited assertions into a module-level
  `async function` and let the `it` callback return it (both `storage/*.service.spec.ts` files do this).
  Async function declarations and expressions pass; async arrows fail. See Known Limitations (b.14) for
  the measured matrix and the release check that would retire the workaround.
- **A container is still listed by `docker ps` after a run.** Identify ownership first; stop only
  a container created for this verification. Never stop unrelated containers or use blanket shutdown.

---

## 10. Related documents

- [Known Limitations](2026_KNOWN_LIMITATIONS.md) — current diagnosis/disposition of deferred test/date
  work (a), harness-only icon warnings (b.2), other accepted/deferred work (b)–(j), and verification gaps (k).
- [README](../README.md) — current standalone, layout/theme/icon and Settings development guidance.
- [Installation](../INSTALL.md) — Docker setup, build-output/runtime paths and licence artefact distribution.
- [Upgrade task board](TODO_UPGRADES.md) — P0/P1/I1/B0 results, the integrated I2 + A4 + A2 baseline,
  the A5 + D1 + D4 checkpoint, downstream contracts and the timezone oracle.

The completed migration task board and local STATE handoff were consolidated and retired on
2026-11-09; their remaining issues live in Known Limitations. Tracked implementation history remains
in Git, but the git-excluded session records were never tracked and cannot be recovered from Git.
