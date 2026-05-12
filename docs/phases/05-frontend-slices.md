# Phase 5 — Frontend Module Scaffolding

> **Goal:** After BE chain succeeds, FE slices run per entity using the BE's OpenAPI as the contract, and the Centrix branch builds.
> **Duration:** ~2–3 weeks
> **Status:** Not started
> **Depends on:** Phase 4
> **Unlocks:** Phase 6

## Deliverable

After the BE chain commits, X boots the BE locally on a random port, fetches `/v3/api-docs`, hands the spec to the FE chain. FE slices per entity: api → service → hook → provider → ui → tests. The Centrix branch has 5+ JS/JSX files per entity. `npm run build` succeeds; component tests pass.

## Acceptance criteria

- [ ] BE booter: `./gradlew bootRun` on a random port; health check; capture OpenAPI; teardown on completion or cancel.
- [ ] Per entity: FE chain runs in order: api, service, hook, provider, ui, tests.
- [ ] All emitted files are `.js`/`.jsx` (NOT TypeScript) — matches Centrix conventions.
- [ ] Folder structure mirrors Centrix: `src/backend/modules/<slug>/{api,hook,provider,service,ui,types,data}` with `__tests__/` subfolders.
- [ ] `npm run build` succeeds on the FE branch.
- [ ] `npm test` runs and the new entity's component tests pass.
- [ ] Per-slice commits in the FE repo.
- [ ] BE process always shuts down cleanly, even on cancel/error.

## In scope

- 6 frontend slice agents + prompts.
- BE booter + OpenAPI fetcher.
- npm runner.
- UI agent that consumes screenshots (vision-capable model required).

## Out of scope

- E2E (Cypress) tests beyond what's auto-emitted (Phase 8).
- Push (Phase 6).
- Integration tests across FE+BE (Phase 7).

## Files to create

### Prompts — `prompts/frontend/`
- `api.md`, `service.md`, `hook.md`, `provider.md`, `ui.md`, `tests.md`.

### Main
- `agents/frontend/api.agent.ts`, `service.agent.ts`, `hook.agent.ts`, `provider.agent.ts`, `ui.agent.ts`, `tests.agent.ts`.
- `runners/npm.runner.ts` — `install`, `build`, `test`.
- `services/openapi/beBooter.ts` — start BE, wait healthy, fetch spec, shutdown.

### Renderer
- (No new top-level routes — reuse `SliceTimeline`.)

## Build order

### Day 1: npm runner + BE booter
1. `npm.runner.ts` — wrap `npm ci`, `npm run build`, `npm test --` with streaming.
2. `beBooter.ts` — spawn Gradle bootRun with `-Dserver.port=0`, parse port from stdout, poll `/actuator/health`, fetch `/v3/api-docs`.
3. Smoke: boot, fetch, shutdown.

### Day 2–3: api + service agents
1. API agent — input is the OpenAPI subset for this entity's endpoints; output: `<slug>.api.impl.js` + `.api.interface.js` matching Centrix's `axios.instance.js`/`api.config.js` pattern.
2. Service agent — thin wrapper consumed by the hook.

### Day 4–5: hook + provider agents
1. Hook — `use<Slug>.js` with React Context-aware hook.
2. Provider — `<slug>.provider.js` matching parlour's pattern.

### Day 6–9: UI agent
1. Prompt accepts `ResolvedEntity`, reference UI file content, screenshots as image blocks.
2. Output: one or more `.jsx` files per screen type (Details, ListPage, etc.).
3. Use a Sonnet model (vision-capable).
4. After each emitted file: run `npm run build` for typecheck/syntax-check.

### Day 10–12: tests + orchestrator wiring
1. Tests agent — `__tests__/<filename>.test.jsx` with Testing Library + axios-mock-adapter.
2. Orchestrator: after BE chain, boot BE → fetch OpenAPI → FE chain per entity → shutdown BE.
3. Halt on FE build failure.

### Day 13–14: polish
1. Per-entity nested FE timeline.
2. Manual smoke: full spa run.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| BE port conflicts on dev machine | Medium | Use port 0; capture actual from stdout. |
| BE startup time blows out the slice clock | High | Boot once at start of FE chain, reuse across all FE slices, shutdown at end. |
| OpenAPI missing detail (enums, descriptions) | Medium | Augment with `ResolvedEntity` from Spec slice. |
| Vision-capable model cost on UI slice | Medium | Cache reference UI content; only send screenshots as new image blocks per entity. |
| FE build is slow (Vite cold start) | Low | Run `npm ci` once before chain, not per slice. |

## Test plan

### Unit
- Each agent with mocked Anthropic.
- `beBooter.ts` — given a fake gradle that prints "Tomcat started on port 12345", parses correctly.

### Integration
- Full FE chain against a real local BE; build succeeds.

### Manual smoke
- spa MCF: BE chain → FE chain → both repos green builds.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] One full end-to-end run completes.
- [ ] BE process always shuts down cleanly.
- [ ] Centrix branch on a feature branch; main untouched.

## Next phase

Phase 6 — Diff Review & Manual Push.
