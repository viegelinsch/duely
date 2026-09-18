# Duely

Duely is a small powerful tool to generate multiple recurring appointments and filter national holidays. Because no one needs a business meeting on an national holiday. The Duely will give a out a [iCalendar](https://www.npmjs.com/package/ical-generator) standardized files, which will be compatible with all general used calendar programs.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.0.0. We created the server based Duely for mobile devices and desktop PC. The design is responsive and easy to use. For Desktop PC we also make a Program available, which is run with [electron](https://electron.atom.io/). Duely uses the [iCal-Standard](https://www.npmjs.com/package/ical-generator) to secure the same options as Outlook.

## How to get started

For Duely to be able to be build on your device you need the following steps :

### Prerequisites
These are the necessary steps to start the application for the first time
Before the install these programs are required :
  * [Nodejs](https://nodejs.org/en/) (min. v8.10.0) - make sure npm(v5.7.1) does install with it
  * Python (min v2.7)
All other libraries are automatically downloaded and installed from the package manager.

For the electron application the following OS are supported:
  * Windows 7
  * Windows 10
  * macOS Sierra
  * Ubuntu (16.04.2 )
  * Linux Mint (18.1 )
  * Scientific Linux (7.3)

For the server application the following browser are supported:
  * Chrome (LTS)
  * Firefox (LTS)
  * Opera (LTS)
  * Safari (LTS)
  * iOS Safari (LTS)
  * Android Chrome (LTS)
  * Android Firefox (LTS)

### Installing
    1. Download the application
    2. Execute `npm install` to install dependencies
    3. Execute `npm run build` to compile the source code for the web application, or
       `npm run build:electron` to compile it for the Electron app. `npm run build:prod`
       compiles both in production mode. For the Electron app a plain `npm run build` emits
       `dist/electron/index.js` as its only artefact: it creates no `dist/electron/static/` and
       copies no `dist/electron/package.json`, `manifest.json` or `LICENSE`, so
       `npm run start:electron` needs `npm run build:electron` or `npm run build:prod` first.
    4. Start the application via `npm run start:server` to view the webapplcation or `npm run start:electron` to run the electron app
    5. if you started the server application type `http://localhost:8000`in your browser window.


### Commands Overview
|Command | Action|
| ------------- | --------------------- |
|`build`| Compile the source code for Electron and web use|
|`build:prod`| Build the source code in production mode|
|`build:watch`| Build the two Node-side bundles (`electron/main.ts`, `server/app.ts`) and keep watching them for changes. The Angular client is not watched - use `npm run serve` for client hot reload|
|`build:electron`| Build the Electron code only|
|`build:electron:prod`| Build the Electron code in production mode|
|`build:server`| Build the server code only|
|`build:server:prod`| Build the server code in production mode|
|`clean`| Remove local files and unneeded dependencies|
|`serve`| Serve the Angular client from memory with hot reload on `http://localhost:4200` (`ng serve`)|
|`test:e2e`| Run the end to end tests (Playwright)|
|`lint`	| Check format of source code|
|`start:server`	| Start the Node.js server|
|`start:electron`| Start the Electron app|

## Build

When making changes to the source code make sure to run `npm run build` afterwards
in order to apply the changes to your local copy.
You can execute `npm run build:watch` instead. This will not only apply previous edits
but also keep watching `electron/main.ts` and `server/app.ts` and rebuild those two Node-side
bundles on every change. The Angular client is not watched by this command: its supported
hot-reload path is `npm run serve` (`ng serve`), which serves the client from memory on
`http://localhost:4200` rather than writing to `dist/`. Do not close the terminal until you are
done. You can cancel the command by pressing Ctrl + C.
If you run into problems with files that should have updated, try running npm run clean and then
npm run build to remove outdated files and start on a fresh base.

## Running unit tests

Unit tests run on [Vitest](https://vitest.dev/) through the Angular CLI (`ng test`, using the
`@angular/build:unit-test` builder). Use the following npm scripts:

Command | Action
| ------------- | --------------------- |
| `test` | Run the unit tests once (`ng test --watch=false`) |
| `test:watch` | Run the unit tests in watch mode (`ng test`) |
| `test:coverage` | Run the unit tests once and write a coverage report (`ng test --coverage --watch=false`) |

End to end tests run on Playwright via `npm run test:e2e` (see the Commands Overview above).


## Deployment

Before you can deploy the application you will need to build it for production mode.
Use `npm run build:prod` to do so. The :prod appendix will enable truncating and bundling the code
to minimize the file size.
Packaging the Electron app into a distributable, installable executable is currently not
available: the repository defines no packaging script, so there is no `npm run` command that
produces platform binaries or installers. `npm run build:electron:prod` builds the Electron
bundle into `dist/electron/`, but turning that output into a packaged application is not wired up.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct, and the process for submitting pull requests to us.
## Versioning

We use Git for versioning. For the versions available, see the tags on this repository.

Packages that are to stay on this versions:

    "esbuild": "0.25.9"

`esbuild` is the only dependency pinned to an exact version: `scripts/build.mjs` builds and
watches the two Node-side bundles through its `context()` / `watch()` / `rebuild()` API, whose
watch options differ between esbuild releases. Bump the pin only together with a review of that
script. Every other dependency floats on a `^` or `~` range, and `package.json` is the single
source of truth for versions - do not re-add a pinned copy of it here.

## Authors
  * Till Affeldt
  * Marlen Bernier
  * Mike Kenneth Braun
  * Frederik Kammer
  * Lars Richard
  * Hendrik Eggers

## Notice about standard conformity
The implementation of timezones is not conform to the iCal standard specified in "RFC 5545 3.2.19. Time Zone Identifier"
as the utilized library "ical-generator" makes use of the non-standard `Timezone-ID` instead of `VTIMEZONE` in order
to support older versions of Microsoft Outlook.

## License

[Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
