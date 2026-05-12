# Phase 9 — Polish & Distribution

> **Goal:** X is signed-installer-ready for Windows, auto-updates from GitHub Releases, has a full settings panel, log viewer, run history, and a first-run setup wizard that gets the user from "fresh PC" to "ready to scaffold" without manual debugging.
> **Duration:** ~1–2 weeks
> **Status:** Not started
> **Depends on:** Phase 8
> **Unlocks:** Production use

## Deliverable

A polished, distributable X. Installable from a Windows NSIS installer. Auto-updates from GitHub Releases. **First launch runs a setup wizard that detects Git, Node.js, Java 21+, Docker (optional), and an Anthropic API key — missing or wrong-version prerequisites surface with one-click links to the official installers and a "Re-check" button.** Settings panel exposes all knobs. Log pane shows live structured logs. Run history lists past module + test runs with drill-in. README + USER_GUIDE + CHANGELOG complete.

## Acceptance criteria

- [ ] `npm run dist:win` produces a signed installer (or unsigned with documented SmartScreen workaround).
- [ ] Auto-updater pulls latest from GitHub Releases; respects "check for updates" toggle.
- [ ] Settings panel: Anthropic key, models, defaultBackendBranch, defaultFrontendBranch, fixLoopMaxAttempts, testStackPort.
- [ ] LogPane: live `event:log` stream, level filter, source filter, copy-to-clipboard, download log file.
- [ ] Run history list per workspace; filter by status/date/module.
- [ ] CHANGELOG.md auto-generated from conventional commits via a script.
- [ ] README.md user-facing: install, first run, workflow.
- [ ] Crash reporting: errors in main process surface to UI, never silent.
- [ ] **First-run dependency check** detects Git, Node, Java (with version), Docker, and Anthropic key on first launch.
- [ ] Missing or wrong-version dependencies show install links to the official sources, with copyable commands for verification (`git --version`, etc.).
- [ ] Dependency status accessible later from **Settings → Dependencies** tab; re-runs the check on demand.
- [ ] First-run wizard cannot be dismissed while a **required** dependency is missing (Git, Node, Java, Anthropic key). Docker is **optional** — wizard lets the user proceed and warns only when they later choose integration scope in Phase 7.
- [ ] First-time user completes the spa workflow in < 30 minutes following USER_GUIDE.

## In scope

- electron-builder NSIS config for Windows.
- electron-updater wiring.
- Settings UI.
- Log pane.
- Run history.
- Documentation.
- CHANGELOG automation.
- Crash reporting (in-app, no external service).
- **First-run dependency checker + setup wizard.**
- **Settings → Dependencies tab** for on-demand re-checks.

## Out of scope

- Mac/Linux installers (later if needed).
- Telemetry / analytics (deliberately not added).
- Multi-user / cloud sync (deliberately not in scope for X).
- Bundling portable Git/Node/Java inside the installer (size cost not worth it; detect + link instead).

## Architecture introduced

- **Dependency checker service** in main: detects external tools via `child_process` + `--version`, parses output, evaluates against required min versions, returns a normalized status report.
- **First-run gate**: app boot checks for any workspace in SQLite. None → show `FirstRun` route instead of `WorkspaceList`. Requires all hard prereqs green before exiting the wizard.
- **Cached dependency status**: results stored in SQLite settings table; invalidated by explicit "Re-check" or by the orchestrator before any operation that needs the dep (e.g., Phase 7 integration scope re-checks Docker before compose up).

## Files to create

### Build
- Expand `electron-builder.yml` for NSIS + (eventually) signing.
- `scripts/generate-changelog.mjs` — conventional-commits → markdown.

### Main
- `services/autoUpdate.ts` — electron-updater wiring.
- `services/crashReporter.ts` — capture unhandled exceptions, log, emit log event.
- `services/dependencies/dependencyChecker.ts` — detect Git, Node, Java, Docker; parse versions; evaluate against minimums.
- `services/dependencies/installerLinks.ts` — canonical URLs (Adoptium JDK 21, Node LTS, Git for Windows, Docker Desktop, Anthropic console).
- `ipc/dependencies.handlers.ts` — `dependencies:check`, `dependencies:recheck`.

### Renderer
- `routes/Settings.tsx` — full settings, with new **Dependencies** tab.
- `routes/RunHistory.tsx` — module + test runs.
- `routes/LogViewer.tsx` — full-page log.
- `routes/FirstRun.tsx` — first-run setup wizard.
- `features/setup/DependencyChecklist.tsx` — live check with green/yellow/red status icons + per-row "How to install" expanders.
- `features/setup/InstallerLinks.tsx` — buttons that open the official installer pages in the system browser.
- `features/setup/AnthropicKeyStep.tsx` — paste-and-validate step.
- `components/LogPane.tsx` — embedded log pane.

### Docs
- `README.md` — top-level.
- `CHANGELOG.md` — generated.
- `docs/USER_GUIDE.md` — first-run walkthrough.

## What the dependency checker detects

| Dependency | Required? | Min version | Detection command | Used in |
|---|---|---|---|---|
| Git | ✅ Required | 2.30+ | `git --version` | All git ops (Phase 1+) |
| Node.js | ✅ Required | 18 LTS+ | `node --version` | FE build/test (Phase 5, 7) |
| Java | ✅ Required | 21+ | `java -version` (parses stderr) | BE build/test (Phase 4, 7) |
| Docker | ⚠️ Optional | 20+ | `docker --version` | Integration tests only (Phase 7) |
| Anthropic API key | ✅ Required | — | Test call to `/v1/messages` with 1 token | All agents (Phase 3+) |
| GitHub login | ⚠️ Deferred | — | Already gated by Phase 1 setup | Push (Phase 6) |

