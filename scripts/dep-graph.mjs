#!/usr/bin/env node
/**
 * dep-graph.mjs — Generate a Mermaid.js dependency graph for the Duely project.
 *
 * Reads three package manifests (root, electron, server) and outputs a Mermaid
 * `graph TD` definition showing all dependencies, devDependencies, and shared
 * packages between manifests.
 *
 * Usage:  node scripts/dep-graph.mjs [--output <file.mmd>]
 *         (default: stdout)
 *
 * No external dependencies — uses only Node built-ins (fs, path).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Manifest paths ──────────────────────────────────────────────────────────

const MANIFESTS = [
  { id: 'root', label: 'package.json (root)', path: resolve(ROOT, 'package.json') },
  { id: 'electron', label: 'electron/package.json', path: resolve(ROOT, 'electron/package.json') },
  { id: 'server', label: 'server/package.json', path: resolve(ROOT, 'server/package.json') },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sanitise a package name into a valid Mermaid node ID. */
function nodeId(manifest, pkgName, type) {
  const safe = pkgName.replace(/[^a-zA-Z0-9]/g, '_');
  return `${manifest}_${type}_${safe}`;
}

/** Short label for a dependency node. */
function depLabel(pkgName, version) {
  // Truncate long scoped names for readability
  const short = pkgName.startsWith('@') ? pkgName : pkgName;
  return `${short}\\n${version}`;
}

/** Parse a manifest and return { dependencies, devDependencies } maps. */
function parseManifest(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);
  return {
    dependencies: json.dependencies || {},
    devDependencies: json.devDependencies || {},
  };
}

// ─── Collect data ────────────────────────────────────────────────────────────

const data = new Map(); // id -> { label, deps, devDeps }

for (const m of MANIFESTS) {
  try {
    const parsed = parseManifest(m.path);
    data.set(m.id, { ...m, ...parsed });
  } catch (err) {
    console.error(`Warning: could not read ${m.path}: ${err.message}`);
    data.set(m.id, { ...m, dependencies: {}, devDependencies: {} });
  }
}

// ─── Find shared dependencies ────────────────────────────────────────────────

const allPkgs = new Map(); // pkgName -> Set of manifest ids

for (const [manifestId, info] of data) {
  for (const pkg of Object.keys(info.dependencies)) {
    if (!allPkgs.has(pkg)) allPkgs.set(pkg, new Set());
    allPkgs.get(pkg).add(manifestId);
  }
  for (const pkg of Object.keys(info.devDependencies)) {
    if (!allPkgs.has(pkg)) allPkgs.set(pkg, new Set());
    allPkgs.get(pkg).add(manifestId);
  }
}

const shared = new Set(
  [...allPkgs.entries()]
    .filter(([, manifests]) => manifests.size > 1)
    .map(([pkg]) => pkg)
);

// ─── Generate Mermaid ────────────────────────────────────────────────────────

const lines = [];

lines.push('%%{init: {"theme": "default", "flowchart": {"nodeSpacing": 30, "rankSpacing": 60}}}%%');
lines.push('graph TD');
lines.push('');

// Manifest root nodes
lines.push('    %% ─── Manifest nodes ───');
for (const [id, info] of data) {
  lines.push(`    ${id}["📦 ${info.label}"]`);
}
lines.push('');

// Subgraphs per manifest
for (const [id, info] of data) {
  // Runtime dependencies subgraph
  const depEntries = Object.entries(info.dependencies);
  const devDepEntries = Object.entries(info.devDependencies);

  if (depEntries.length > 0) {
    lines.push(`    %% ─── ${id}: runtime dependencies ───`);
    lines.push(`    subgraph ${id}_deps ["Runtime Dependencies"]`);
    lines.push(`        direction LR`);
    for (const [pkg, ver] of depEntries) {
      const nid = nodeId(id, pkg, 'dep');
      const isShared = shared.has(pkg);
      // Shared deps get a double-bracket (stadium) shape
      if (isShared) {
        lines.push(`        ${nid}(["${depLabel(pkg, ver)}"])`);
      } else {
        lines.push(`        ${nid}["${depLabel(pkg, ver)}"]`);
      }
    }
    lines.push(`    end`);
    lines.push(`    ${id} --> ${id}_deps`);
    lines.push('');
  }

  if (devDepEntries.length > 0) {
    lines.push(`    %% ─── ${id}: dev dependencies ───`);
    lines.push(`    subgraph ${id}_devs ["Dev Dependencies"]`);
    lines.push(`        direction LR`);
    for (const [pkg, ver] of devDepEntries) {
      const nid = nodeId(id, pkg, 'dev');
      const isShared = shared.has(pkg);
      // Dev deps get rounded-rectangle shape; shared get stadium
      if (isShared) {
        lines.push(`        ${nid}(["${depLabel(pkg, ver)}"])`);
      } else {
        lines.push(`        ${nid}("${depLabel(pkg, ver)}")`);
      }
    }
    lines.push(`    end`);
    lines.push(`    ${id} --> ${id}_devs`);
    lines.push('');
  }
}

// Shared-dependency callout section
if (shared.size > 0) {
  lines.push('    %% ─── Shared dependencies (appear in 2+ manifests) ───');
  lines.push('    subgraph shared_section ["🔗 Shared Across Manifests"]');
  lines.push('        direction LR');
  for (const pkg of [...shared].sort()) {
    const manifests = allPkgs.get(pkg);
    const safe = pkg.replace(/[^a-zA-Z0-9]/g, '_');
    // Collect versions from each manifest
    const versions = [];
    for (const mId of manifests) {
      const info = data.get(mId);
      const ver = info.dependencies[pkg] || info.devDependencies[pkg] || '?';
      versions.push(`${mId}: ${ver}`);
    }
    lines.push(`        shared_${safe}[/"${pkg}\\n${versions.join(' | ')}"/]`);
  }
  lines.push('    end');
  lines.push('');

  // Link shared node to each manifest that uses it
  for (const pkg of [...shared].sort()) {
    const manifests = allPkgs.get(pkg);
    const safe = pkg.replace(/[^a-zA-Z0-9]/g, '_');
    for (const mId of manifests) {
      lines.push(`    ${mId} -.->|shares| shared_${safe}`);
    }
  }
  lines.push('');
}

// ─── Output ──────────────────────────────────────────────────────────────────

const output = lines.join('\n');

const outputIdx = process.argv.indexOf('--output');
if (outputIdx !== -1 && process.argv[outputIdx + 1]) {
  const outPath = resolve(process.argv[outputIdx + 1]);
  writeFileSync(outPath, output + '\n', 'utf-8');
  console.error(`Mermaid graph written to: ${outPath}`);
} else {
  console.log(output);
}
