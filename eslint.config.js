'use strict';

/**
 * Duely - ESLint 9 flat config.
 *
 * Authored by backlog-emptying Phase 8 (task #33), which restores the lint
 * capability lost when TSLint was retired. There is NO legacy config to migrate
 * from: `tslint.json` was deleted in Phase 7, so this is a fresh setup.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO `--ext` FLAG
 * ---------------------------------------------------------------------------
 * The old npm script was `eslint . --ext .ts,.tsx,.js,.jsx`. ESLint 9 REMOVED
 * `--ext` together with the rest of the eslintrc CLI surface; passing it is a
 * hard error under flat config. Which files get linted is now decided solely by
 * the `files` globs on each config object below, so the script is simply
 * `eslint .`. `.tsx`/`.jsx` are not covered because this repository contains
 * zero React files.
 *
 * ---------------------------------------------------------------------------
 * IGNORES - AND WHY THEY ARE NOT OPTIONAL
 * ---------------------------------------------------------------------------
 * Flat config ignores ONLY `node_modules` and `.git`, at any depth, by
 * default. It does NOT read `.gitignore`. So `eslint .` would otherwise walk
 * into `dist/` and `.angular/` and lint BUILT OUTPUT - thousands of meaningless
 * findings against generated bundles. `coverage/` is created by
 * `npm run test:coverage`. The two `e2e/capture-*.cjs` scripts are git-excluded
 * migration tooling, not project source, and they WOULD otherwise be linted
 * because this config matches `.cjs` files at any depth.
 * `docs/migration-shots/` and `TODO-notes-he.md` are listed defensively
 * (ESLint lints no `.md` or `.png`), to keep the ignore set aligned with
 * `.git/info/exclude`.
 *
 * ---------------------------------------------------------------------------
 * TYPE-AWARE LINTING SCOPE
 * ---------------------------------------------------------------------------
 * Type-aware linting is confined to `client/**\/*.ts`, which is what the task
 * spec asks for. It uses an EXPLICIT `project` pair rather than `projectService`
 * because this repository has no `client/tsconfig.json` - the TypeScript project
 * service discovers projects by walking up for a file literally named
 * `tsconfig.json`, so it would resolve every client file to the ROOT
 * `tsconfig.json`, whose absent `include` defaults to `**\/*` and which does not
 * declare `vitest/globals`. Naming the two real projects directly reproduces
 * exactly the pair that gates G1 and G2 already type-check, and gives the 16
 * spec files their Vitest globals.
 *
 * Everything else TypeScript (`server/`, `electron/`, `e2e/`, root
 * `playwright.config.ts`) is linted NON-type-aware. That is deliberate:
 * `server/tsconfig.json` and `electron/tsconfig.json` pin
 * `moduleResolution: "node10"`, which is load-bearing (it prevents a TS5095
 * abort), and forcing them through a type-aware ESLint program would put that
 * invariant at risk for no diagnostic gain. `server/` must still be linted -
 * the spec names `console.info` at `server/app.ts:73,76` as an expected
 * finding - so it is in scope, just without type information.
 *
 * ---------------------------------------------------------------------------
 * RULE TIERS
 * ---------------------------------------------------------------------------
 * Client TypeScript : eslint:recommended + typescript-eslint
 *                     recommendedTypeChecked (73 rules) + angular-eslint
 *                     `eslint-plugin` recommended (12 rules).
 * Other TypeScript  : eslint:recommended + typescript-eslint recommended
 *                     (the non-type-checked tier).
 * JavaScript / MJS  : eslint:recommended only.
 * Angular templates : @angular-eslint/template-parser plus the
 *                     `eslint-plugin-template` recommended tier (3 rules).
 *
 * `@angular-eslint/eslint-plugin-template` supplies the RULES; the
 * `@angular-eslint/template-parser` the spec names supplies only the PARSER.
 * Configuring the parser without the rule package would parse all 11 templates
 * and then have nothing to run, so the rule package is installed too.
 *
 * The template ACCESSIBILITY tier (`configs.accessibility`, 11 further rules)
 * is deliberately NOT enabled: the spec scopes template linting to the parser
 * and never mentions accessibility, and enabling a tier the plan did not scope
 * would inflate the baseline Phase 10 inherits. Adding it is a one-line spread
 * of `ngTemplatePlugin.configs.accessibility.rules` into the template block.
 *
 * ---------------------------------------------------------------------------
 * DEPRECATION LINTING
 * ---------------------------------------------------------------------------
 * The spec offered `eslint-plugin-deprecation` conditionally - "only if it
 * installs cleanly on ESLint 9". It does not: v3.0.0 (the newest) declares
 * `peerDependencies: { eslint: "^8.0.0" }`, and npm fails with ERESOLVE against
 * the installed eslint 9.39.4. Forcing it with `--legacy-peer-deps` would not
 * be "cleanly". Its official successor is `@typescript-eslint/no-deprecated`,
 * which ships inside the `typescript-eslint` package already required here and
 * is type-aware, so it is enabled explicitly on the client block. It is in no
 * recommended tier (only `strictTypeChecked` and `all`), hence the explicit
 * entry. Severity is `warn`: a deprecated API is advisory, not a defect, and
 * matching the replaced plugin's conventional severity keeps the ERROR count
 * attributable to real rule violations.
 *
 * ---------------------------------------------------------------------------
 * GLOBALS
 * ---------------------------------------------------------------------------
 * The `globals` npm package is resolvable here only as a transitive dependency
 * of `@eslint/eslintrc`. Depending on it would be a phantom dependency, and this
 * repository has a documented history of those breaking builds (`mkdirp`,
 * `moment`, `protractor`). The handful of Node globals the single linted script
 * needs are therefore declared inline. No globals are needed for TypeScript
 * blocks: `typescript-eslint/eslint-recommended` switches `no-undef` off,
 * because the compiler already reports undefined identifiers.
 *
 * One rule is explicitly disabled by user decision (not to hide a finding):
 * `@angular-eslint/prefer-inject` is OFF per decision 9 extension, 2026-10-30.
 * Every other rule tier is enabled as published; the measured violations are the
 * deliverable.
 */

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const ngPlugin = require('@angular-eslint/eslint-plugin');
const ngTemplatePlugin = require('@angular-eslint/eslint-plugin-template');
const ngTemplateParser = require('@angular-eslint/template-parser');

