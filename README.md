# Duely

Duely creates recurring appointments, filters national holidays and exports iCalendar (`.ics`)
files for calendar applications. The web application uses Angular 22 standalone components and
Angular Material 3 design tokens. The Electron desktop build serves its bundle from the privileged
`app://duely` origin and was launched and exercised on Linux arm64, development and packaged, in the
Testing Guide §4 runs (B12, E1); desktop storage and the save dialog are still unimplemented
([Known Limitations](docs/2026_KNOWN_LIMITATIONS.md#f-electron-desktop-storage--unresolved-deliberately-deferred)).
macOS and Windows are outside the verified platform scope (Known Limitations (d.6)).

## Getting started

Install Git and Docker with Docker Compose. All dependency installation, builds, linting, type-checks
and tests run inside Docker, never on the development host. All three manifests require Node `^26.0.0`
and npm `^11.20.0`, and every `Dockerfile` stage starts from `node:26-slim`; the container measured for
the final audit ran Node 26.13.0 with npm 11.20.0. Python 2 and `windows-build-tools` are not
prerequisites.

From the repository root:

```bash
docker compose build duely-dev
docker compose run --rm --service-ports duely-dev \
  npm run serve -- --host 0.0.0.0
```

Open `http://localhost:4200`. Stop the foreground server with Ctrl+C. If Docker is unavailable,
stop rather than falling back to host execution. See [Installation](INSTALL.md) for production
containers and build outputs, and [Testing Guide](docs/TESTING_GUIDE.md) for verification commands.
There is no verified browser/desktop OS support matrix: the missing browser-target policy is
recorded in Known Limitations (b.6), the measured platform scope — Linux arm64 only — in (d.6).

## Commands overview

Run npm scripts as `docker compose run --rm duely-dev npm run <script>`.

| Script | Action |
|---|---|
| `build` | Development server bundle/client plus Electron main-process bundle; skips Electron static files/manifests |
| `build:prod` | Production server and Electron bundles, clients and manifests |
| `build:watch` | Initial development build, then watch the two Node-side bundles; does not watch the Angular client |
| `build:server` / `build:server:prod` | Server bundle, Angular client and server manifest in the selected mode |
| `build:electron` / `build:electron:prod` | Electron main bundle, Angular client and desktop manifests in the selected mode |
| `serve` | Angular client hot reload on port 4200, served from memory rather than `dist/` |
| `clean` | `npm prune` followed by removal of generated `dist/`; not a routine rebuild prerequisite |
| `lint` | ESLint source/template checks |
| `test` / `test:watch` / `test:coverage` | Vitest once, in watch mode, or with coverage through `@angular/build:unit-test` |
| `test:e2e` | Playwright against both the dev server and built Express server |
| `start:server` | Start the previously built Express application |
| `start:electron` | Launch the previously built Electron application; verified on Linux arm64 only (Testing Guide §4) |

The build orchestrator is `scripts/build.mjs`: esbuild's Node API produces CJS server/Electron
bundles, and `@angular/build:application` produces the Angular client. `build:watch` watches
`server/app.ts` and `electron/main.ts`; use `serve` for client hot reload. Generated static output
is cleaned during a build and `browser/index.html` is asserted, so do not put hand-maintained files
in `dist/`. Diagnostic Angular builds should use a temporary output path (Testing Guide §4).

### Dependency graph

`docs/dep-graph.mmd` is generated, never hand-edited: `scripts/dep-graph.mjs` reads the root,
`electron/` and `server/` manifests and emits a Mermaid `graph TD` linking each manifest to its
runtime and dev dependencies, with a separate section for packages that appear in more than one
manifest. Regenerate it in the dev container after changing any of those manifests; the `duely-dev`
service bind-mounts the repository, so the file is written into the working tree on the host:

```bash
docker compose run --rm duely-dev node scripts/dep-graph.mjs --output docs/dep-graph.mmd
```

Drop `--output docs/dep-graph.mmd` to print the graph to stdout instead, which is the way to review
a change before overwriting the committed file. The script uses only Node built-ins, so it needs no
installed dependencies and no prior build; it reads the manifests alone, so the edge labels show
declared ranges, not the resolved versions in `package-lock.json`.

## UI development

### Layout

`client/styles/_layout.scss` defines seven shared structural classes, composed as
`class="page stack"` or `class="card stack"`. Screen-specific styling stays in component SCSS.

| Class | Purpose |
|---|---|
| `.page` | Centred container, `width: min(100% - 2rem, 960px)` |
| `.card` | Padded content surface; its hardcoded white background is a known dark-mode limitation |
| `.field-row` | Label/control row, stacked below the 599.98px breakpoint |
| `.field-cluster` | Wrapping sibling controls |
| `.pattern-grid` | Intrinsic grid, `repeat(auto-fill, minmax(8rem, 1fr))` |
| `.actions` | Right-aligned wrapping button bar |
| `.stack` | Vertical layout with consistent gaps |

Do not restore Bootstrap's grid/utility vocabulary or extra wrappers for structures these classes
already cover. The navbar is in document flow; routed pages do not need fixed-navbar clearances.

### Theme and icons

- `client/_palette.scss` maps accent names to raw colours. Keys match `settings.color` exactly:
  `red`, `green`, `blue`, `orange`, `violet`, `pink`, `darkgreen`, `darkblue`.
- `client/styles/_theme.scss` establishes light/dark M3 tokens with `mat.theme()` and applies brand
  colours with `mat.theme-overrides()`. `primary` in `mat.theme()` must be a palette map; raw hex
  belongs in overrides. Configuration keys are `theme-type`, `plain-family` and `brand-family`.
  Use inline typography configuration rather than the deprecated typography/density helpers.
- `ThemeService.apply()` copies persisted `settings.color` / `settings.themeMode` to `<html>`
  `data-color` / `data-theme`. The inline head script in `client/index.html` sets the same attributes
  before bundle parsing to avoid a wrong-theme flash. Component SCSS should consume `--mat-sys-*`
  tokens; accepted hardcoded-colour/contrast defects are recorded in Known Limitations (i).
- Styles use Sass `@use`, not `@import`. Material components supply their structural CSS; the theme
  does not call `all-component-themes()`. Fonts use the system stack, with no external font download.
  Do not run `ng add @angular/material` over this setup: its schematic can rewrite the custom theme,
  entry HTML and build configuration.
- `client/app/shared/icons/duely-icons.ts` contains eight bundled SVG literals. `provideDuelyIcons()`
  registers them through `addSvgIconLiteralInNamespace`, used as `svgIcon="duely:add"`. Literal
  registration avoids HTTP/font fetches under offline conditions and on the privileged `app://duely`
  origin the desktop build serves from. The sanitizer trust applies only to first-party build-time
  literals, never user-supplied SVG.

To add an accent, add its colour and map entry in `_palette.scss`, the option in
`settings.component.html`, and the label in **both** locale JSON files. Add swatch helper classes
only if needed. `_theme.scss` generates both theme selectors automatically; verify generated CSS
and appearance in Docker. EN/DE key sets must remain identical.

### Standalone components and model invariants

All ten components are standalone. Import Material modules from their subpath entry points (for
example `@angular/material/button`), and list the directives/pipes/modules used by the template in
its component `imports`. Router symbols come from `@angular/router`, forms from `@angular/forms`,
and translation from `@ngx-translate/core`. Shared application providers belong in `app.config.ts`;
TestBed conventions are in Testing Guide §3. Template-visible members must be public or protected.
Use `@if`, `@for` with a stable `track`, and `@switch` for control flow.

Preserve strict compiler, template and injection checks. Do not suppress diagnostics with `as any`,
`@ts-ignore`, `NO_ERRORS_SCHEMA` or `CUSTOM_ELEMENTS_SCHEMA`, replace required-value assertions with
optional chaining, or widen fields merely to dodge initialization errors. Holiday `getStates()` /
`getRegions()` results legitimately allow `undefined`; preserve that distinction.

The creator forms still use load-bearing reactive-form/`ngModel` dual bindings. Do not remove them
without explicit model/form synchronization and exported-ICS coverage (Known Limitations (a.9)).
The recorded UNTIL OnPush update relies on `NgModel._updateValue()` marking the view, not on
`FormControlName`; removing that binding also requires explicit change-detection notification.
Keep explicit recurrence-view notifications after parent-driven `updateRepeatsBy()` calls, not
inside that method: `ngAfterViewChecked()` also calls it, so an unconditional mark there would
repeatedly dirty the view during change detection.
`AlarmSettingsComponent` deliberately aliases `this.alarms` to `this.appointment.alarms`; a copy or
fallback array can lose model updates from `addAlarm()`.

The migration's date/timezone repairs corrected live `UNTIL`/`DTEND` values; migration completion
is not a claim of byte-identical exported ICS before and after those repairs.

### Adding a Settings field

1. Add a default to `StorageService.settings` and, for a string-valued field, an entry to
   `loadSettings()`'s `stringKeys`. The loader uses `Object.prototype.hasOwnProperty.call` and
   `normalizeString`; missing or wrongly typed values leave the current value/default intact.
   Read normalized settings, not the parsed storage object directly.
2. Add the control in `SettingsComponent.createForm()` and convert between persisted/control
   representations explicitly. For example `themeMode` persists `'light'` / `'dark'` but its
   slide-toggle control is boolean. Persisted `timeZone` maps to the control named `timezone`.
3. Add labelled markup, layout classes and any required Material subpath imports. Use
   `<select matNativeControl>` for long location/timezone lists, `<mat-select>` for short fixed
   lists, `matInput` for text, `mat-slide-toggle` for booleans and `mat-datepicker` for dates.
4. Include the key in the **complete** object written by `save()`, converting back as needed.
   `saveSettings()` replaces the whole persisted blob; an omitted key is lost from storage.
   Cancel must only navigate home, without writing an empty settings object.
5. Keep appearance/language side effects beside the existing `theme.apply()` /
   `translate.use(settings.language)`, before navigation, and add label keys to both locales.
6. Verify type-checks, the deferred unit-test partition and locale parity in Docker (Testing Guide
   §§4–7), then exercise save/reload/cancel and rendering in both locales in a browser.

## Deployment

See [Installation](INSTALL.md) for the production container.

`build:electron:prod` emits `dist/electron/` — the runnable Electron bundle with its runtime
`package.json`, `manifest.json` and `LICENSE` — not an installer. Installers are produced by
electron-builder 26.18.1 from the build configuration in `electron/package.json`. Only the Linux arm64
path is verified; package it in the development container on an arm64 host:

```bash
docker compose run --rm duely-dev npm run build:electron:prod
docker compose run --rm duely-dev npx electron-builder --projectDir dist/electron \
  --linux deb --arm64 --publish never
```

The artifacts land in `dist/`, because the manifest's `directories.output` is `../`. The `deb` is the
package to ship; AppImage is not a project requirement. The `deb` target needs `xz-utils` and
`binutils`, which the development stage installs. The packaged application starts on `app://duely`
with the Chromium sandbox enabled, reads both locales from the bundled dictionaries and runs offline;
the acceptance procedure and its measured results are in Testing Guide §4 (B12). Desktop storage and
the save dialog are still unimplemented: Known Limitations (f).

macOS packaging is unverified and cannot be produced in the Linux container; it is a separate,
user-started task (M1 in [the upgrade task board](docs/TODO_UPGRADES.md)). Windows is unverified as
well.

Keep the complete third-party licence artefacts when distributing builds. The measured `deb`
installs the repository `LICENSE` inside `resources/app`, the Angular build's generated
`resources/app/static/3rdpartylicenses.txt`, and the runtime notices `LICENSE.electron.txt` and
`LICENSES.chromium.html` at the package root. A package that copied only `static/browser/` would
drop the generated notices, which sit one level above the served root (Known Limitations (b.5));
the production container copies all of `dist/server` and keeps them.

## Contributing

This repository has no contribution guide. The working rules are the [Testing Guide](docs/TESTING_GUIDE.md)
(§2 keeps every install, build, lint, type-check and test command in Docker; §3 the test layout) and
the upgrade task board's standing constraints. Git history and tags preserve completed migration
records; open or accepted items live in [Known Limitations](docs/2026_KNOWN_LIMITATIONS.md), not a
separate migration plan/reference. Dependency-upgrade work is tracked in
[the upgrade task board](docs/TODO_UPGRADES.md).

## Versioning

`package.json` and `package-lock.json` are authoritative for declared and resolved versions; this
document repeats no version table. Most direct dependencies are pinned to exact versions. `esbuild`
is one of them and must stay exact: `scripts/build.mjs` uses its `context()` / `watch()` /
`rebuild()` API, whose watch behaviour differs between releases, so review that script when changing
the pin. Only `rxjs`, `zone.js`, `file-saver`, `ts-node` and the `@types/*` packages use `^` or `~`
ranges, and the root `overrides` keep `glob` and `tar` on a single hoisted version each.

## Authors

- Till Affeldt
- Marlen Bernier
- Mike Kenneth Braun
- Frederik Kammer
- Lars Richard
- Hendrik Eggers

## Notice about standard conformity

The timezone export does not conform to "RFC 5545 3.2.19. Time Zone Identifier". `ical-generator`
carries no timezone database and emits a `VTIMEZONE` component only when an external generator such
as `@touch4it/ical-timezones` is configured; Duely configures none. A named-zone export therefore
references `DTSTART;TZID=Europe/Berlin:…` without defining that zone and adds the non-standard
`TIMEZONE-ID` and `X-WR-TIMEZONE` properties instead. Re-verified against `ical-generator` 11.1.3
with the output recorded by E1 (Testing Guide §4). This is accepted residual behaviour: changing it
needs that extra generator and new export coverage, not a documentation edit.

## License

[Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
