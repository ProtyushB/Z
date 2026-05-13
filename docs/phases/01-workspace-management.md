# Phase 1 — Workspace Management

## ✅ Phase status — Closed (2026-05-13)

| Chunk | Title                 | Status                     |
| ----- | --------------------- | -------------------------- |
| 1     | SQLite foundation     | ✅ Closed (2026-05-12)     |
| 2     | Workspace CRUD UI     | ✅ Closed (2026-05-12)     |
| 3     | GitHub auth (PAT)     | ✅ Closed (2026-05-12)     |
| 4     | Git + cloning         | ✅ Closed (2026-05-12)     |
| 5     | Polish                | ✅ Closed (2026-05-13)     |

---

### ✅ Chunk 1 — SQLite foundation (closed 2026-05-12)

| Item                                                  | Status                          |
| ----------------------------------------------------- | ------------------------------- |
| Decision: sql.js (WASM) over better-sqlite3 (native)  | ✓                               |
| `npm install` (no native rebuild required)            | ✓                               |
| V001 migration (`__migrations`, `workspaces`)         | ✓                               |
| DB client with serialize-on-write persistence         | ✓                               |
| Migration runner (idempotent, transactional)          | ✓                               |
| Workspaces repo (CRUD-ready)                          | ✓                               |
| Zod schemas (`Workspace`, `CreateWorkspaceInput`)     | ✓                               |
| Wired into `app.whenReady()`                          | ✓                               |
| `npm run typecheck`                                   | ✓ clean                         |
| `npm test`                                            | ✓ 3 / 3                         |
| `npm run dev`                                         | ✓ migration logged, `x.db` 28 KB |
| Tables verified by direct query against `x.db`        | ✓ `__migrations`, `workspaces`  |

**Stack additions**

| Package            | Version | Why                                                     |
| ------------------ | ------- | ------------------------------------------------------- |
| `sql.js`           | ^1.12   | Pure-WASM SQLite — no native rebuild ever               |
| `@types/sql.js`    | ^1.4    | TypeScript types                                         |
| `zod`              | ^3.23   | Schema validation (workspace + future MCF)              |
| `react-router-dom` | ^6.28   | Renderer routing (Chunk 2+)                             |
| `zustand`          | ^5.0    | Renderer state (Chunk 2+)                               |
| `simple-git`       | ^3.27   | Git wrapper (Chunk 4)                                   |

**Files added**

- `resources/migrations/V001__init.sql`
- `src/main/paths.ts`
- `src/main/services/db/client.ts`
- `src/main/services/db/migrator.ts`
- `src/main/services/db/repositories/workspaces.repo.ts`
- `src/shared/schemas/workspace.ts`

**Files modified**

- `package.json` — dep swap (better-sqlite3 → sql.js) + new deps
- `electron-builder.yml` — `asarUnpack` for `**/sql.js/dist/sql-wasm.wasm`
- `src/main/index.ts` — `initDb` + `runMigrations` on `whenReady`, `closeDb` on `window-all-closed`

**Issues & resolutions**

1. **`better-sqlite3` failed to compile** for Electron 42 — no prebuilt binary exists for that combination yet, so npm fell back to building from source, which needs Python 3 + Visual Studio Build Tools (neither installed). → Switched to `sql.js` (pure WebAssembly). Slight perf tradeoff that's invisible at X's data scale; eliminates the entire native-rebuild dance for SQLite forever. Any future native module (image processing, ML, etc.) will face the same toolchain decision.
2. **Vite 8 / `@vitejs/plugin-react` peer-dep warning** when installing new deps. → Installed with `--legacy-peer-deps`. Cosmetic warning, not a real incompatibility — build and tests pass green.
3. **Workspaces dir deviation from doc.** Doc said `~/.x-workspaces`. Switched to `app.getPath('userData')/workspaces` to keep all X-owned state (DB + logs + workspaces) under one OS-conventional directory.

**Architectural notes for future chunks**