/**
 * typescript-eslint ships its presets as ARRAYS of flat config objects. Reduce
 * one to a single merged rule map so the tier can be applied to an explicitly
 * scoped block instead of relying on `extends` merge semantics.
 * @param {ReadonlyArray<{ rules?: Record<string, unknown> }>} preset
 * @returns {Record<string, unknown>}
 */
function mergePresetRules(preset) {
  return preset.reduce((acc, entry) => Object.assign(acc, entry.rules), {});
}

// eslint:recommended core rules.
const eslintRecommended = js.configs.recommended.rules;

// typescript-eslint's overrides of core rules that the compiler already covers.
// Notably this switches `no-undef` off for every TypeScript block.
const tsOverridesOfCore = tseslint.configs.eslintRecommended.rules;

// Type-aware tier for client/**/*.ts (73 rules).
const tsRecommendedTypeChecked = mergePresetRules(
  tseslint.configs.recommendedTypeChecked,
);

// Non-type-checked tier for the remaining TypeScript (syntax + best practice,
// no type information required).
const tsRecommended = mergePresetRules(tseslint.configs.recommended);

// angular-eslint publishes its presets in the legacy eslintrc shape
// (`{ parser: "<string>", plugins: ["<string>"], rules: {...} }`) because the
// flat-config conversion lives in the `angular-eslint` umbrella package, which
// is not a dependency here. Only the rule maps are consumed; the parser and
// plugin registrations are wired up by hand below.
const ngTsRecommended = ngPlugin.configs.recommended.rules;
const ngTemplateRecommended = ngTemplatePlugin.configs.recommended.rules;

// Node globals available to an ESM script. `__dirname`, `require`, `module` and
// `exports` are deliberately ABSENT from this list: they do not exist in ESM, so
// using one in `scripts/build.mjs` would be a genuine bug worth reporting.
const nodeEsmGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  globalThis: 'readonly',
  structuredClone: 'readonly',
  queueMicrotask: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  fetch: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  Headers: 'readonly',
};

