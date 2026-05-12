# Phase 8 — Integration & E2E Test Authoring

> **Goal:** Author integration tests and Cypress E2E tests for an existing module using the slice agent pattern.
> **Duration:** ~1–2 weeks
> **Status:** Not started
> **Depends on:** Phase 7
> **Unlocks:** Full testing capability

## Deliverable

An "Author Tests" flow on top of Phase 7. User picks a module → chooses integration or E2E → provides scenarios (natural-language steps or imported from the MCF's `testing.e2e.scenarios`). Test-authoring agents emit test files into the appropriate repo. Tests then run through the Phase 7 lifecycle.

## Acceptance criteria

- [ ] "Author Tests" panel per module.
- [ ] Integration test agent emits Java integration tests (`@SpringBootTest` with testcontainers).
- [ ] E2E test agent emits Cypress specs.
- [ ] Authored tests join the regular test list and run via Phase 7 infrastructure.
- [ ] User can explicitly "regenerate test" — that bypasses the fix loop's immutability rule (but the fix loop still won't touch them automatically).
- [ ] Natural-language scenarios persist with the MCF for re-generation.

## In scope

- Integration test agent (BE).
- E2E test agent (FE, Cypress).
- Test plan editor UI.
- Wiring into Phase 7's run flow.
- Persisting scenarios with MCF — extend `testing` to include `integration.scenarios`.

## Out of scope

- Visual regression / a11y / perf tests (separate effort).
- Per-test "regenerate" affordance (later; for now, regenerate the whole set).

## Files to create

### Prompts — `prompts/testing/`
- `integration.md`.
- `e2e.md`.

### Schema
- `src/shared/schemas/mcf.ts` — extend `TestingSpec` with `integration.scenarios`.

### Main
- `agents/testing/integration.agent.ts`.
- `agents/testing/e2e.agent.ts`.
- `orchestrators/testAuthoring.ts`.

### Renderer
- `features/testing/TestPlanEditor.tsx`.
- `features/testing/ScenarioEditor.tsx`.

## Build order

### Day 1–2: scenario authoring UI
1. Extend MCF schema with `testing.integration.scenarios`.
2. `ScenarioEditor` and `TestPlanEditor` UI.
3. Persist back to MCF.

### Day 3–5: integration test agent
1. Prompt: `ResolvedModuleSpec` + scenarios + reference integration test files; output testcontainers-based JUnit tests.
2. Emit under `src/test/java/com/modulex/modules/<slug>/`.
3. Run via Phase 7 lifecycle.

### Day 6–8: E2E (Cypress) agent
1. Prompt: `ResolvedModuleSpec` + scenarios + reference Cypress files (if any); output `cypress/e2e/<slug>.cy.js`.
2. Run via Phase 7 lifecycle.

### Day 9–10: orchestrator + polish
1. `testAuthoring` orchestrator: emit → commit → optionally run.
2. Smoke: author 2 integration scenarios + 1 E2E scenario for spa; run; pass.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Cypress selectors brittle | High | Prompt the agent to prefer `data-testid` attributes; add these to UI agent's output in Phase 5 retrospectively. |
| Integration tests slow | Medium | Testcontainers acceptable; document expected time. |
| Generated tests fail on first run | Medium | Normal; Phase 7's fix loop handles it (but won't modify the test — the user can regenerate it). |

## Test plan

### Unit
- Each agent with mocked Anthropic.

### Manual smoke
- Author 2 integration + 1 E2E scenario for spa; run end-to-end.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] Scenarios persisted with MCF; re-generation reproduces tests deterministically.
- [ ] Both test types run via Phase 7's lifecycle.

## Next phase

Phase 9 — Polish & Distribution.