- The DB is in-memory; `persist()` writes the whole serialized bytes to disk after every successful write. At X's data scale (KBs) this is fast. If write volume grows in Phase 2+ (slice events), we'll revisit with a debounced persist.
- Query helpers (`query`, `queryOne`, `run`) hide sql.js's verbose `prepare → bind → step → getAsObject → free` pattern.
- All future repositories follow `workspaces.repo.ts` shape: snake_case DB rows in, camelCase types out, explicit mapping function, no ORM.

---

### ✅ Chunk 2 — Workspace CRUD UI (closed 2026-05-12)

| Item                                                      | Status                |
| --------------------------------------------------------- | --------------------- |
| IPC contracts expanded (`workspace:list/get/create/delete`) | ✓                   |
| Generic `registerHandler` + `emit` helpers                | ✓                     |
| Workspace handlers (Zod-validated at the IPC boundary)    | ✓                     |
| Wired into `app.whenReady()`                              | ✓                     |
| `App.tsx` switched to `HashRouter`                        | ✓                     |
| `WorkspaceList` route (empty state + list + delete)       | ✓                     |
| `WorkspaceSetup` route (form + URL regex validation)      | ✓                     |
| Zustand store (`useWorkspaceStore`)                       | ✓                     |
| Format helpers (`formatRelative`, `shortRepoLabel`)       | ✓                     |
| E2E test fixed (launch via project dir, not script path)  | ✓                     |
| `npm run typecheck`                                       | ✓ clean               |
| `npm test`                                                | ✓ 3 / 3               |
| `npm run e2e`                                             | ✓ passed              |
| Manual smoke (create / persist across restart / delete)   | ✓ verified by user    |

**Files added**

- `src/main/ipc/registry.ts`
- `src/main/ipc/workspace.handlers.ts`
- `src/renderer/routes/WorkspaceList.tsx`
- `src/renderer/routes/WorkspaceSetup.tsx`
- `src/renderer/stores/workspace.store.ts`
- `src/renderer/lib/format.ts`

**Files modified**

- `src/shared/ipc/contracts.ts` — added workspace procedures
- `src/main/index.ts` — calls `registerWorkspaceHandlers()` after migrations
- `src/renderer/App.tsx` — `HashRouter` shell with two routes
- `tests/e2e/launches.spec.ts` — asserts "Workspaces" H1, launches via project directory

**Issues & resolutions**

1. **E2E test failed: "Target page, context or browser has been closed."** Cause: passing `out/main/index.js` as the script path to `electron.launch()` doesn't initialize the app lifecycle in Electron 42 — the process exits silently within ~5 s. → Switched the test to launch with the project directory (`path.join(__dirname, '..', '..')`) so Electron resolves `package.json#main` itself, mirroring how `electron .` and the packaged installer behave.
2. **React Router future-flag console warnings** during dev (`v7_startTransition`, `v7_relativeSplatPath`). Cosmetic only; opt-in flags can be added later.

**Decision notes**

- `WorkspaceList` uses `window.confirm` for the delete confirmation — minimal, no shadcn Dialog needed yet. Phase 9 polish can swap in a styled confirmation modal.
- URL regex accepts any HTTPS git host (not just github.com); the IPC handler additionally Zod-validates, so the renderer regex is purely for UX feedback.
- HashRouter (not BrowserRouter) so file:// production builds work without server-side rewrites.

---

### ✅ Chunk 3 — GitHub auth (PAT) (closed 2026-05-12)

| Item                                                  | Status                  |
| ----------------------------------------------------- | ----------------------- |
| V002 migration (`secrets` table)                      | ✓ applied on existing `x.db` |
| `secretStore` (safeStorage encryption + DB persistence) | ✓                     |
| `githubTokenStore` single-user facade                 | ✓                       |
| `githubAuth.validate / setPat / status / logout`      | ✓                       |
| IPC channels (`setPat`, `status`, `logout`)           | ✓                       |
| `GithubLoginPanel` component                          | ✓                       |
| Mounted above `WorkspaceSetup` form                   | ✓                       |
| `npm run typecheck`                                   | ✓ clean                 |
| `npm test`                                            | ✓ 3 / 3                 |
| `npm run e2e`                                         | ✓ passed                |
| Manual smoke: real PAT validation + persistence       | ✓ verified by user      |

