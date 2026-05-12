# Phase 6 — Diff Review & Manual Push

> **Goal:** Review the per-repo diff in a Monaco viewer; click Push to ship the feature branch.
> **Duration:** ~1 week
> **Status:** Not started
> **Depends on:** Phase 5
> **Unlocks:** A complete create-module workflow

## Deliverable

After a module run succeeds, the UI shows two side-by-side review pages — BE branch and FE branch. Each shows file tree + Monaco diff. A push button per repo runs `git push origin <branch>` and returns the GitHub commit URL. The user always clicks Push manually — there is no auto-push.

## Acceptance criteria

- [ ] After `run.succeeded`: a "Review" button leads to the diff view.
- [ ] Diff view: left pane is file tree of changed files; right pane is Monaco read-only diff.
- [ ] BE and FE tabs.
- [ ] Branch info bar: branch name, commits ahead/behind main, dirty flag.
- [ ] Push button per repo, with a confirmation dialog showing remote + branch.
- [ ] Push uses the stored GitHub token; private repos work.
- [ ] After push: GitHub URL displayed; "Open on GitHub" link.
- [ ] Push to `main`/`master` blocked unless user explicitly overrides (warned twice).
- [ ] Token never appears in any displayed URL or log.

## In scope

- Monaco diff viewer.
- Git diff/status/push handlers.
- Push button UI.
- Branch status component.

## Out of scope

- PR creation (could be added later via `gh`).
- Force push (deliberately not supported).
- Rebase (deliberately not supported).
- Auto-push (deliberately not supported per locked decision).

## Files to create

### Main
- `services/git/git.service.ts` — expand: `diffSummary`, `diff`, `push`, `getRemotes`.
- `ipc/git.handlers.ts` — branchInfo, diff, push.

### Renderer
- `routes/RunReview.tsx` — top-level review page.
- `features/git/BranchStatus.tsx`.
- `features/git/RepoDiffPane.tsx` — file tree + Monaco diff.
- `features/git/PushButton.tsx`.
- `features/git/PushConfirmDialog.tsx`.
- `components/MonacoDiffViewer.tsx`.

## Build order

### Day 1: diff IPC + raw API
1. `git.service.ts` `diffSummary` — list changed files.
2. `git.service.ts` `diff(filePath?)` — unified diff (full repo if no path).
3. IPC: `git:branchInfo`, `git:diff`.

### Day 2–3: Monaco + diff UI
1. Install `monaco-editor` + `@monaco-editor/react`; configure read-only.
2. `MonacoDiffViewer` component.
3. `RepoDiffPane` — file tree left, viewer right.
4. `RunReview` route with BE/FE tabs.

### Day 4: branch status
1. `BranchStatus.tsx` — current branch, ahead/behind, dirty.
2. Refresh on focus.

### Day 5: push
1. `git.service.ts` `push(remote, branch)` using stored token.
2. `git:push` IPC.
3. `PushButton` + `PushConfirmDialog`.
4. Block on main/master with explicit override.
5. After push: parse GitHub URL from remote → display + open in browser.

### Day 6–7: polish + edge cases
1. Empty diff state.
2. Already-pushed branch (no-op, "Up to date").
3. Stale token (re-auth flow).
4. Smoke: full spa workflow → review → push to a test repo.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Monaco bundle size | Low | Lazy-load the diff viewer route. |
| Very large diffs hang Monaco | Medium | Per-file rendering; warn for diffs > 5,000 lines. |
| Token scope insufficient for push | Medium | Verify scope on auth; re-auth with `repo` scope if needed. |
| Push protection on main branch | Medium | Detect via API; warn user with the specific reason. |

## Test plan

### Unit
- `git.service.ts` against tmp git repo with known commits.

### E2E
- Full review flow against tmp repo (no remote push in CI).

### Manual smoke
- Push to a private test repo; verify commit URL.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] Push to main blocked unless overridden.
- [ ] Token leak audit: no token in any URL displayed in UI or log.

## Next phase

Phase 7 — Test Run & Fix Loop.
