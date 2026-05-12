# X — Implementation Plan

X is a desktop orchestrator that scaffolds new business-vertical modules and runs the test lifecycle across the **ModuleX** (Java + Postgres backend) and **Centrix** (React frontend) repos.

This document is the master index. Each phase has its own implementation plan under `docs/phases/`.

## Locked decisions

| Area | Choice |
|---|---|
| Shell | Electron |
| UI | React 18 + TypeScript (strict) |
| Main process | Node + TypeScript |
| Build tool | Vite (via electron-vite) |
| Local DB | SQLite (better-sqlite3) |
| State | Zustand |
| UI kit | shadcn/ui (Radix + Tailwind, copy-pasted) |
| Git | simple-git |
| LLM | @anthropic-ai/sdk with prompt caching |
| Unit tests | Vitest |
| E2E tests | Playwright (with Electron) |
| Packaging | electron-builder |
| Secrets | keytar (OS keychain) |
| Logging | pino |
| Code editor | Monaco (read-only diff viewer) |

## Repos X manages

- **Backend:** `D:\My Projects\ModuleX` — Spring Boot 3.4.2, Java 21, Gradle, Flyway (V38), Springdoc OpenAPI, Spring Security + JWT, Lombok, Spotless.
- **Frontend:** `D:\My Projects\Centrix` — React 18.3.1, Vite 5.4.8, **plain JavaScript** (not TypeScript), axios + React Context, Jest, Cypress.

## Architectural pillars

1. **MCF (Module Creation File) is the single canonical input** every slice agent reads. Defined in `src/shared/schemas/mcf.ts`.
2. **ResolvedModuleSpec** is the canonical expanded form, output of the Spec slice. Every downstream agent reads this, never the raw MCF.
3. **One slice agent per "part"** of BE/FE, defined via the `defineSliceAgent` factory. Each agent is ~80–150 lines of slice-specific logic on top of a shared base.
4. **All prompts live in versioned `.md` files** under `prompts/`. Edited like code, diffed like code.
5. **Single typed IPC contract** in `src/shared/ipc/contracts.ts`. Renderer and main can't drift.
6. **Manual git push always.** Pull and branch are automated; push is a human click per repo.
7. **Test fix loop changes logic, never the test.** Bounded retries (3). Human approves each proposed fix.
8. **A "module" = an entire business vertical** (~10–14 entity-controllers), not a single CRUD entity. The slice unit is **per-entity-within-module**.

## Phase index

| Phase | Title | Duration | Unlocks |
|---|---|---|---|
| 0 | [Foundation](./phases/00-foundation.md) | ~1 week | Everything |
| 1 | [Workspace Management](./phases/01-workspace-management.md) | ~1–2 weeks | Repo operations |
| 2 | [MCF Authoring](./phases/02-mcf-authoring.md) | ~1 week | Module input |
| 3 | [Agent Infrastructure + Spec Slice](./phases/03-spec-slice-and-agent-infra.md) | ~2 weeks | All future agents |
| 4 | [Backend Module Scaffolding](./phases/04-backend-slices.md) | ~2–3 weeks | BE codegen end-to-end |
| 5 | [Frontend Module Scaffolding](./phases/05-frontend-slices.md) | ~2–3 weeks | Full module scaffolding |
| 6 | [Diff Review & Manual Push](./phases/06-diff-and-push.md) | ~1 week | Shipping a module to GitHub |
| 7 | [Test Run & Fix Loop](./phases/07-test-run-and-fix.md) | ~2–3 weeks | Test lifecycle |
| 8 | [Integration & E2E Test Authoring](./phases/08-integration-and-e2e-tests.md) | ~1–2 weeks | Full testing capability |
| 9 | [Polish & Distribution](./phases/09-polish-and-distribution.md) | ~1–2 weeks | Production-ready X |

**Total estimated duration:** 14–21 weeks of solo work.

## How to use this plan

1. Start with Phase 0. Don't skip — the foundation is what lets every later phase be small.
2. Each phase has explicit **acceptance criteria**. Don't move on until they're checked.
3. Each phase has explicit **out-of-scope** items. Resist the urge to "just add" what's deferred — it breaks the build-order assumptions of later phases.
4. When something is unclear, update the phase doc first, then implement. The docs are living and should reflect reality.
5. Commit per slice/feature, not per file. Use conventional commit messages so the CHANGELOG can be auto-generated in Phase 9.
6. Every phase ends with a working, demoable thing. If yours doesn't, the phase isn't done.

## Cross-cutting conventions

- **Channel naming:** `domain:action` (`workspace:create`). Events: `event:<domain>` discriminated by `type`.
- **Long-running ops return a `runId`** immediately and emit progress as events. Never block IPC on multi-second work.
- **All payloads are JSON-serializable.** No `Date` instances, no `Map`/`Set`. ISO strings + arrays.
- **Renderer never imports `electron`; main never imports React.** Enforced via split `tsconfig`s.
- **No native modules beyond `better-sqlite3` and `keytar`.** Native modules are the #1 source of "X stopped building when I bumped Node" pain.
- **Every slice writes a `slice-run.json`** to the workspace describing inputs, prompt version, model, files emitted, timing, cost. This is the audit trail and debugger.