**Files added**

- `resources/migrations/V002__secrets.sql`
- `src/main/services/github/tokenStore.ts`
- `src/main/services/github/auth.service.ts`
- `src/main/ipc/github.handlers.ts`
- `src/renderer/components/GithubLoginPanel.tsx`

**Files modified**

- `src/shared/ipc/contracts.ts` — 3 new GitHub auth procedures
- `src/main/index.ts` — calls `registerGithubHandlers()` after workspace handlers
- `src/renderer/routes/WorkspaceSetup.tsx` — mounts `GithubLoginPanel` above the form

**Issues & resolutions**

1. None — Chunk 3 went cleanly. The Chunk 1 decision to skip `keytar` and use Electron's `safeStorage` paid off: PAT storage works on Windows without any rebuild or native dep.

**Decision notes**

- Deviated from the doc's planned "OAuth device flow" → PAT entry. Simpler (no OAuth App registration), same end state (encrypted token in OS keychain via `safeStorage`), no UX downside for a single-user dev tool. The doc was written before this design tradeoff was visible.
- The `secrets` table is intentionally generic (`service` + `account` PK). Same table will store the Anthropic API key under `service = "anthropic"` in Phase 3.
- Token never enters logs: pino redact strips `authorization`, the IPC handler never echoes the token back, and GitHub's error bodies are parsed for `.message` only (no token round-tripping).

---

### ✅ Chunk 4 — Git + cloning (closed 2026-05-12)

| Item                                                  | Status                          |
| ----------------------------------------------------- | ------------------------------- |
| `git.service.clone` (token-injected URL, error redaction) | ✓                           |
| `workspace.service.cloneRepos` (all-or-nothing, cleanup on failure) | ✓             |
| IPC channel `workspace:cloneRepos`                    | ✓                               |
| Store `clone(id)` with surgical row update            | ✓                               |
| `WorkspaceRow` Clone button + busy state + inline error | ✓                           |
| URL normalization (`github.com/x/y`, `owner/repo` shorthand) | ✓                       |
| IPC error-envelope stripping (clean UI messages)      | ✓                               |
| `npm run typecheck`                                   | ✓ clean                         |
| `npm test`                                            | ✓ 3 / 3                         |
| `npm run e2e`                                         | ✓ passed                        |
| Manual smoke: real clone end-to-end                   | ✓ verified by user              |
| Token-redaction sanity check (bad URL)                | ✓ no `ghp_*` in error           |
| Auth-missing path (clone while signed out)            | ✓ inline error, no network call |
| Multi-workspace independence (one errors, other stays cloned) | ✓                       |
| Delete preserves cloned files (Chunk 4 behavior)      | ✓ — note: changed in Chunk 5    |

**Files added**

- `src/main/services/git/git.service.ts`
- `src/main/services/workspace/workspace.service.ts`

**Files modified**

- `src/shared/ipc/contracts.ts` — `workspace:cloneRepos` channel
- `src/main/ipc/workspace.handlers.ts` — `cloneRepos` handler
- `src/renderer/stores/workspace.store.ts` — `clone(id)` action
- `src/renderer/routes/WorkspaceList.tsx` — extracted `WorkspaceRow`, Clone button + busy state
- `src/renderer/routes/WorkspaceSetup.tsx` — URL normalization, live "Will clone from: …" hint
- `src/renderer/lib/ipc.ts` — strip Electron's `"Error invoking remote method 'X': Error:"` wrapper from all IPC errors

**Issues & resolutions**

