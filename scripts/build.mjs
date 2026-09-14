#!/usr/bin/env node
/**
 * Duely build orchestrator.
 *
 * Replaces the four Webpack configs retired in migration Phase 6
 * (`webpack.config.js`, `webpack.client.config.js`, `webpack.electron.config.js`,
 * `webpack.server.config.js`) with a single native Node ESM script.
 *
 * What it produces, and what each product replaces:
 *
 *   electron/main.ts -> dist/electron/index.js
 *       CJS bundle for the Electron main process. Replaces the `electron-main`
 *       config in webpack.electron.config.js (entry `index`, libraryTarget
 *       commonjs2, `electron` external).
 *
 *   server/app.ts -> dist/server/app.js
 *       CJS bundle for the Express server. Replaces the `target: node` config in
 *       webpack.server.config.js (entry `app`, libraryTarget commonjs2,
 *       express/compression/path/os external). Those stay external because
 *       server/package.json declares them and a deployed server runs
 *       `npm install` against the copied manifest.
 *
 *   dist/server/static/browser/  (Angular production or development build)
 *   dist/electron/static/browser/ (same bundle, different output path)
 *       Replace the two `webpack.client.config.js` invocations. These are now
 *       delegated to `ng build` with the esbuild `@angular/build:application`
 *       builder, which emits into `{outputPath}/browser/`. Both electron/main.ts
 *       and server/app.ts resolve `static/browser`, so the nesting is required.
 *       `isElectron` stays `false` in both (locked decision 17: no new
 *       fileReplacements entry, no electron configuration).
 *
 *   dist/electron/{package.json,manifest.json,LICENSE}
 *   dist/server/package.json
 *       Replace the CopyWebpackPlugin patterns.
 *
 * Deliberately dropped, with reasons:
 *   - postcss.config.js / autoprefixer: the Angular esbuild builder runs its own
 *     postcss pipeline with a browserslist-independent default; the standalone
 *     PostCSS config only ever fed `postcss-loader` inside the deleted Webpack
 *     CSS chain.
 *   - html-webpack-plugin, mini-css-extract-plugin, source-map-loader,
 *     terser-webpack-plugin, splitChunks/runtimeChunk: all superseded by the
 *     Angular builder (it owns index.html processing, CSS extraction, source
 *     maps, minification and chunk splitting).
 *   - `process.env.ELECTRON` DefinePlugin: no source file ever read it, and
 *     locked decision 17 keeps `isElectron` false in every environment file.
 *   - webpack devServer (port 4200, historyApiFallback): replaced by `ng serve`
 *     (`@angular/build:dev-server`), which supplies the same SPA fallback.
 *
 * Usage:
 *   node scripts/build.mjs [--mode development|production]
 *                          [--target all|server|electron]
 *                          [--watch]
 *
 *   --mode    development (default) skips minification of the two Node-side
 *             bundles, builds the Angular client with `--configuration
 *             development`, and skips the second (Electron) static bundle when
 *             --target is `all`. production does the opposite and additionally
 *             verifies the Electron layout.
 *   --target  limits the run to one half of the tree.
 *   --watch   keeps esbuild watching electron/main.ts and server/app.ts after an
 *             initial full build. The Angular client is NOT watched here: its
 *             supported hot-reload path is `npm run serve` (`ng serve`), which
 *             serves from memory rather than writing to dist/.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { spawn } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------------ *
 * Argument parsing
 * ------------------------------------------------------------------------ */

function parseArgs(argv) {
  const options = { mode: 'development', target: 'all', watch: false, help: false };

  const valueFor = (flag, index) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      fail(`${flag} requires a value.`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') {
      options.mode = valueFor(arg, i);
      i += 1;
    } else if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length);
    } else if (arg === '--target') {
      options.target = valueFor(arg, i);
      i += 1;
    } else if (arg.startsWith('--target=')) {
      options.target = arg.slice('--target='.length);
    } else if (arg === '--watch') {
      options.watch = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      fail(`unknown argument '${arg}'. Expected --mode, --target, --watch or --help.`);
    }
  }

  if (!['development', 'production'].includes(options.mode)) {
    fail(`--mode must be 'development' or 'production', got '${options.mode}'.`);
  }
  if (!['all', 'server', 'electron'].includes(options.target)) {
    fail(`--target must be 'all', 'server' or 'electron', got '${options.target}'.`);
  }
  return options;
}

/* ------------------------------------------------------------------------ *
 * Reporting helpers
 * ------------------------------------------------------------------------ */

