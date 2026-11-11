# Duely — AI Task Board

**Created:** 2026-11-11 · **Branch:** `dev-v2` · **State:** no open task.
**Predecessor:** [the upgrade task board](TODO_UPGRADES.md), closed with every numbered task DONE
and its single deferred item moved to [Known Limitations](2026_KNOWN_LIMITATIONS.md) (l).

This file is the ledger for future work. A task exists once it is written here, and writing it does
**not** authorize it. The upgrade cycle's completion records stay in `TODO_UPGRADES.md`, which is
history from here on; this board carries that document's execution contract and evidence habits
forward and points at its gate recipe instead of duplicating it.

---

## 1. Standing execution contract

These rules were measured over the upgrade cycle. They apply to every task here until the user
changes them.

- **One task at a time, each with explicit approval.** Nothing starts because it is next in the
  table, and no agent launches a successor. A parallel batch authorizes only its named tasks;
  integrating finished candidates is a separate approval. Approval covers a task's own
  implementation and acceptance workflow, nothing beyond it.
- **Every executable step runs in Docker.** npm, Node, Angular, TypeScript, lint, test, build and
  packaging commands run in `duely-dev`, `duely-prod`, `duely-build` or a task-specific one-shot
  container, never on the host. A missing Docker daemon is a blocker, not a fallback.
  Source editing and Git inspection stay on the host.
- **Git stays untouched until asked.** No commit, push or staging without a new explicit request.
  Existing work is preserved, including unrelated `.DS_Store` files.
- **`TODO-notes-he.md` is never read for consolidation, edited or staged.**
- **Protected artefacts are preserved.** Baseline captures, screenshots and evidence trees are not
  regenerated or deleted to make a comparison agree.
- **Red gates are named, not averaged.** A suite with known failures is reported as
  passed/failed with the failing names and causes; a green total that contradicts a red gate is a
  defect in the report, not a result.
- **Sound only when the user is actually needed** — an explicit approval checkpoint, a decision or a
  blocker. Routine completion is silent, and any sound is accompanied by what answer is required.
- **Evidence is written once.** Each task writes its logs, hashes and JSON records under
  `.git/duely-batch-<yyyymmdd>/<task>/` (git-excluded; the record names the paths) and never
  rewrites an earlier task's files.

---

## 2. Task ledger

| ID | Task | Status | Record |
|---|---|---|---|
| — | *No open tasks.* | — | — |

**Status vocabulary.** `PROPOSED` — written here, not approved. `IN PROGRESS` — approved and
running. `DONE` — verified and recorded. `BLOCKED` — waiting on something outside the task.
`DEFERRED` — moved to Known Limitations, whose section the ledger names. `CANCELLED` — dropped by
the user.

**Deferred elsewhere.** macOS packaging acceptance (M1) stays in Known Limitations (l), and the
accepted or upstream-owned items of (a)–(k) stay there too. They become tasks here only when the
user asks for one, at which point the ledger row names the section it came from.

---

## 3. Adding a task

Tasks are numbered `T1`, `T2`, … in creation order. Parallel candidates take a letter suffix under
one batch ID (`T4a`, `T4b`), and the batch is integrated by its own task (`T5`). The block repeats
the four fields the closed board used, because they worked:

```text
### T<n> — <title> — <STATUS>

**Owner:** <who executes> · **Needs:** <task or approval it depends on>

**Scope:** what is measured or changed, and what is explicitly out of it.

**Exit:** the observable state that closes the task, including the evidence that proves it.
```

A task that only accepts, defers or declines a defect belongs in Known Limitations, not here; the
ledger then holds a one-line pointer instead of a second copy. Nothing in this file reopens an item
Known Limitations has already decided without a new user request.

**Completion record.** A `DONE` task keeps its block and gains a record below it: changed paths, the
commands with their actual exit codes, counts before and after, deltas split into explained and
unexplained, hashes where identity matters, what was deliberately not done, and what was not
committed. Records are written into this file, not into a separate handoff document.

---

## 4. Gates and evidence

[`docs/TODO_UPGRADES.md`](TODO_UPGRADES.md) §5 holds the gate recipe the upgrade cycle used: the
dependency tree, the four `tsc` projects, `e2e-types`, a deliberate negative control, lint, the unit
runs, focused runs, probe and distribution builds, and E2E with a repeat control.
[`docs/TESTING_GUIDE.md`](TESTING_GUIDE.md) §2 and §3 hold the container commands and the test
layout. A task starts from that battery, records the subset it actually ran with exit codes, and
explains every gate it skipped. Maintained results go to the Testing Guide; this board links to them
rather than duplicating them.

---

## 5. Where things live

| Question | Document |
|---|---|
| What work is open, and what closed it | this file |
| Why an accepted defect was not fixed | `docs/2026_KNOWN_LIMITATIONS.md` |
| How to run a gate or a test suite | `docs/TESTING_GUIDE.md` |
| What the dependency cycle changed | `docs/TODO_UPGRADES.md` (closed record) |
| How to build, install and package | `README.md`, `INSTALL.md` |
| Declared and resolved versions | `package.json`, `package-lock.json` |