1. **URL strict-form was too strict.** Form rejected `github.com/owner/repo` (no scheme) and `owner/repo` shorthand. → Added `normalizeRepoUrl()` that coerces both forms to canonical `https://github.com/owner/repo`. Strict regex still runs on the normalized output; the canonical URL is what gets stored. Live "Will clone from: …" hint shows the user exactly what gets used.
2. **IPC error messages bled implementation detail.** Clone failures displayed as `"Error invoking remote method 'workspace:cloneRepos': Error: git clone failed: …"`. → Wrapped `ipc.invoke` in `lib/ipc.ts` to strip the Electron envelope. Applies to every IPC error in X.

**Decision notes**

- Clone is all-or-nothing: if either repo fails, both destination dirs are removed so retries start clean. Considered "resume from partial" — punted as future polish.
- Errors from `git` are scrubbed of the PAT before being surfaced (defense-in-depth on top of the URL injection that already keeps the token off command-line history).
- Clone vs. push split: clone is Phase 1, push is Phase 6. Today's clone uses HTTPS-with-token, which also works for push when we get there.

---

### ✅ Chunk 5 — Polish (closed 2026-05-13)

| Item                                                                          | Status                          |
| ----------------------------------------------------------------------------- | ------------------------------- |
| Per-workspace GitHub PAT (V003 migration + `workspace_secrets` table)         | ✓                               |
| `WorkspaceDetail` route at `/workspaces/:id`                                  | ✓                               |
| `WorkspaceList` becomes clickable cards (Clone/Delete moved to detail)        | ✓                               |
| Open folder via `shell.openPath`                                              | ✓ verified by user              |
| Reference scanner skeleton (lists ModuleX verticals + entity hints)           | ✓ verified against real ModuleX |
| Destructive delete (DB row + cloned files + cascade secrets)                  | ✓ verified by user              |
| EPERM-on-rm fix (chmod-before-rm for git pack files on Windows)               | ✓                               |
| Friendly name-collision error                                                 | ✓ verified by user              |
| FK enforcement actually works (PRAGMA via exec, re-applied after `persist()`) | ✓ verified by cascade test      |
| V004 migration cleans orphan `workspace_secrets`                              | ✓ applied on user's DB          |
| Tests: format (14), migrator (4), workspaces.repo (7)                         | ✓ 31 / 31 passing               |
| `npm run typecheck`                                                           | ✓ clean                         |
| `npm test`                                                                    | ✓ 31 / 31                       |
| `npm run e2e`                                                                 | ✓ passed                        |
| Manual smoke (cascade, auth isolation, collision, open folder)                | ✓ all verified by user          |

**Files added**

- `resources/migrations/V003__workspace_secrets.sql`
- `resources/migrations/V004__cleanup_orphan_workspace_secrets.sql`
- `src/main/services/reference/referenceScanner.ts`
- `src/renderer/routes/WorkspaceDetail.tsx`
- `tests/unit/format.test.ts`
- `tests/unit/migrator.test.ts`
- `tests/unit/workspaces.repo.test.ts`

**Files modified**

- `src/shared/ipc/contracts.ts` — GitHub auth channels take `workspaceId`; `workspace:openFolder`, `reference:scan`
- `src/main/services/github/tokenStore.ts` — split into `secretStore` (global) + `workspaceSecretStore` (per-workspace) + `githubTokenStore` facade
- `src/main/services/github/auth.service.ts` — `workspaceId`-scoped `setPat` / `status` / `logout`
- `src/main/ipc/github.handlers.ts` — passes `workspaceId` through
- `src/main/services/workspace/workspace.service.ts` — destructive delete with chmod-before-rm cleanup; `openFolder`
- `src/main/ipc/workspace.handlers.ts` — `openFolder` + `reference:scan` handlers
- `src/main/services/db/client.ts` — `configureConnection` (PRAGMA `foreign_keys=ON` via `exec`); `_setDbForTesting`; `persist()` re-applies pragma after `export()`
- `src/main/services/db/migrator.ts` — accepts optional `dir` param so tests can run without Electron
- `src/main/services/db/repositories/workspaces.repo.ts` — friendly UNIQUE-constraint error
- `src/renderer/lib/format.ts` — `normalizeRepoUrl` extracted from `WorkspaceSetup`
- `src/renderer/components/GithubLoginPanel.tsx` — `workspaceId` prop, `onStatusChange` callback (single source of truth for auth state on detail page)
- `src/renderer/routes/WorkspaceSetup.tsx` — removed embedded auth panel, uses `normalizeRepoUrl`, navigates to detail on create
- `src/renderer/routes/WorkspaceList.tsx` — clickable cards only, no inline action buttons
- `src/renderer/stores/workspace.store.ts` — `clone` / `remove` / `openFolder` per-workspace
- `src/renderer/App.tsx` — added `/workspaces/:id` route