function fail(message) {
  process.stderr.write(`\nbuild.mjs: ${message}\n`);
  process.exit(1);
}

function step(message) {
  process.stdout.write(`\n> ${message}\n`);
}

function describeFile(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  if (!existsSync(absolute)) {
    return `${relativePath} MISSING`;
  }
  const size = statSync(absolute).size;
  return `${relativePath} (${size.toLocaleString('en-US')} B)`;
}

/* ------------------------------------------------------------------------ *
 * Step 1/2 - the two Node-side CJS bundles
 * ------------------------------------------------------------------------ */

/**
 * Shared esbuild options for both Node-side bundles.
 *
 * `platform: 'node'` already externalises every Node builtin, so the explicit
 * `external` entries below are the runtime packages that a deployed artefact
 * must resolve from its own node_modules instead of inlining.
 */
function nodeBundleOptions({ entryPoint, outfile, external, mode, watch }) {
  const production = mode === 'production';
  return {
    absWorkingDir: repoRoot,
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node24',
    external,
    // Mirrors the old devtool: 'source-map' in production, a usable map in dev.
    sourcemap: production ? true : 'linked',
    minify: production,
    // 'warning' keeps a one-shot build quiet, but it would also swallow esbuild's
    // own "[watch] build started/finished" lines, which are the only feedback a
    // watch session gives: esbuild 0.25.9's WatchOptions accepts just `delay`,
    // the old `onRebuild` callback is gone from the API. So watch mode logs at
    // 'info' and one-shot mode stays at 'warning'.
    logLevel: watch ? 'info' : 'warning',
  };
}

const bundleSpecs = {
  electron: {
    entryPoint: 'electron/main.ts',
    outfile: 'dist/electron/index.js',
    // The old webpack.electron.config.js also listed express and compression as
    // externals; electron/main.ts imports neither, so they were dead entries.
    external: ['electron'],
  },
  server: {
    entryPoint: 'server/app.ts',
    outfile: 'dist/server/app.js',
    external: ['express', 'compression', 'path', 'os'],
  },
};

/**
 * Builds (or starts watching) one Node-side bundle.
 * @returns {Promise<Array<{rebuild: Function, dispose: Function}>>} watch contexts
 */
async function buildNodeBundle(name, mode, watch) {
  const spec = bundleSpecs[name];
  const options = nodeBundleOptions({ ...spec, mode, watch });
  mkdirSync(path.dirname(path.join(repoRoot, spec.outfile)), { recursive: true });

  if (!watch) {
    await esbuild.build(options);
    process.stdout.write(`  bundled ${describeFile(spec.outfile)}\n`);
    return [];
  }

  const context = await esbuild.context(options);
  await context.watch();
  await context.rebuild();
  process.stdout.write(`  bundled and watching ${spec.entryPoint}\n`);
  return [context];
}

/* ------------------------------------------------------------------------ *
 * Step 3/4 - the Angular static bundles
 * ------------------------------------------------------------------------ */

/**
 * Runs the local Angular CLI in-process rather than through a shell, so a
 * non-zero exit is a typed failure and no `npx` lookup can pick up a different
 * CLI version.
 */
