# Phase 4 — Backend Module Scaffolding

> **Goal:** After Spec succeeds, BE slices run per entity, emit Java + SQL files into a feature branch in the cloned ModuleX repo, and the branch compiles.
> **Duration:** ~2–3 weeks
> **Status:** Not started
> **Depends on:** Phase 3
> **Unlocks:** Phase 5

## Deliverable

A full backend scaffolding pipeline. Spec slice completes → orchestrator iterates `resolvedSpec.entities` → for each entity, runs the BE slice chain (migration once for the whole module; entity → dto → repository → service → controller → validation → tests per entity). After the chain, the feature branch in ModuleX has migration + N entities × 6–7 Java files, formatted via Spotless, and `./gradlew compileJava` passes.

## Acceptance criteria

- [ ] Orchestrator creates a feature branch in the cloned ModuleX repo: `module/<slug>-<timestamp>`.
- [ ] Migration slice runs once per module, emits `src/main/resources/db/migration/V<next>__add_<slug>_tables.sql`.
- [ ] Per-entity chain: entity, dto, repository, service, controller, validation, tests.
- [ ] Each agent commits its emitted files as a separate git commit (`feat(spa): add SpaCategory entity`).
- [ ] Spotless runs after each emitted file via `./gradlew spotlessApply`; formatting changes are included in the commit.
- [ ] `./gradlew compileJava` invoked after each entity completes; failure halts the run with the compile error displayed.
- [ ] UI: per-entity nested timeline (entity row expands to show its 7 slices).
- [ ] All emitted files tracked in `slice_events` with paths.
- [ ] An end-to-end run of the spa MCF produces a branch with compiling Java.

## In scope

- 8 backend slice agents and their prompts.
- Gradle runner (`compileJava`, `spotlessApply`, `test`).
- Repo-scoped fs service (safe writes, no escaping the repo root).
- Per-entity orchestration in `moduleCreation`.
- Branch creation + per-slice commits.

## Out of scope

- Frontend (Phase 5).
- BE integration tests that require Postgres running (Phase 7).
- Push (Phase 6).

## Files to create

### Prompts — `prompts/backend/`
- `migration.md`.
- `entity.md`.
- `dto.md`.
- `repository.md`.
- `service.md`.
- `controller.md`.
- `validation.md`.
- `tests.md`.

### Main
- `agents/backend/migration.agent.ts`.
- `agents/backend/entity.agent.ts`.
- `agents/backend/dto.agent.ts`.
- `agents/backend/repository.agent.ts`.
- `agents/backend/service.agent.ts`.
- `agents/backend/controller.agent.ts`.
- `agents/backend/validation.agent.ts`.
- `agents/backend/tests.agent.ts`.
- `runners/gradle.runner.ts` — `compileJava`, `spotlessApply`, `test`.
- `services/fs/repoFiles.service.ts` — write safely under a given repo root.
- `services/git/git.service.ts` — expand: `createBranch`, `add`, `commit`, `getCurrentBranch`.

### Renderer
- `features/moduleCreation/EntitySliceTimeline.tsx` — per-entity row, expandable.
- `features/moduleCreation/CompileErrorPanel.tsx` — Gradle errors with file links.

## Build order

### Day 1–2: fs + runner
1. `repoFiles.service.ts` — write/read scoped under workspace's repo root; reject paths that resolve outside.
2. `gradle.runner.ts` — wrap `./gradlew` with line-buffered stdout streamed to events.
3. Smoke: `./gradlew compileJava` on cloned ModuleX, parse output.

### Day 3: branching + commits
1. Expand `git.service.ts`: createBranch from main, commit message templating, stage specific files.
2. Orchestrator: before BE chain, ensure branch exists.

### Day 4–5: migration agent
1. `prompts/backend/migration.md` — input: `ResolvedEntity[]`, reference migration files; output: one SQL.
2. `migration.agent.ts` — write to `db/migration/V<next>__add_<slug>_tables.sql`.
3. Commit.

### Day 6–8: entity, dto, repository
1. One agent per day. Same pattern: read reference file from `ResolvedReferenceFiles`, prompt Claude, validate output, write file, spotlessApply, compileJava check, commit.

### Day 9–11: service, controller, validation
1. Service — depends on repository.
2. Controller — depends on service.
3. Validation — Bean Validation annotations + custom validators.

### Day 12–14: tests + integration + polish
1. BE tests agent — JUnit 5 unit tests; integration tests scaffolded but require Postgres (Phase 7).
2. Orchestrator: iterate entities, run BE chain, halt on compile failure.
3. UI: nested per-entity timeline.
4. End-to-end: spa MCF → BE branch compiles.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Claude generates uncompilable code | Medium | After each emission, run `compileJava`; surface failures to user (don't auto-retry beyond one reformat). |
| Spotless changes agent output post-emission | Low | Include spotlessApply diff in the same commit — expected behavior. |
| Many files per entity inflate prompt cost | High | Prompt-cache reference files (don't change between slices); consider Haiku for simpler slices (DTO, repository) if quality holds. |
| Import paths diverge from existing conventions | Medium | Include 2–3 example files from `common/` in every prompt so the agent matches. |
| Field naming case mismatch (PG snake vs JPA camel) | Medium | `ResolvedSpec` already computes both; agents read `columnName` + `name`. |

## Test plan

### Unit
- Each agent in isolation with mocked Anthropic returning canned outputs.
- `repoFiles.service.ts` — path escape attempts rejected.

### Integration
- Full BE chain against fixture spa MCF; assert files present, branch created, `compileJava` passes (against a checked-in ModuleX snapshot).

### Manual smoke
- Author spa MCF; run; inspect generated Java; build with Gradle outside X.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] One real end-to-end run of spa MCF produces compiling Java.
- [ ] Branch is on a feature branch; main untouched.
- [ ] Per-slice commits present in git log.

## Next phase

Phase 5 — Frontend Module Scaffolding.