// The same, plus the CommonJS wrapper bindings, for `*.js` / `*.cjs`. This
// repository's `package.json` declares no `"type"`, so a bare `.js` file is
// CommonJS.
const nodeCjsGlobals = {
  ...nodeEsmGlobals,
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  __dirname: 'readonly',
  __filename: 'readonly',
};

module.exports = tseslint.config(
  // -------------------------------------------------------------------------
  // Global ignores. An object with ONLY `ignores` is a global exclusion.
  // -------------------------------------------------------------------------
  {
    name: 'duely/global-ignores',
    ignores: [
      // Built output and caches. NOT ignored by default under flat config.
      'dist/**',
      '.angular/**',
      'coverage/**',
      'node_modules/**',
      // Git-excluded migration tooling and artefacts, never project source.
      'e2e/capture-before-shots.cjs',
      'e2e/capture-after-shots.cjs',
      'docs/migration-shots/**',
      'TODO-notes-he.md',
    ],
  },

  // -------------------------------------------------------------------------
  // Client TypeScript - the type-aware block the spec asks for.
  // -------------------------------------------------------------------------
  {
    name: 'duely/client-ts-type-aware',
    files: ['client/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        // The same two projects gates G1 and G2 type-check. tsconfig.app.json
        // covers client/**/*.ts minus specs; tsconfig.spec.json covers the 16
        // spec files and supplies `vitest/globals`.
        project: ['./client/tsconfig.app.json', './client/tsconfig.spec.json'],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@angular-eslint': ngPlugin,
    },
    rules: {
      ...eslintRecommended,
      ...tsOverridesOfCore,
      ...tsRecommendedTypeChecked,
      ...ngTsRecommended,
      // Successor to the ESLint-8-only `eslint-plugin-deprecation`. See the
      // DEPRECATION LINTING note in the header.
      '@typescript-eslint/no-deprecated': 'warn',
      // DECLINED by user decision 2026-10-30 (decision 9 extension): the
      // constructor-injection to inject() modernisation is not adopted.
      '@angular-eslint/prefer-inject': 'off',
    },
  },

  // -------------------------------------------------------------------------
  // Everything else TypeScript - deliberately NON-type-aware.
  // `playwright.config.ts` is named explicitly because a slash-free glob such
  // as `*.ts` matches at ANY depth under flat config and would collide with the
  // client block above.
  // -------------------------------------------------------------------------
  {
    name: 'duely/non-client-ts',
    files: [
      'server/**/*.ts',
      'electron/**/*.ts',
      'e2e/**/*.ts',
      'playwright.config.ts',
    ],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...eslintRecommended,
      ...tsOverridesOfCore,
      ...tsRecommended,
    },
  },

  // -------------------------------------------------------------------------
  // ESM JavaScript - in practice only `scripts/build.mjs`, the esbuild build
  // script that replaced the four Webpack configs in Phase 6.
  // -------------------------------------------------------------------------
  {
    name: 'duely/js-esm',
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: nodeEsmGlobals,
    },
    rules: {
      ...eslintRecommended,
    },
  },

  // -------------------------------------------------------------------------
  // CommonJS JavaScript. No tracked file matches today (the only two `.cjs`
  // files are the ignored capture scripts); kept so the config is correct if
  // one is added.
  // -------------------------------------------------------------------------
  {
    name: 'duely/js-cjs',
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: nodeCjsGlobals,
    },
    rules: {
      ...eslintRecommended,
    },
  },

  // -------------------------------------------------------------------------
  // Angular templates. `@angular-eslint/template-parser` parses, the
  // `@angular-eslint/template` plugin supplies the rules.
  //
  // The `extract-inline-html` processor is NOT registered: all 10 Duely
  // components use `templateUrl`, and a repo-wide grep for an inline
  // `template:` property returns zero hits, so there are no inline templates to
  // extract.
  // -------------------------------------------------------------------------
  {
    name: 'duely/client-html-templates',
    files: ['client/**/*.html'],
    languageOptions: {
      parser: ngTemplateParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@angular-eslint/template': ngTemplatePlugin,
    },
    rules: {
      ...ngTemplateRecommended,
    },
  },
);
