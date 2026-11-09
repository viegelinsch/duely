# Duely

Duely creates recurring appointments, filters national holidays and exports iCalendar (`.ics`)
files for calendar applications. The web application uses Angular 20 standalone components and
Angular Material 3 design tokens; an Electron build exists, but desktop launch and storage remain
unverified (see [Known Limitations](docs/2026_KNOWN_LIMITATIONS.md#f-electron-desktop-storage--unresolved-deliberately-deferred)).

## Getting started

Install Git and Docker with Docker Compose. All dependency installation, builds, linting, type-checks
and tests run inside Docker, never on the development host. The manifests require Node >=24 and
npm >=10.2; `Dockerfile` currently uses the floating `node:lts-slim` tag, so check the actual container
version rather than assuming Node 24. Python 2 and `windows-build-tools` are not prerequisites.

From the repository root:

```bash
docker compose build duely-dev
docker compose run --rm --service-ports duely-dev \
  npm run serve -- --host 0.0.0.0
```

Open `http://localhost:4200`. Stop the foreground server with Ctrl+C. If Docker is unavailable,
stop rather than falling back to host execution. See [Installation](INSTALL.md) for production
containers and build outputs, and [Testing Guide](docs/TESTING_GUIDE.md) for verification commands.
There is no verified browser/desktop OS support matrix; the missing browser-target policy is
recorded in Known Limitations (b.6).

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
| `start:electron` | Launch the previously built Electron application; runtime remains unverified |

The build orchestrator is `scripts/build.mjs`: esbuild's Node API produces CJS server/Electron
bundles, and `@angular/build:application` produces the Angular client. `build:watch` watches
`server/app.ts` and `electron/main.ts`; use `serve` for client hot reload. Generated static output
is cleaned during a build and `browser/index.html` is asserted, so do not put hand-maintained files
in `dist/`. Diagnostic Angular builds should use a temporary output path (Testing Guide §4).

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
- `client/app/shared/icons/duely-icons.ts` contains eight bundled SVG literals. `provideDuelyIcons()`
  registers them through `addSvgIconLiteralInNamespace`, used as `svgIcon="duely:add"`. Literal
  registration avoids HTTP/font fetches under offline or Electron `file://` origins. The sanitizer
  trust applies only to first-party build-time literals, never user-supplied SVG.

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

The creator forms still use load-bearing reactive-form/`ngModel` dual bindings. Do not remove them
without explicit model/form synchronization and exported-ICS coverage (Known Limitations (a.9)).
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

See [Installation](INSTALL.md) for the production container. There is no npm packaging script for
Electron platform binaries/installers: `build:electron:prod` emits `dist/electron/`, not an
installable application. Existing electron-builder configuration does not establish a working
packaging or desktop-runtime path. Keep the complete third-party licence artefacts when distributing
builds (Known Limitations (b.5)).

## Contributing

Please read `CONTRIBUTING.md` for the code of conduct and pull-request process. Git history and tags
preserve completed migration records; open or accepted items live in
[Known Limitations](docs/2026_KNOWN_LIMITATIONS.md), not a separate migration plan/reference.
Dependency-upgrade work is tracked in [the upgrade task board](docs/TODO_UPGRADES.md).

## Versioning

`package.json` and `package-lock.json` are authoritative for declared and resolved versions.
`esbuild` is pinned exactly to **0.25.9**: `scripts/build.mjs` uses its `context()` / `watch()` /
`rebuild()` API, whose watch options differ between releases. Review that script when changing the
pin. Other direct dependencies use `^` or `~` ranges; do not duplicate their version table here.

## Authors

- Till Affeldt
- Marlen Bernier
- Mike Kenneth Braun
- Frederik Kammer
- Lars Richard
- Hendrik Eggers

## Notice about standard conformity

The implementation of timezones is not conform to the iCal standard specified in "RFC 5545 3.2.19.
Time Zone Identifier" as the utilized library "ical-generator" makes use of the non-standard
`Timezone-ID` instead of `VTIMEZONE` in order to support older versions of Microsoft Outlook.
This legacy notice has not been re-verified by the documentation consolidation; timezone/export
expectations remain part of the deferred test-and-date work.

## License

[Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
