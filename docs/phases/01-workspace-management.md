# Phase 1 — Workspace Management

> **Goal:** User registers two repos as a workspace, logs into GitHub from X, X clones them locally.
> **Duration:** ~1–2 weeks
> **Status:** Not started
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
