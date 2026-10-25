# LayerFS ↔ pi-core-subagent integration feasibility spike

Plan 20261025-020 · TASK 2 · read-only research, no code written.

**Verdict up front: NO-GO for now.** The stop rule from the spec is hit: shape (b) — a
pi-workflows-level wrapper with no pi-core-subagent change — is **not plausible**, and
shape (a) alone is **insufficient**, because of two blockers that no wiring choice fixes:
(1) a LayerFS commit is not a git object, so the gate's `git merge --no-ff <branch>` has
nothing to merge; (2) a LayerFS Workspace is a FUSE mount inside a Docker Sandbox
container, so pi child agents (whose file tools need host paths) cannot work in one
without running the child inside the container. Both are fixable only by adding an
**export-to-git bridge** and either an upstream backend option or a fork.

Inputs: LayerFS checkout `/home/aurel/Documents/vibe/layerfs` @ c77281e49, v1.1.0;
`@arhen/pi-core-subagent` 1.3.68 at `/home/aurel/.pi/agent/npm/node_modules/@arhen/pi-core-subagent`
(peer dep >=1.3.49 satisfied); pi-workflows `extensions/index.ts` @ HEAD. Citations below
are `path:line` inside those trees. (The installed package ships TypeScript **source** —
`package.json:9` `"main": "./src/index.ts"`, repo `github.com/arhen/pi-extensions`,
directory `packages/core/pi-core-subagent`, `package.json:29-33` — so the "dist may be
minified" caveat does not apply.)

---

## 1. The two surfaces

### 1.1 pi-core-subagent worktree lifecycle (the thing LayerFS would replace)

Write children (`write: true`) get a git worktree under `<git-common-dir>/subagents/<runId>/<taskId>`
on branch `subagents/<runId>/<taskId>`:

- Branch prefix `subagents/` — `src/worktree.ts:13`; container dir from
  `git rev-parse --git-common-dir` + `subagents` — `src/worktree.ts:168-174`.
- **Create**: `createWorktree()` — `src/worktree.ts:70-98`; the point of no return is
  `git worktree add -b <branch> <path> <base>` — `src/worktree.ts:90`. It also symlinks
  the shared `node_modules` — `src/worktree.ts:91-97`. Dispatch calls it directly with
  no indirection: `src/manager.ts:534`; failure falls back to in-place with reason
  `"not a git repository"` — `src/manager.ts:536`. Child cwd becomes the worktree path:
  `let childCwd = wt?.path ?? task.cwd` — `src/manager.ts:543`. Resume re-attaches via
  `attachWorktree` — `src/manager.ts:523`, `src/worktree.ts:101`.
- **Commit**: on completion `commitWorktree(wt, …)` — `src/manager.ts:727` →
  `commitIn` — `src/worktree.ts:132-146`: `git add -A` excluding node_modules
  (`src/worktree.ts:143`) then `git commit -m … --no-verify` (`src/worktree.ts:145`).
  Success keeps the worktree dir (`keepWorktreeDir`, `src/manager.ts:729`); diff stat is
  read from `git diff <base>...<branch>` — `branchDiff`, `src/worktree.ts:149-154`,
  consumed at `src/manager.ts:746-750`. Failed/aborted children get a partial commit —
  `src/manager.ts:809`.
- **Discard**: `removeWorktree` — `src/worktree.ts:157-159` → `dropDir`:
  `git worktree remove --force` (`src/worktree.ts:187`) + `git worktree prune`
  (`src/worktree.ts:197`), called in the `finally` when nothing was kept —
  `src/manager.ts:818`. Post-merge garbage collection: `cleanupMerged` deletes branches
  reported by `git branch --merged` — `src/worktree.ts:206-230` (invoked from
  `src/index.ts:200` and `src/manager.ts:1056`). Crash recovery re-commits dead
  worktrees' state: `reapDeadWorktrees` — `src/worktree.ts:254-271`.
- **The gate contract**: pi-core-subagent itself does not merge; it reports the branch
  and instructs the leader "review the branch diff and merge with
  `git merge --no-ff <branch>` when done" — `src/index.ts:244` (same wording in
  `src/presentation.ts:50`). pi-workflows dispatches children through this extension's
  `subagent` tool (`extensions/index.ts:1012-1014`) and its gate relies on that branch.
