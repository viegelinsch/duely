/**
 * Duely — Vitest global setup file: restore the Web Storage globals that
 * Node >= 26 shadows on `globalThis`.
 *
 * Wired into the test run by the `setupFiles` option of the
 * `@angular/build:unit-test` target in `angular.json`. This file is TEST-ONLY:
 * it lives outside `client/` (the entire application source root), it is not
 * imported by any module, and it is referenced by nothing but the `test`
 * target, so it cannot reach the application bundle.
 *
 * ---------------------------------------------------------------------------
 * VITEST 5 STATUS (A2, 2026-11-10)
 * ---------------------------------------------------------------------------
 * Vitest 5.1.0 fixes this upstream: its jsdom environment lists `localStorage`
 * and `sessionStorage` in `OTHER_KEYS` (the `getWindowKeys` allowlist), so on
 * Node >= 26 jsdom's working implementations are installed and this file takes
 * the "already the jsdom implementation" branch for both keys. It is kept as a
 * capability-checked guard, not because 5.1.0 needs it: it costs two property
 * reads, and it still protects a runner whose allowlist regresses, a future
 * Node that changes the shadow, or any environment that publishes
 * `globalThis.jsdom` with different storage semantics. The paragraphs below
 * describe the 3.x/4.x behaviour that motivated the file, including the quoted
 * `keysArray` shape, and the 24/47 numbers are historical (the current suite is
 * recorded in `docs/TESTING_GUIDE.md` §5). A no-setup control run on Vitest 5 is
 * the evidence that storage works natively; see that run before assuming this
 * file is what makes the storage specs pass.
 *
 * ---------------------------------------------------------------------------
 * THE MECHANISM THIS TARGETS
 * ---------------------------------------------------------------------------
 * Two independent behaviours combine into a broken test environment:
 *
 * 1. Node >= 26 defines `localStorage` as an own ACCESSOR property on
 *    `globalThis` whose getter lazily requires `internal/webstorage` and
 *    returns `undefined` unless the process was started with
 *    `--localstorage-file=<path>`. Node 24 has no own `localStorage` property
 *    at all. The Duely dev image is Node 26 because `node:lts-slim` is a
 *    floating tag that crossed a major.
 *
 * 2. Vitest 3.2.4's jsdom environment calls `populateGlobal(global, win)`,
 *    which selects the window keys to copy via `getWindowKeys`:
 *
 *        if (k in global) return keysArray.includes(k);
 *
 *    `keysArray` is `LIVING_KEYS.concat(OTHER_KEYS)` (230 entries). Neither
 *    list contains `localStorage` or `sessionStorage`. So on Node >= 26 the
 *    `k in global` test is TRUE, the allowlist test is FALSE, and both keys are
 *    filtered out: jsdom's fully working implementations are never installed
 *    and Node's `undefined`-returning getter wins. On Node 24 the `k in global`
 *    test is FALSE, so both keys pass and jsdom's implementations win.
 *
 * The observable symptom is `TypeError: Cannot read properties of undefined
 * (reading 'getItem')` from `StorageService.loadSettings`
 * (client/app/storage/storage.service.ts:58), which takes 47 passing tests down
 * to 10 — 61 failed / 10 passed instead of the 24 failed / 47 passed baseline.
 *
 * ---------------------------------------------------------------------------
 * WHY A SETUP FILE AND NOT THE `--localstorage-file` FLAG
 * ---------------------------------------------------------------------------
 * Passing `-e NODE_OPTIONS="--localstorage-file=/tmp/duely-ls.json"` on the
 * container invocation also reproduces the baseline exactly, but it was
 * rejected by the user: it breaks the project's "zero manual steps" property,
 * and every future run of bare `npm test` would show 61 failures and invite a
 * misdiagnosed regression. Adding the flag to the `test` script, to the
 * Dockerfile development stage, or merely documenting it were all offered and
 * all explicitly declined. This file makes the suite independent of the host
 * Node major instead.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE WORKING IMPLEMENTATION COMES FROM
 * ---------------------------------------------------------------------------
 * From the jsdom window Vitest ALREADY created — never a hand-rolled shim. A
 * shim would risk behavioural differences from jsdom's (quota events,
 * `StorageEvent`, key ordering) that could silently change what the 24 failing
 * tests actually fail on.
 *
 * The jsdom window cannot be reached through the usual aliases, because
 * `populateGlobal` deliberately re-points them at the global itself:
 * `global.window = global`, `global.self = global`, and `document.defaultView`
 * is redefined as `() => global`. Reading `window.localStorage` therefore hits
 * the very getter we are trying to replace.
 *
 * Vitest's jsdom environment does, however, publish the JSDOM instance itself
 * as `global.jsdom = dom` right after `populateGlobal` returns and before any
 * setup file runs. `globalThis.jsdom.window` is thus the genuine jsdom window,
 * distinct from `globalThis`, and its `localStorage`/`sessionStorage` are the
 * real jsdom `Storage` objects.
 *
 * ---------------------------------------------------------------------------
 * IDEMPOTENCE AND VERSION TOLERANCE
 * ---------------------------------------------------------------------------
 * The guard is a capability check, never a Node version-string comparison:
 *
 *   - no `globalThis.jsdom.window`  -> not the jsdom environment (browser mode,
 *     happy-dom, a future Vitest) -> no-op;
 *   - jsdom's storage for a key does not work -> nothing to install -> no-op;
 *   - `globalThis[key]` is already THAT object -> Vitest or Node already got it
 *     right (the Node 24 case, or a future Vitest that allowlists the keys) ->
 *     no-op.
 *
 * Only the genuinely broken case installs anything. The descriptor mirrors
 * `populateGlobal` exactly — a getter reading through to the jsdom window, a
 * setter that records an override so a strict-mode assignment cannot throw,
 * `configurable: true` so Vitest's teardown and any later redefinition still
 * work, and `enumerable: false`, which is what `populateGlobal` produces.
 *
 * EXPECTED STDERR NOISE, NOT A REQUEST FOR THE FLAG
 * ---------------------------------------------------------------------------
 * Reading Node's own `localStorage` getter makes Node emit
 * `ExperimentalWarning: localStorage is not available because
 * --localstorage-file was not provided`. The capability check below reads it
 * exactly once per worker process, so a bare `npm test` prints one such line
 * (plus Node's `--trace-warnings` hint line) per forked test worker — 16 test
 * files means a contiguous 32-line block immediately after the
 * `RUN v3.2.4 /app` banner and before any test output.
 *
 * That block is EXPECTED and is the symptom this file exists to work around.
 * It does NOT mean `--localstorage-file` is required, and no flag is needed
 * anywhere: not in `package.json`, not in the Dockerfile, not on the
 * `docker compose run` invocation. It is a warning, not an error, and it does
 * not affect the 24 failed / 47 passed counts, the 44 icon messages, or the
 * failing-name baseline.
 */

