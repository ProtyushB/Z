# X

Desktop orchestrator for the **modulex** stack (Java + Postgres backend, React frontend). Manages workspace setup, runs slice-based AI agents to scaffold new modules across both repos, and orchestrates the test lifecycle with a human-in-the-loop fix flow.

This repo is X itself — **not** modulex or Centrix. X is the tool that operates on those.

## Stack

- Electron 33 + electron-vite
- React 18 + TypeScript (strict)
- Tailwind 3 + shadcn/ui pattern
- pino logging (file destination in user data dir)
- Vitest (unit) + Playwright (E2E)
- electron-builder (NSIS for Windows)

SQLite, GitHub OAuth, slice agents, and the rest land in later phases. See `docs/PLAN.md`.

## Prerequisites

- Node.js 20+ (`nvm use` reads `.nvmrc`)
- Windows 10/11 (Mac/Linux not packaged yet)

## Development

```sh
npm install        # also runs `electron-builder install-app-deps` via postinstall
npm run dev        # launches Electron with HMR
npm run typecheck  # main + renderer
npm test           # vitest
npm run e2e        # builds, then launches Electron via Playwright
npm run build      # production assets in out/
npm run dist:win   # Windows NSIS installer in dist/
```

## Project layout

```
src/
  main/        Node — privileged backend (git, child processes, DB, Anthropic — added in later phases)
  preload/     contextBridge — the only renderer↔main pipe
  renderer/    React UI
  shared/      Types and schemas imported by both processes
docs/          Implementation plans (PLAN.md is the master index)
prompts/       Versioned .md prompt templates (added in Phase 3)
resources/     Bundled assets (migrations, docker-compose — added in later phases)
tests/         unit/ (Vitest), e2e/ (Playwright)
```

The renderer cannot import from `src/main/**` — enforced by the split `tsconfig`s.

## Conventions

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
- All prompts live in `prompts/` as `.md` files (from Phase 3 onward).
- Never auto-push. Pushing is always a manual user action (Phase 6).
- Fix loop changes logic, not tests (Phase 7).
- See `docs/PLAN.md` for the full phase plan before touching code.
