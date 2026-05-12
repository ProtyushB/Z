# Phase 0 — Foundation

> **Goal:** An Electron + React + TypeScript app that opens, runs IPC, has tests, and packages.
> **Duration:** ~1 week
> **Status:** Not started
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