- **No injection point**: the worktree functions are statically imported and called —
  `src/manager.ts:56-62`, `src/manager.ts:534/727/809/818`. There is no backend
  interface, no option, no hook, no event. The only knobs are per-task (`write`,
  `isolation?: "worktree" | "in-place"` in `src/types.ts:56`) — isolation is a
  *snapshot label*, not a pluggable strategy.

### 1.2 LayerFS model (the candidate backend)

LayerFS v1.1.0 (`api/` JS packages: `@layerfs/agent`, `@layerfs/backend`, `@layerfs/runtime`
— `api/README.md:15-19`; Rust `core/` beneath):

- **History is a custom Store, not git.** "All committed state (content objects,
  metadata and history) lives in one SQLite Store file … installed on a volume the
  daemons share" — `core/README.md:14-17`. Content is content-addressed packs
  (`layerfs-storage`, `core/README.md` crate table, "content-addressed encoding and
  packs"). A project is a *copy* created by `LayerFS.init(name, folder)` — e.g.
  `LayerFS.init("website", "./website")`, `api/how-to-use/agent.md:26`; the user's git
  repo is only the import source.
- **Workspaces live inside Docker.** A Sandbox is "a container running one daemon on the
  project's Store" — `core/README.md:24-25`. A Workspace is "a full mutable view":
  "Mount binds a FUSE filesystem … over an immutable committed root. Each Workspace has
  its own overlay SQLite file … deleted at unmount" — `core/README.md:28-31`. The mount
  path exists **only inside the container** (`/workspaces/1`, … —
  `api/how-to-use/agent.md:161-166`); the host gets no path.
- **Commit**: `workspace.commit(ws, message?, force?)` "publishes the Workspace's
  changes … builds new objects … and publishes in one short step" into the Store —
  `core/README.md:34-37`; method at `api/how-to-use/agent.md:265`; CLI
  `layerfs workspace commit <ws> -m …` — `api/how-to-use/agent.md:407,494`. Refs are
  "`main`, a Branch name, a Commit id or a Layer id" — `api/how-to-use/agent.md:267-271`;
  "Main changes only through publish" (`branch.publish`) — `api/how-to-use/agent.md:269`.
  LayerFS has its own `branch.merge(a, b, name, …)` — `api/how-to-use/agent.md:266` —
  but that merges LayerFS branches inside the Store, not git branches.
- **Sandbox/workspace lifecycle**: `sandbox.create()` is the only call that starts a
  container; `workspace.mount(sandbox, branch)` (both required, no options) —
  `api/how-to-use/agent.md:165-166`; max 16 Workspaces per Sandbox (`Capacity` refusal,
  same section); a Sandbox "closes itself two minutes after its last Workspace is
  unmounted" — `api/how-to-use/agent.md:177-179`; `sandbox.close` is refused
  `MountsActive` while a Workspace is mounted (same section). Discard =
  `workspace.unmount(ws, discard?)` — `api/how-to-use/agent.md:265` (overlay deleted at
  unmount, `core/README.md:28-31`).
- **Runtime requirements**: Store calls run in-process on **Linux only**; elsewhere they
  fail `Unsupported` — `api/how-to-use/agent.md:99-105`, `core/README.md:18-22`. Docker
  engine required (Sandboxes, Store volume); macOS/Windows go through a worker container
  (`api/how-to-use/runtime.md`, "Platforms and the worker"). The Rust native addon must
  be built: `npm --prefix api run build:native` — `api/README.md:70-73`.
- **Durability**: "Disposable/WAL/synchronous=OFF only. Durable execution is NOT_RUN —
  disabled by owner until explicit reauthorization" — `api/README.md:81-82`.
- **Precedent integration**: `plugins/magpie-layerfs/` wraps the SDK as MCP tools
  (`provision`/`checkpoint`/`fork`/`publish`/`exec`/…) and runs "every SDK call … in a
  child process shipped in the package, so the plugin host never imports the SDK"
  (plugins/magpie-layerfs/README.md, "How it works"). Its limits are instructive:
  "Verified on Linux only"; "Binary files cannot round-trip through the LayerFS fs
  surface: writes accept bytes, but `fs.read` refuses binary content (upstream issue
  #417)"; "`LayerFS.init` refuses a source tree on overlayfs".

**No git bridge exists.** A search across `api/` docs and `core/` crates for git
export/import surfaces (fast-import, bundle, `git-`) found nothing: LayerFS neither
reads nor writes git object stores anywhere in the checked-out tree. The Store's commit
identity is its own (`layerfs/commit/v3`, `api/how-to-use/agent.md`, "Messages" section).

---

## 2. The gate question: can a LayerFS commit produce a mergeable git ref?

**No — not without an added step.** `workspace.commit` (LayerFS) produces a Store Commit
(a content-addressed entry in `store.sqlite` on a Docker volume — `core/README.md:14-17,
34-37`). The gate consumes a git branch name (`src/index.ts:244` in pi-core-subagent)
and runs `git merge --no-ff`, which resolves `refs/heads/…` objects. No LayerFS
artifact satisfies that; the histories do not even share an object store.

**The needed bridge — export-to-git** (must be named, per the contract): after the child
finishes, a wrapper materializes the LayerFS branch's tree as a git commit on a
`subagents/<run>/<task>` branch:

- Option A — in-container git: `workspace.exec(ws, "git …")` against the FUSE mount
  `/workspaces/N` (`api/how-to-use/agent.md:161-166`), then transfer a bundle/pack out.
  **Unverified**: whether `LAYERFS_IMAGE` ships a git binary; if not, a custom image is
  required.
- Option B — host-side copy: `docker cp` the container's `/workspaces/N` to the host,
  then `git add -A && git commit` on the `subagents/` branch. Works with stock images;
  pays one full-tree copy per task (the dedup win is lost at the boundary — acceptable,
  it is once per task, and LayerFS's own docs show a plain copy of a 26.8 MB project
  costs ~321 ms, plugins/magpie-layerfs/README.md benchmark).
- Option C — host-side tree walk via `fs.list`/`fs.read` (`api/how-to-use/agent.md:264`)
  is **not** viable: `fs.read` refuses binary files (upstream #417,
  plugins/magpie-layerfs/README.md "Limits"), so any repo with binaries round-trips
  lossy.

Either way, LayerFS never *replaces* the merge — it can only *feed* it. Semantics that
differ even with the bridge: `git merge --no-ff` creates a merge commit in the user's
git main, whereas LayerFS-main would advance only via `branch.publish`
(`api/how-to-use/agent.md:269`) — two mains that must not be conflated.

---

## 3. Lifecycle mapping

| pi-workflows / pi-core-subagent step | git-worktree mechanism (cited) | LayerFS counterpart (cited) | Semantic differences |
| --- | --- | --- | --- |
| workspace create (write child dispatch) | `git worktree add -b <branch> <path> <base>` — `src/worktree.ts:90`; dir = `<git-common-dir>/subagents/<run>/<task>` — `src/worktree.ts:168-174` | `sandbox.create()` + `workspace.mount(sandbox, branch)` — `api/how-to-use/agent.md:165-166,265` (CLI `agent.md:404-405`) | LayerFS needs a pre-initialized project (Init **copies** the source tree — `agent.md:26`); worktree is a plain host dir, Workspace is a FUSE view inside a container; Sandbox auto-closes after 2 min idle (`agent.md:177-179`); 16 Workspaces/Sandbox cap; **no `.git` inside the Workspace** — child git workflows (`git status/diff` explicitly blessed by the child prompt, `src/manager.ts:600`) have nothing to operate on; shared `node_modules` symlink trick (`src/worktree.ts:91-97`) has no LayerFS equivalent (deps would live in the container) |
| commit (child ok:true) | `commitWorktree` → `git add -A` + `git commit --no-verify` — `src/worktree.ts:143,145`, called at `src/manager.ts:727`; branch + diff reported (`src/manager.ts:746-750`) | `workspace.commit(ws, message?, force?)` — `agent.md:265`, `core/README.md:34-37` | LayerFS commit = Store-internal, content-addressed, **not a git object**; branch head read/merge/publish handled inside the Store's write lane (`agent.md` "Writes") vs git's index/HEAD; diff parity exists (`branch.diff_branches`, `agent.md:266`; per-workspace `backend.daemon.workspace.list_changes`, `api/how-to-use/backend.md:29`) but nothing the gate can merge → **export-to-git bridge required (§2)** |
| gate merge (--no-ff into main) | leader/gate runs `git merge --no-ff <branch>` — contract at `src/index.ts:244`; cleanup of merged branches — `src/worktree.ts:206-230` | no counterpart; LayerFS-native `branch.merge` + `branch.publish` (`agent.md:266,269`) advance *LayerFS* main only | two divergent "main"s; publishing in LayerFS does not move the user's git main, and the gate cannot publish into the Store — the gate would have to be rewritten to drive LayerFS merges AND still update the real git repo |
| discard (empty/failed child) | `removeWorktree` → `git worktree remove --force` + `prune` — `src/worktree.ts:157-159,185-197`, at `src/manager.ts:818`; partial commit salvage first — `src/manager.ts:809` | `workspace.unmount(ws, discard?)` — `agent.md:265`; overlay deleted at unmount — `core/README.md:28-31`; then `sandbox.close` (`agent.md:177-179`) | pi *salvages* partial work as a commit before teardown (`src/manager.ts:809`); LayerFS unmount throws the overlay away — uncommitted changes are gone unless committed first (behavior of `unmount` without `discard` on a dirty Workspace is not specified in the docs read — unverified); Store durability is explicitly NOT_RUN (`api/README.md:81-82`) vs pi's crash recovery `reapDeadWorktrees` (`src/worktree.ts:254-271`) |

---

## 4. The three integration shapes

### (a) pi-core-subagent backend option (upstream change)

- **What it takes**: extract a `WorkspaceBackend` interface over the five touchpoints
  (`createWorktree` `src/worktree.ts:70`, `commitWorktree` `:128`, `branchDiff` `:149`,
  `removeWorktree` `:157`, recovery `:254`), replace the static imports
  (`src/manager.ts:56-62`) with an injected implementation, plumb a config through the
  extension settings and the `subagent` tool schema, then implement the LayerFS backend
  against `@layerfs/agent` (mirroring plugins/magpie-layerfs's child-process SDK
  isolation). `TaskSnapshot.branch` (`src/types.ts:53`) becomes backend-ref.
- **Effort: L** — upstream API design + review in a foreign repo (arhen/pi-extensions),
  plus the LayerFS backend itself.
- **Risk: M** — API churn on a 1.3.x extension; but even done, it does **not** clear the
  gate: the backend still cannot hand the gate a mergeable git ref without the §2
  export-to-git bridge, and the Workspace-locality blocker (§5, B2) still forces the
  child into the container.
- **Verdict: necessary-but-insufficient.** Only worth doing jointly with (b)-style
  wrapper work and the bridge; by itself it changes nothing observable.

### (b) pi-workflows-level wrapper (no dependency change)

- **What it would take**: pi-workflows already rewrites `subagent` tool inputs at
  dispatch (`extensions/index.ts:1012-1014`), so pre-create (project init, `branch.fork`,
  `sandbox.create`, `workspace.mount` — `agent.md:26,28,31,33`) and post-commit
  (`workspace.commit`, `unmount`, export-to-git) can hang around the dispatch call.
  But the child's file tools still need a cwd: pi-core-subagent picks `wt.path` or
  `task.cwd` (`src/manager.ts:543`) — both host paths; a LayerFS Workspace exposes **no
  host path** (FUSE inside the Sandbox container — `core/README.md:28-31`). Exploiting
  the not-a-git-repo fallback (`src/manager.ts:536`) to suppress the worktree leaves the
  child editing the real checkout — no isolation, the opposite of the point. Routing
  every child file operation through `layerfs workspace exec` (`agent.md:34`) would
  mean pi runs its whole session inside the container — that is a dispatch-mechanics
  rewrite, not a wrapper, and untested (image contents, auth, node availability).
- **Effort: L** (and that assumes the child-in-container rewrite counts as "wrapper").
- **Risk: H** — it fights the dependency's dispatch model at every step; the fallback
  path silently degrades isolation; export-to-git still needed.
- **Verdict: not plausible without upstream changes → stop rule hit.** This is the
  NO-GO feed.

### (c) Fork of pi-core-subagent

- **What it takes**: fork, replace the `worktree.ts` internals with LayerFS calls end to
  end (create/commit/diff/discard/recover), ship the native addon build and Docker
  dependency into pi-workflows' runtime, re-implement crash recovery (LayerFS Store
  gives no durability promise — `api/README.md:81-82`) and rework the gate to run the
  export-to-git bridge before `git merge --no-ff`.
- **Effort: L** — a maintained fork of a fast-moving extension (v1.3.68), plus ops.
- **Risk: H** — fork drift; Docker + Linux + addon build as hard runtime deps
  (`api/README.md:70-73`, `core/README.md:18-22`) versus today's zero-dep git
  (`src/worktree.ts` needs only the git binary); Linux-only Store calls make macOS
  hosts second-class (worker container route).
- **Verdict: technically reachable, only with the export-to-git bridge; cost/benefit
  poor against git worktrees.** Not recommended.

**Recommended shape if pursued later**: (a) + the §2 Option B bridge, behind an
opt-in config, with the gate unchanged — i.e. LayerFS as the *workspace medium* and git
as the *contract boundary*. That is a joint upstream + pi-workflows project (M–L), not a
spike deliverable.

---

## 5. Blockers

1. **BLOCKER (gate contract)**: a LayerFS workspace commit is a Store Commit, not a git
   object — `git merge --no-ff <branch>` (pi-core-subagent `src/index.ts:244`) has
   nothing to merge (`core/README.md:14-17,34-37`; `api/how-to-use/agent.md:267-271`).
   Resolution requires the export-to-git step named in §2; no wiring choice avoids it.
2. **BLOCKER (workspace locality)**: LayerFS Workspaces are FUSE mounts inside Sandbox
   containers (`core/README.md:24-31`); pi child agents need host-side paths
   (`src/manager.ts:543`). Without running the child in the container, the child cannot
   touch the workspace; with it, the whole dispatch model changes.
3. **Friction (environment)**: Docker engine + Linux-only Store calls + native addon
   build (`api/README.md:70-73`; `core/README.md:22`; `api/how-to-use/agent.md:99-105`)
   vs pi-core-subagent's git-only footprint. macOS/Windows need the worker container.
4. **Friction (durability/recovery)**: Store is Disposable/WAL/synchronous=OFF with
   durable execution NOT_RUN (`api/README.md:81-82`); pi-core-subagent's crash recovery
   re-commits dead worktrees (`src/worktree.ts:254-271`) — no LayerFS equivalent,
   uncommitted overlay is destroyed at unmount (`core/README.md:28-31`).
5. **Friction (in-workspace git)**: children are told `git status/diff` is fine
   (`src/manager.ts:600`); a LayerFS Workspace has no `.git`, so the child workflow
   contract degrades (whether a nested `git init` on the FUSE overlay works is
   unverified).

Blockers are stated explicitly per the spec; none is resolved by shapes (a) or (b) alone.

## 6. Not checked / unverified

- No builds or runtime verification (contract: read-only; TASK 1 owns the build). All
  claims are from source/docs at the pinned revisions.
- Whether `LAYERFS_IMAGE` ships git (§2 Option A) — unverified.
- `workspace.unmount` behavior on a dirty Workspace without `discard:true` — not
  specified in the docs read.
- `plugins/magpie-layerfs` native backend was read as a pattern, not executed.

*Citations resolve against: `/home/aurel/Documents/vibe/layerfs` (c77281e49),
`/home/aurel/.pi/agent/npm/node_modules/@arhen/pi-core-subagent` (1.3.68), and
`/home/aurel/Documents/github/pi-workflows/extensions/index.ts`.*