Each row in the checker shows: status icon, detected version (or "Not found"), required version, "Install" button (opens installer URL), and "Re-check" affordance.

## Build order

### Day 1–2: settings + log pane
1. Settings UI for all keys.
2. LogPane component with live subscription to `event:log`.
3. LogViewer route with filter/search/download.

### Day 3: run history
1. RunHistory route — combined module + test runs, sortable.
2. Drill-in to past run detail.

### Day 4: first-run dependency check
1. `dependencyChecker.ts` — shell out to detect each dep in parallel:
   - `git --version` → parse "git version X.Y.Z"
   - `node --version` → parse "vX.Y.Z"
   - `java -version` → **stderr** parse "openjdk version \"X...\""
   - `docker --version` → parse "Docker version X.Y.Z"
   - Each returns `{ present: boolean; version: string | null; ok: boolean; reason?: string }`.
2. `installerLinks.ts` — canonical URLs:
   - JDK 21: `https://adoptium.net/temurin/releases/?version=21`
   - Node LTS: `https://nodejs.org/`
   - Git for Windows: `https://git-scm.com/download/win`
   - Docker Desktop: `https://www.docker.com/products/docker-desktop/`
   - Anthropic console: `https://console.anthropic.com/`
3. `FirstRun.tsx` route — shown when no workspace exists OR opened from Settings → Dependencies.
4. `DependencyChecklist.tsx` — status per dependency; "Re-check" button; "How to install" expandable per row with the install link + the verification command.
5. `AnthropicKeyStep.tsx` — paste the key, validate with a 1-token test call, store in keychain.
6. Settings → Dependencies tab uses the same `DependencyChecklist`.
7. Gate: cannot complete the wizard while any **required** dep is missing.

### Day 5–6: packaging
1. `electron-builder.yml` NSIS config.
2. Asset bundling: `prompts/`, `resources/migrations/`, `resources/test-stack/`.
3. `npm run dist:win` produces installer.
4. Test on clean Win11 VM.

### Day 7: auto-update
1. electron-updater wired to GitHub Releases.
2. Settings toggle: "Check for updates on launch."
3. Manual test: publish a release, see update prompt.

### Day 8: crash reporting
1. `crashReporter.ts` captures `unhandledRejection` + `uncaughtException`.
2. Surface via `event:log` at error level.
3. Modal dialog on fatal errors with "Copy log" + "Open log folder."

### Day 9–10: docs + CHANGELOG
1. README.md.
2. USER_GUIDE.md walkthrough.
3. `generate-changelog.mjs` script.
4. Final manual run-through of the full workflow on a fresh VM.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Code signing certificate cost | High | Ship unsigned for v1 with documented SmartScreen workaround; acquire cert later. |
| Auto-update breaks on first publish | Medium | Test against a staging GitHub release before production. |
| Native modules (better-sqlite3) fail on packaged build | High | `@electron/rebuild` in `postinstall`; smoke-test on a clean machine. |
| Installer size | Low | Acceptable for desktop dev tool (~150–200 MB). Strip unused resources. |
| User has wrong Java version (e.g., Java 17) | Medium | Detect *version*, not just presence. Show explicit "found Java 17, need Java 21+" with the install link. |
| `where`/`which` cross-platform differences | Low | Use `child_process.spawn(binary, ["--version"])` and rely on PATH resolution; no `which` shellout. |
| Dependency check is slow on first run | Low | Run all checks in parallel; cache results in SQLite; invalidate on explicit re-check. |
| Anthropic key validation eats credits | Low | The test call uses `max_tokens: 1` against the cheapest model (Haiku). Sub-cent cost. |
| User installs a prereq but PATH isn't refreshed in X | Medium | Wizard's "Re-check" button forces a re-detection. Document: "may need to restart X if you just installed Node/Java." |

## Test plan

### Unit
- `dependencyChecker.ts` — mocked `child_process`, fixtures for each tool's output (including Java's stderr quirk), version parsing edge cases.
- `generate-changelog` script with fixture commit log.

### Manual smoke
- Install on **clean Win11 VM with no Git / Node / Java / Docker installed.**
- Verify all four show as missing with install links.
- Install Git only → re-check → Git flips to green, others still red.
- Install Node + Java → re-check → wizard allows proceeding (Docker still yellow, allowed because optional).
- Paste invalid Anthropic key → red with "validation failed" message.
- Paste valid key → green, wizard completable.
- Full workflow: workspace setup → MCF → module run → review → push → tests.
- Auto-update against a v0.0.x → v0.0.y release.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] Installer tested on a fresh Windows VM with **no prereqs installed.**
- [ ] First-run wizard correctly identifies what's missing and links to the right installer.
- [ ] After installing prereqs + re-check, wizard exits cleanly to the workspace list.
- [ ] First-time user can complete the spa workflow in < 30 minutes following USER_GUIDE.
- [ ] CHANGELOG up to date.

## Next phase

None. X v1 is shipped. Future work (PR creation via `gh`, Mac/Linux packaging, additional MCF kinds beyond `new-module`, bundling portable Git) tracked separately.