/** The two Web Storage globals shadowed by the mechanism above. */
const STORAGE_KEYS = ['localStorage', 'sessionStorage'] as const;

type StorageKey = (typeof STORAGE_KEYS)[number];

/** Key used to prove a candidate really round-trips, then removed again. */
const PROBE_KEY = '__duely_vitest_setup_probe__';

/**
 * The shape Vitest's jsdom environment publishes. Only `window` is needed; the
 * rest of the JSDOM instance is deliberately left untyped so this file does not
 * depend on jsdom's own type surface.
 */
interface JsdomInstance {
  readonly window?: Record<string, unknown>;
}

/** Reads a property without letting a throwing getter escape. */
function readSafely(holder: object, key: string): unknown {
  try {
    return (holder as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

/**
 * True only when the candidate is a storage object that actually round-trips a
 * value. This is the capability check the whole guard rests on: it accepts
 * jsdom's `Storage`, rejects Node's `undefined`-returning `localStorage`
 * getter, and would reject any future shim that exists but does not work.
 */
function isWorkingStorage(candidate: unknown): candidate is Storage {
  if (candidate === null || typeof candidate !== 'object') {
    return false;
  }
  const storage = candidate as Storage;
  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return false;
  }
  try {
    storage.setItem(PROBE_KEY, '1');
    const roundTripped = storage.getItem(PROBE_KEY) === '1';
    storage.removeItem(PROBE_KEY);
    return roundTripped;
  } catch {
    return false;
  }
}

/**
 * Installs `key` on the global as an accessor pair reading through to the jsdom
 * window, mirroring Vitest's own `populateGlobal` descriptor.
 */
function aliasToJsdom(key: StorageKey, jsdomWindow: Record<string, unknown>): void {
  const overrides = new Map<string, unknown>();
  Object.defineProperty(globalThis, key, {
    get(): unknown {
      return overrides.has(key) ? overrides.get(key) : jsdomWindow[key];
    },
    set(value: unknown): void {
      overrides.set(key, value);
    },
    configurable: true,
    enumerable: false,
  });
}

function restoreShadowedStorageGlobals(): void {
  const jsdomWindow = (globalThis as { jsdom?: JsdomInstance }).jsdom?.window;
  if (!jsdomWindow) {
    // Not Vitest's jsdom environment. Nothing to restore from; stay silent.
    return;
  }

  for (const key of STORAGE_KEYS) {
    const fromJsdom = jsdomWindow[key];
    if (!isWorkingStorage(fromJsdom)) {
      // jsdom itself offers nothing usable for this key. Leave the global as
      // it is rather than installing a broken value.
      continue;
    }

    const current = readSafely(globalThis, key);
    if (current === fromJsdom) {
      // Already the jsdom implementation: Vitest installed it (Node 24) or a
      // future Vitest allowlisted the key. Genuine no-op.
      continue;
    }

    // `current` is either Node's `undefined` getter (localStorage) or Node's
    // own non-jsdom storage object (sessionStorage, which works but is not an
    // instance of jsdom's `Storage`, so `instanceof Storage` would be false).
    // Both diverge from the Node 24 environment the 24/47 baseline was
    // recorded under, so both are replaced. No setup file runs after this one,
    // so there is no test-installed mock to preserve here.
    aliasToJsdom(key, jsdomWindow);
  }
}

restoreShadowedStorageGlobals();
