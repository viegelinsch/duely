# Duely Installation

## Prerequisites

Install Git and Docker with Docker Compose, and check out the repository. Run the commands below
from the repository root, not the retired SVN `trunk/source` directory. Dependency installation,
builds, linting, type-checks and tests must run inside Docker; do not install a second host toolchain.
Python 2.7 and `windows-build-tools` are no longer required.

The root, `server/` and `electron/` manifests require Node `^26.0.0` and npm `^11.20.0`, and every
`Dockerfile` stage starts from `node:26-slim`. Check the actual runtime with
`docker compose run --rm duely-dev node --version`. If Docker is unavailable, stop rather than
falling back to host execution.

## Development server

```bash
docker compose build duely-dev
docker compose run --rm --service-ports duely-dev \
  npm run serve -- --host 0.0.0.0
```

Open `http://localhost:4200` and stop with Ctrl+C when finished. The explicit host binding and
`--service-ports` are needed for host-browser access: plain `ng serve` binds to localhost **inside**
the container. Playwright can use that default because it starts the server in its own container.
Source is bind-mounted at `/app`; dependencies live in an anonymous `/app/node_modules` volume.
Rebuild `duely-dev` after changing dependencies. Chromium and its OS dependencies are baked into
that image, so no separate Playwright browser installation is needed.

## Builds and outputs

```bash
docker compose run --rm duely-dev npm run build:prod
```

This writes generated output into the bind-mounted `dist/`. `scripts/build.mjs` bundles the two
Node entry points with esbuild (`format: cjs`, `platform: node`, `target: node24`) and invokes
Angular's `@angular/build:application` builder for the clients. The script accepts
`--mode development|production`, `--target all|server|electron` and `--watch`; npm scripts supply
these options (see README).

| Output | Purpose |
|---|---|
| `dist/server/app.js` | Express entry; runtime dependencies such as Express/compression remain external |
| `dist/server/package.json` | Copied server runtime manifest |
| `dist/server/static/browser/` | Angular client served by Express |
| `dist/electron/index.js` | Electron main-process CJS bundle; Electron remains external |
| `dist/electron/static/browser/` | Client loaded by Electron |
| `dist/electron/{package.json,manifest.json,LICENSE}` | Copied desktop metadata/licence |

Plain `build` emits the server distribution and Electron main bundle but **skips** Electron static
files/manifests. Use `build:electron` or a production Electron/all build before attempting
`start:electron`. `build:watch` watches only `server/app.ts` and `electron/main.ts`; client hot reload
uses `serve` and does not write to `dist/`. Builds clean generated static output and assert the
nested `browser/index.html` path. `dist/` is git-excluded.

Angular writes `3rdpartylicenses.txt` (production only) and `prerendered-routes.json` one level
**above** `browser/`, at each static output root. Preserve those artefacts in distribution; copying
only `browser/` can omit licence notices. The production Docker image copies the **entire** server
distribution, including these files. Express does not serve the licence text at
`/3rdpartylicenses.txt`: its catch-all returns `index.html` instead (Known Limitations (b.5)).

## Production container

```bash
docker compose build duely-prod
docker compose up duely-prod
```

Open `http://localhost:8000`. The production stage installs runtime dependencies and runs
`node ./dist/server/app.js` as the `node` user. `NODE_ENV=production` enables compression;
`server/app.ts` uses `Number(process.env.PORT ?? 8000)` and serves `static/browser` relative to the
built server entry. An unconditional SPA catch-all returns HTML/200 for unmatched paths, including
missing assets. Deep multi-segment URLs have a separate relative-asset/base-href limitation
(Known Limitations (i.9)); a green root-page probe does not establish all routing behaviour.

## Tests and verification

```bash
docker compose run --rm duely-dev npm test
docker compose run --rm duely-dev npx playwright test
```

The deferred unit baseline is **24 failed / 49 passed (73 specs)**, not a fully green test suite.
See `docs/TESTING_GUIDE.md` for type-checks, temporary probe builds, failing-name capture and the scope
of the recorded browser results. No new runtime verification was performed for this documentation
consolidation.

## Optional deployment with PM2

The production container above is the documented container path. The retained non-container PM2
guidance is an alternative for a **deployment machine**, not permission to build/test on the
development host. It has not been re-verified by this consolidation. Deploy the complete built
`dist/server/` distribution, install its copied manifest's runtime dependencies, and configure PM2
on that deployment machine before starting `app.js`. Node must satisfy the application's engine
requirement; compression requires `NODE_ENV=production`.

## Proxy traffic

Set up a reverse proxy to forward traffic to the Node server. The following retained examples are
configuration sketches, not complete or newly verified TLS deployments; adapt hostnames, ports,
certificates and headers to the deployment environment.

### Apache2

```
<VirtualHost *:80/443>
  ServerName example.com
  ServerAlias mysub.example.com

  RequestHeader set X-Forwarded-Proto "https"
  ProxyRequests Off
  AllowEncodedSlashes NoDecode
  ProxyPass / http://127.0.0.1:8000/ nocanon retry=0
  ProxyPassReverse / http://127.0.0.1:8000/

  [...]
</VirtualHost>
```


### Nginx

```
upstream duely_express_upstream {
  server 127.0.0.1:8000;
  keepalive 64;
}

server {
  listen 80;
  server_name example.com;

  location / {
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_set_header X-NginX-Proxy true;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_max_temp_file_size 0;
    proxy_pass http://duely_express_upstream/;
    proxy_redirect off;
    proxy_read_timeout 240s;
  }
}
```

## Package Electron as an application

The repository defines no npm packaging script for platform installers/binaries.
`docker compose run --rm duely-dev npm run build:electron:prod` emits `dist/electron/`, not an
installable application. Existing electron-builder configuration does not prove working packaging.
Desktop launch, save-dialog/storage wiring and `file://` lazy chunks remain unresolved in Known
Limitations (f); a successful build/path assertion is not a desktop-runtime verification.

## Full command overview

See `README.md` for npm scripts and current UI development guidance; `docs/TESTING_GUIDE.md` for Docker
verification, and `docs/2026_KNOWN_LIMITATIONS.md` for deferred/accepted work.