**Issues & resolutions**

Five distinct bugs surfaced during Chunk 5, three of them stacked so each masked the next:

1. **EPERM on workspace deletion.** Git writes pack/idx files as read-only on Windows; Node's `fs.rmSync({ force: true })` doesn't auto-chmod them, so it throws `EPERM` partway through and aborts. → `cleanup()` now walks the tree and chmods writable before `rmSync`. Same fix benefits clone-retry cleanup.

2. **Race between two `github:auth:status` fetches.** `WorkspaceDetail` and `GithubLoginPanel` each independently called the same IPC and stored their own copy. Sign-in inside the panel updated the panel's display, but the parent's state stayed stale — Clone button kept reading "Sign in to GitHub first" while the green-text panel said "Signed in." → Panel now owns the auth state and lifts changes up via an `onStatusChange` callback. Single source of truth.

3. **FK enforcement was silently a no-op.** Three sub-bugs stacked:
   - `db.pragma('foreign_keys = ON')` carried over from the better-sqlite3 prototype; sql.js's `Database` has no `pragma` method. (Typed but no-op at runtime — TypeScript didn't catch it because it ran on the singleton via `_db.pragma` style; we'd need stricter types to surface this.)
   - Switching to `db.run('PRAGMA …')` also silently fails — `db.run` uses `sqlite3_prepare`, and SQLite rejects PRAGMA through the prepare path. Must be `db.exec` (`sqlite3_exec`).
   - Even after fixing both, FK was 0 in tests. Isolated repro caught it: **`db.export()` resets per-connection pragmas in sql.js.** Since `persist()` calls `export()` after every write, FK got flipped back off immediately.

   → `configureConnection()` uses `db.exec` for the pragma, called from `initDb()`, `_setDbForTesting()`, AND **re-applied inside `persist()` after `export()`**. New cascade test exercises the full delete-cascade path through `workspacesRepo.delete()` — would have caught this from day one.

4. **Orphan `workspace_secrets`.** Direct consequence of #3: every workspace delete between V003 and the FK fix left the secret row behind. → V004 migration: `DELETE FROM workspace_secrets WHERE workspace_id NOT IN (SELECT id FROM workspaces)`. One-time cleanup; future deletes cascade automatically now that FK is real.

5. **IPC error envelope leaking into UI** (carried over from Chunk 4 polish during this chunk). Errors displayed as `"Error invoking remote method 'X': Error: …"`. → `lib/ipc.ts` strips the envelope; applies to every IPC error in X.

**Decision notes**

- **Destructive delete.** Original doc said "preserve files on delete." User explicitly flipped this in Chunk 5: delete now removes the workspace dir + cascades the secret row. The confirm dialog warns clearly.
- **Per-workspace tokens.** V003 used `CROSS JOIN` to migrate the existing global GitHub PAT to all then-existing workspaces, so the user wasn't forced to re-paste. New workspaces start unauthenticated and require their own PAT (per-workspace identity).
- **`WorkspaceDetail` as a new route.** Alternatives considered: expand-on-click on the list, modal panels. Detail route is cleaner architecturally and sets up Phase 2+ work (per-workspace MCFs, runs, settings).
- **Reference scanner is intentionally minimal.** Just directory names + controller filenames. Phase 2's MCF authoring will need deeper parsing (read entity classes for field info). Sufficient for "we can show the user what's in the cloned backend."
- **Lesson recorded for Phase 2+.** When a bug class spans configuration vs. declaration (the FK enforcement bug), the test must exercise the actual runtime path. The schema-level FK-list pragma test in `migrator.test.ts` passed cleanly — but didn't catch the runtime regression. Always pair declarative tests with behavioral ones.