function runNgBuild({ outputPath, configuration }) {
  const ngEntry = path.join(repoRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
  if (!existsSync(ngEntry)) {
    fail(`cannot find the Angular CLI entry point at ${ngEntry}; run 'npm install' first.`);
  }

  const args = [
    ngEntry,
    'build',
    `--configuration=${configuration}`,
    `--output-path=${outputPath}`,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ng build --output-path=${outputPath} exited with code ${code}`));
      }
    });
  });
}

/**
 * The esbuild application builder writes into `{outputPath}/browser/` but does
 * not prune the output directory first. The old Webpack client config set
 * `output.clean: true`, so stale artefacts - including the Angular-4-era
 * `*.bundle.js` files and the glyphicons fonts that were still sitting in
 * dist/electron/static - would otherwise survive forever next to `browser/`.
 */
function cleanStaticOutput(outputPath) {
  const absolute = path.join(repoRoot, outputPath);
  if (existsSync(absolute)) {
    rmSync(absolute, { recursive: true, force: true });
  }
  mkdirSync(absolute, { recursive: true });
}

async function buildStatic(outputPath, mode) {
  const configuration = mode === 'production' ? 'production' : 'development';
  step(`ng build --configuration ${configuration} --output-path ${outputPath}`);
  cleanStaticOutput(outputPath);
  await runNgBuild({ outputPath, configuration });

  const indexHtml = path.join(outputPath, 'browser', 'index.html');
  if (!existsSync(path.join(repoRoot, indexHtml))) {
    fail(
      `the Angular builder did not produce ${indexHtml}. Both server/app.ts and ` +
      'electron/main.ts resolve static/browser, so a flat layout would leave the ' +
      'deployed artefact unable to find its own index.html.',
    );
  }
  process.stdout.write(`  emitted ${describeFile(indexHtml)}\n`);
}

/* ------------------------------------------------------------------------ *
 * Step 5 - the copied manifests
 * ------------------------------------------------------------------------ */

const copySpecs = {
  electron: [
    { from: 'electron/package.json', to: 'dist/electron/package.json' },
    { from: 'electron/manifest.json', to: 'dist/electron/manifest.json' },
    { from: 'LICENSE', to: 'dist/electron/LICENSE' },
  ],
  server: [
    { from: 'server/package.json', to: 'dist/server/package.json' },
  ],
};

function copyManifests(target) {
  for (const { from, to } of copySpecs[target]) {
    const source = path.join(repoRoot, from);
    if (!existsSync(source)) {
      // The old CopyWebpackPlugin patterns all set `noErrorOnMissing: true`.
      process.stdout.write(`  skipped ${from} (not present)\n`);
      continue;
    }
    const destination = path.join(repoRoot, to);
    mkdirSync(path.dirname(destination), { recursive: true });
    // Remove-then-create rather than copy-in-place. The historical artefacts in
    // dist/ were committed with mode 100755, and copying over an existing file
    // on a bind-mounted volume can fail with EACCES while leaving a truncated
    // destination behind. Starting from no destination is deterministic.
    rmSync(destination, { force: true });
    copyFileSync(source, destination);
    // These are data files, not executables - the 755 mode in the old tracked
    // copies was an accident of how they were committed.
    chmodSync(destination, 0o644);
    process.stdout.write(`  copied ${from} -> ${to}\n`);
  }
}

/* ------------------------------------------------------------------------ *
 * Orchestration
 * ------------------------------------------------------------------------ */

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(
      'Usage: node scripts/build.mjs [--mode development|production] ' +
      '[--target all|server|electron] [--watch]\n',
    );
    return;
  }

  const { mode, target, watch } = options;
  const buildServer = target === 'all' || target === 'server';
  const buildElectron = target === 'all' || target === 'electron';
  // A development run with --target all skips the Electron static bundle; it is
  // byte-identical to the server one apart from its output path, and Electron
  // cannot be launched in the dev container anyway.
  const electronStatic = buildElectron && (mode === 'production' || target === 'electron');

  process.stdout.write(
    `Duely build: mode=${mode} target=${target} watch=${watch ? 'yes' : 'no'}\n`,
  );

  const contexts = [];

  if (buildElectron) {
    step('bundle electron/main.ts');
    contexts.push(...(await buildNodeBundle('electron', mode, watch)));
  }

  if (buildServer) {
    step('bundle server/app.ts');
    contexts.push(...(await buildNodeBundle('server', mode, watch)));
  }

  if (buildServer) {
    await buildStatic('dist/server/static', mode);
    step('copy server manifests');
    copyManifests('server');
  }

  if (electronStatic) {
    await buildStatic('dist/electron/static', mode);
    step('copy electron manifests');
    copyManifests('electron');

    // The leg that the flat Webpack layout used to get wrong: electron/main.ts
    // resolves `static/browser`, so assert the nested path really exists.
    const electronIndex = 'dist/electron/static/browser/index.html';
    if (!existsSync(path.join(repoRoot, electronIndex))) {
      fail(`${electronIndex} is missing; electron/main.ts would load nothing.`);
    }
    const electronBundle = 'dist/electron/index.js';
    if (!existsSync(path.join(repoRoot, electronBundle))) {
      fail(`${electronBundle} is missing; electron/package.json declares it as "main".`);
    }
  }

  process.stdout.write('\nBuild finished.\n');

  if (watch) {
    process.stdout.write(
      'Watching electron/main.ts and server/app.ts. Press Ctrl+C to stop.\n' +
      'The Angular client is not watched here - use `npm run serve` for client ' +
      'hot reload.\n',
    );
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, async () => {
        await Promise.all(contexts.map((context) => context.dispose()));
        process.exit(0);
      });
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\nbuild.mjs failed: ${message}\n`);
  if (error instanceof Error && error.errors) {
    for (const esbuildError of error.errors) {
      process.stderr.write(`  ${esbuildError.text}\n`);
    }
  }
  process.exit(1);
});
