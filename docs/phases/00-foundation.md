# Phase 0 — Foundation

## ✅ Phase status — Closed (2026-05-12)

| Item                        | Status                      |
| --------------------------- | --------------------------- |
| Scaffolding (28 files)      | ✓                           |
| `npm run dev` IPC roundtrip | ✓ pong returned             |
| `npm run typecheck`         | ✓ clean (both tsconfigs)    |
| `npm test`                  | ✓ 3 passed in 333 ms        |
| `npm run e2e`               | ✓ passed in 1.4 s           |
| `npm run dist:win`          | ✓ 101 MB NSIS installer     |
| Committed                   | ✓ `13e4d83`                 |
| Pushed                      | ✓ `origin/main`             |

- **Completed:** 2026-05-12
- **Commit:** [`13e4d83`](https://github.com/ProtyushB/Z/commit/13e4d83) — `feat: phase 0 scaffolding - electron + react + ts + ipc + tests + dist`
- **Repo:** https://github.com/ProtyushB/Z
- **Installer artifact:** `dist\X-0.0.1-win-x64.exe` (101 MB, unsigned)
- **Portable artifact:** `dist\win-unpacked\X.exe` (runs directly without install)

### Stack versions locked in this phase

Newer than the doc originally targeted because `npm audit fix --force` rolled forward several majors. Confirmed working with this combination:

| Layer            | Version  |
| ---------------- | -------- |
| Electron         | 42.0.1   |
| electron-vite    | 5.0.0    |
| electron-builder | 26.8.1   |
| Vite             | 8.0.12   |
| Vitest           | 4.1.6    |
| React            | 18.3.1   |
| TypeScript       | 5.6.3    |
| Tailwind CSS    | 3.4.15   |
| pino             | 9.5.0    |
| Playwright       | 1.49.0   |

### Issues encountered and resolutions

1. **electron-vite 5 outputs `.mjs` by default** while `package.json#main` and the preload reference expected `.js`. → Forced CJS output via `rollupOptions.output = { format: 'cjs', entryFileNames: '[name].js' }` on both `main` and `preload` in `electron.vite.config.ts`. Source files still use ESM `import` syntax — Rollup transpiles them. ESM main in Electron is still bleeding-edge; CJS is rock-solid and avoids `__dirname`/`import.meta` rewiring.
2. **`externalizeDepsPlugin()` only externalizes packages in `dependencies`**, not `devDependencies`. Because `electron` is dev-only, it was being bundled into the main process. At runtime, its baked-in `getElectronPath()` couldn't find `dist/electron.exe` or `path.txt` because `__dirname` resolved to `out/main/`, not `node_modules/electron/`. The error manifested as "Unable to find Electron app at out/main/install.js" — Electron's fallback code path tried to "re-download" from a path that doesn't exist. → Added explicit `external: ['electron']` to both `main` and `preload` rollupOptions.
3. **`electron-builder` failed extracting `winCodeSign-2.6.0.7z`** with "A required privilege is not held by the client" — the archive contains macOS symlinks (`libcrypto.dylib`, `libssl.dylib`) and Windows requires the `SeCreateSymbolicLinkPrivilege` to create them. → **Enabled Windows Developer Mode** (one-time, non-admin: Settings → System → For developers → Developer Mode → On). The cache at `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\` is now populated and reusable.
4. **Electron binary download was lazy** — happened on first `electron --version` invocation rather than at install time. After `npm audit fix --force` bumped Electron 33 → 42, the v33 binary was stale but v42 wasn't downloaded yet. → Resolved by `npm rebuild electron`, which triggers the postinstall download script. Binary now cached at `node_modules\electron\dist\electron.exe` (~227 MB).
5. **`.claude/settings.local.json` got staged on first `git add .`** — per-user Claude permission grants, shouldn't be in the repo. → Added `.claude/settings.local.json` to `.gitignore` and force-unstaged with `git rm --cached -f`. The committed `.claude/` directory is currently empty (no shared `settings.json` yet; can be added later if any settings should be team-wide).

### Known cosmetic warnings (non-blocking)

These appear during every build under Vite 8 / Rolldown and are safe to ignore — they're upstream deprecations in the `@vitejs/plugin-react` package, not bugs in our config:

```
[vite:react-babel] We recommend switching to `@vitejs/plugin-react-oxc` for improved performance.
Invalid input options - For the "jsx". Invalid key: Expected never but received "jsx".
`optimizeDeps.rollupOptions` is deprecated. Use `optimizeDeps.rolldownOptions` instead.
```

Easy follow-up at any later phase: swap `@vitejs/plugin-react` → `@vitejs/plugin-react-oxc`.

### What Phase 0 leaves behind

- Project tree: 28 source/config files + `docs/PLAN.md` + per-phase guides.
- One working IPC channel (`app:ping`) — template for every channel added in later phases.
- `pino` logger writing JSON to `%APPDATA%\X\logs\main.log`, with token/secret redaction baked in.
- CI-ready: `typecheck`, `test`, `e2e` scripts all green; `dist:win` produces an installer.
- A clean baseline that Phase 1 can build on without revisiting any foundation choices.

---

> **Goal:** An Electron + React + TypeScript app that opens, runs IPC, has tests, and packages.
> **Duration:** ~1 week (actual: 1 working session)
> **Status:** ✓ Closed (2026-05-12)
> **Depends on:** —
> **Unlocks:** Everything

## Deliverable

A blank Electron window with the title "X." A renderer-to-main IPC ping roundtrip works. Unit tests run via Vitest. An E2E test launches the app via Playwright and asserts the window appears. `electron-builder` produces a working `.exe` installer for Windows.

This is the **scaffolding-only phase**. No business logic. The output is a project you can `git init` with confidence — every later phase builds on it.

## Acceptance criteria

- [ ] `npm install` succeeds on a clean clone.
- [ ] `npm run dev` opens an Electron window with "X" displayed.
- [ ] `npm run build` produces production assets without errors.
- [ ] `npm test` runs Vitest with at least one passing test.
- [ ] `npm run e2e` runs Playwright, opens the app, asserts the window is visible.
- [ ] `npm run dist:win` produces a working `.exe` installer in `dist/`.
- [ ] TypeScript `strict: true` enabled and the whole tree compiles.
- [ ] Renderer cannot import anything from `src/main/**` (enforced by tsconfig).
- [ ] Tailwind CSS works (one shadcn/ui Button rendered).
- [ ] Pino logger writes to `app.getPath("userData")/logs/`.

## In scope

- Electron + electron-vite setup.
- React + Tailwind + one shadcn/ui component.
- IPC bridge with a single `app:ping` channel (proof of plumbing).
- Vitest config + one test.
- Playwright config + one test.
- electron-builder Windows config.
- Pino logger.
- `.gitignore`, `README.md`.

## Out of scope

- SQLite (Phase 1).
- GitHub auth (Phase 1).
- Any agent infrastructure (Phase 3).
- Auto-updater (Phase 9).
- Mac/Linux packaging (Phase 9).

## Files to create

### Project root
- `package.json` — scripts: `dev`, `build`, `test`, `e2e`, `dist:win`, `typecheck`, `lint`.
- `tsconfig.json` (base — strict, paths).
- `tsconfig.main.json` (target: node; includes `src/main`, `src/preload`, `src/shared`).
- `tsconfig.renderer.json` (target: dom; includes `src/renderer`, `src/shared`).
- `electron.vite.config.ts`.
- `vitest.config.ts`.
- `playwright.config.ts`.
- `tailwind.config.ts`.
- `postcss.config.cjs`.
- `electron-builder.yml`.
- `.gitignore`.
- `.nvmrc`.
- `README.md`.

### Main — `src/main/`
- `index.ts` — app lifecycle, single BrowserWindow.
- `logger.ts` — pino instance writing to userData/logs.

### Preload — `src/preload/`
- `index.ts` — `contextBridge.exposeInMainWorld("api", { invoke, subscribe })`.

### Shared — `src/shared/`
- `ipc/contracts.ts` — `Procedures` table with single `app:ping` channel.
- `ipc/channels.ts` — channel-name constants (re-exported from contracts).

### Renderer — `src/renderer/`
- `index.html`.
- `main.tsx` — mounts App.
- `App.tsx` — displays "X" + a "Ping main" button.
- `components/ui/button.tsx` — shadcn/ui Button.
- `styles/globals.css` — Tailwind directives.
- `lib/cn.ts` — tailwind class merger.
- `lib/ipc.ts` — typed wrapper over `window.api`.

### Tests — `tests/`
- `unit/ipc-types.test.ts` — type-level round-trip for the IPC contract.
- `e2e/launches.spec.ts` — Playwright launches Electron, asserts window visible.

## Build order

### Day 1: scaffold + window
1. `npm init -y`; install `electron`, `electron-vite`, `react`, `react-dom`, `typescript`.
2. Create the three `tsconfig`s; `tsc --noEmit` passes for an empty tree.
3. `electron.vite.config.ts` with main / preload / renderer entries.
4. `src/main/index.ts` — create window, load renderer URL in dev, `file://` in prod.
5. `src/renderer/main.tsx` + `App.tsx` — empty page with "X".
6. `npm run dev` opens the window.

### Day 2: Tailwind + shadcn/ui
1. Install `tailwindcss`, `autoprefixer`, `postcss`.
2. Configure content paths to `src/renderer/**`.
3. Add `globals.css` with Tailwind directives.
4. Copy shadcn/ui Button into `components/ui/button.tsx`.
5. Render the Button in App.tsx.

### Day 3: IPC bridge
1. `src/shared/ipc/contracts.ts` with `Procedures = { "app:ping": { req: void; res: { pong: true; at: string } } }`.
2. `src/preload/index.ts` — contextBridge exposes `invoke`/`subscribe`.
3. Register the `app:ping` handler in main.
4. Renderer's "Ping main" button calls it, displays the response.

### Day 4: tests
1. `vitest.config.ts` — node env by default, jsdom for renderer tests.
2. One unit test: import IPC contract types, type-level round-trip assertion.
3. `playwright.config.ts` with Electron launcher.
4. One e2e test: launch app, assert window visible + title.

### Day 5: packaging + logger + polish
1. Pino logger writing to userData/logs with file rotation.
2. `electron-builder.yml` for NSIS Windows installer.
3. `npm run dist:win` produces a working installer.
4. README with setup + scripts.
5. `.gitignore`, `.nvmrc`, conventional-commits hint in README.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| electron-vite + Vite version mismatch | Medium | Pin versions explicitly. Use a recently maintained electron-vite. |
| Native module rebuild (relevant from Phase 1) | High | Don't install `better-sqlite3` yet. Phase 1 will handle `@electron/rebuild`. |
| Windows path issues in electron-builder | Medium | Use `path.join` everywhere; test on Windows from day one. |
| Playwright + Electron quirks | Medium | Use official `@playwright/test` Electron support. One test is enough here. |

## Test plan

### Unit (Vitest)
- IPC contract type round-trip.

### E2E (Playwright)
- App launches, window visible, "X" text present.

### Manual smoke
- `npm run dev` opens window with "X".
- "Ping main" button fills response below.
- Window closes, app exits cleanly.
- `dist:win` produces an installer that runs on a clean Windows VM.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] Tests passing on first invocation after clean install.
- [ ] Manual smoke test passes on Win11.
- [ ] README has install + dev + test + dist commands.
- [ ] Project committed to git with conventional commits.

## Next phase

Phase 1 — Workspace Management.