**Architectural state at phase close**

- Three migrations applied (V001 init, V002 secrets, V003 workspace_secrets, V004 orphan cleanup).
- Two storage scopes for credentials: `secrets` (global, for Phase 3's Anthropic key) and `workspace_secrets` (per-workspace, currently just GitHub PATs).
- IPC contract has 12 procedures (`app:ping`, 6 workspace, 3 github, 1 reference scan). Pattern established for Phase 2+ growth.
- Renderer has 3 routes (list, setup, detail) using `HashRouter`, plus 1 panel component.
- 31 unit tests covering migrator, repo, format helpers, IPC types.

---

> **Goal:** User registers two repos as a workspace, logs into GitHub from X, X clones them locally.
> **Duration:** ~1–2 weeks (actual: ~2 working days)
> **Status:** ✅ Closed (2026-05-13)
> **Depends on:** Phase 0
> **Unlocks:** Every repo-touching phase (2+)

## Deliverable

The user opens X, sees a workspace list (empty initially), creates a workspace by giving it a name and the two repo URLs, logs into GitHub via device flow, and clicks "Clone." X clones both repos under `~/.x-workspaces/<workspace-id>/{backend,frontend}` and records paths. A re-launched X remembers the workspace.

## Acceptance criteria

- [ ] SQLite file created at `app.getPath("userData")/x.db` on first launch.
- [ ] V001 migration runs on first launch, creates `workspaces` and `__migrations` tables.
- [ ] `WorkspaceList` route shows all registered workspaces.
- [ ] `WorkspaceSetup` route accepts name + 2 repo URLs, validates URLs.
- [ ] GitHub device-flow login works end-to-end; token stored in OS keychain via keytar.
- [ ] `Clone` action clones both repos with authentication for private repos.
- [ ] Workspace persists across app restarts.
- [ ] Delete workspace removes its DB row (with confirmation). Cloned files remain on disk by default.
- [ ] Error states surface in UI: invalid URL, auth failure, clone failure (network, disk space, perms).
- [ ] No GitHub token ever appears in any log file.

## In scope

- SQLite client + migrator + first migration.
- Workspaces repository + IPC handlers.
- GitHub OAuth (device flow) + keytar.
- simple-git wrapper with clone + status.
- UI: workspace list, create, GitHub login panel.
- Reference scanner (lightweight — Phase 2 uses it; included here for the clone-completed signal).

## Out of scope

- Push (Phase 6).
- Pull updates after clone (Phase 6 — simple "Sync" button).
- MCF authoring (Phase 2).
- Any agents (Phase 3+).

## Architecture introduced

- **SQLite singleton** in main, accessed only via repositories.
- **Migration runner**: scans `resources/migrations/V*.sql`, runs anything not yet applied, records in `__migrations`.
- **Keytar-backed token store**: GitHub token under service `"x-github"`, account = GitHub username.
- **simple-git wrapper**: every git call funneled through one service so auth, logging, error handling are uniform.

## Files to create

### Migrations — `resources/migrations/`
- `V001__init.sql` — `__migrations`, `workspaces` tables.

### Shared
- `src/shared/schemas/workspace.ts` — Zod schema for Workspace.

### Main — `src/main/`
- `services/db/client.ts` — better-sqlite3 singleton.
- `services/db/migrator.ts` — the ~30-line SQL runner.
- `services/db/repositories/workspaces.repo.ts`.
- `services/github/oauth.service.ts` — device flow.
- `services/github/tokenStore.ts` — keytar wrapper.
- `services/git/git.service.ts` — simple-git wrapper.
- `services/workspace/workspace.service.ts` — orchestrates create → clone.
- `services/reference/referenceScanner.ts` — initial version.
- `ipc/registry.ts` — `registerHandler` + `emit` helpers.
- `ipc/workspace.handlers.ts`.
- `ipc/github.handlers.ts`.
- `paths.ts` — resolves userData, workspaces dir.

### Renderer
- `routes/WorkspaceList.tsx`.
- `routes/WorkspaceSetup.tsx`.
- `components/GithubLoginPanel.tsx`.
- `stores/workspace.store.ts` — Zustand.
- `lib/format.ts` — date formatting, URL shortening.

### Shared (IPC expansion)
Add to `src/shared/ipc/contracts.ts`: `workspace:list`, `workspace:create`, `workspace:delete`, `workspace:cloneRepos`, `github:auth:start`, `github:auth:poll`, `github:auth:logout`, `github:auth:status`.

## Build order

### Day 1–2: SQLite + migrations
1. Install `better-sqlite3`; wire `@electron/rebuild` in `postinstall`.
2. `migrator.ts`: read `resources/migrations/*.sql` in order, check `__migrations`, run pending in a transaction.
3. `V001__init.sql`.
4. First launch: `x.db` file with both tables.

### Day 3: workspaces CRUD (no clone yet)
1. `workspaces.repo.ts` — `list`, `create`, `delete`, `get`.
2. IPC handlers wire to repo.
3. UI: `WorkspaceList` with empty state + "New" button.
4. UI: `WorkspaceSetup` with form fields + URL validation.
5. Smoke: create workspace → list → restart → still there.

### Day 4–5: GitHub auth
1. `tokenStore.ts` — keytar set/get/delete.
2. `oauth.service.ts` — POST `device/code`, poll `oauth/access_token`.
3. `GithubLoginPanel.tsx` — displays user code + verification URL + live status.
4. On success, fetch `/user` → store username + token.
5. IPC: `github:auth:status` returns `{ authenticated, username }`.

### Day 6: git + clone
1. `git.service.ts` — simple-git wrapper; clone URL formatted as `https://x-access-token:<token>@github.com/owner/repo.git`.
2. `workspace.service.ts` `cloneRepos(workspaceId)`: ensure dirs, clone BE, clone FE, update workspace row.
3. UI: "Clone" button, progress streamed as `event:log` lines.
4. Test on a real private repo.

### Day 7: polish
1. Error UI for each failure: invalid URL, auth needed, clone error.
2. Delete workspace dialog.
3. Reference scanner: lists module folders under `<backend>/src/main/java/com/modulex/modules/`.
4. Manual smoke: full setup flow from blank install.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `better-sqlite3` native rebuild fails on Electron's Node version | High | `@electron/rebuild` in `postinstall`. Pin Electron version. |
| GitHub device-flow rate-limited during dev | Low | Cache token aggressively; only refresh on explicit logout. |
| `simple-git` clone hangs on Windows long paths | Medium | Enable long-path support via `git config --system core.longpaths true` (document, don't auto-set). |
| OAuth token leaks into logs | High | Add a redactor in pino that masks `Bearer ...` and `x-access-token:...` patterns. |

## Test plan

### Unit (Vitest)
- `migrator.ts` — temp directory, three migrations, runs in order, skips already-applied.
- `tokenStore.ts` — mocks keytar, asserts set/get/delete.
- `workspaces.repo.ts` — in-memory SQLite, CRUD round-trip.

### Integration
- Tmp dir + real `.git` repo, clone via `git.service.ts`, assert files exist.

### E2E (Playwright)
- Launch, create workspace with mocked GitHub auth (intercept HTTP), assert workspace appears.

### Manual smoke
- Real GitHub login.
- Real clone of ModuleX + Centrix.
- Delete workspace with confirm.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] Tests passing.
- [ ] Clean install → real workspace with both repos cloned in < 5 minutes.
- [ ] Token never appears in any log file (verify via redactor test).
- [ ] No phase-scoped TODOs.

## Next phase

Phase 2 — MCF Authoring.
