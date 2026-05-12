# Phase 7 — Test Run & Fix Loop

> **Goal:** Run BE/FE/integration tests against an existing module; failures get natural-language explanations and logic-fix proposals; user approves each fix.
> **Duration:** ~2–3 weeks
> **Status:** Not started
> **Depends on:** Phase 6
> **Unlocks:** Phase 8 (test authoring)

## Deliverable

A dedicated "Tests" section per workspace. User picks a module (e.g., spa), picks a scope (backend / frontend / integration), clicks Run. X spins up an ephemeral Postgres via docker-compose if integration scope is selected, runs the appropriate test commands, parses results, and streams them to the UI. Failures show a natural-language explanation and a proposed logic fix as a diff. User clicks Accept → fix is applied, tests re-run. Bounded at 3 retries. **The fix agent NEVER modifies the test file.**

## Acceptance criteria

- [ ] V005 migration creates `test_runs`, `failing_tests`, `proposed_fixes` tables.
- [ ] Docker detection: clear error if docker not installed; otherwise compose up/down works.
- [ ] Backend scope: `./gradlew test`; results parsed from JUnit XML.
- [ ] Frontend scope: `npm test -- --reporters=json`; results parsed.
- [ ] Integration scope: docker-compose Postgres → bootRun BE → npm test → teardown.
- [ ] Each failure: explanation agent produces NL summary; propose-fix agent produces a unified diff per file.
- [ ] Diff shown in Monaco; Accept applies it and re-runs; Reject moves on.
- [ ] Max 3 fix attempts per failing test; then surface as "manual intervention needed."
- [ ] Test files are NEVER in the proposed fix's file list (hard guard in agent + server-side guard + CI test).
- [ ] All test runs persisted with full event log.
- [ ] Cancellation cleanly tears down docker + BE process.

## In scope

- Test runs DB schema + repos.
- Docker runner (compose up/down).
- Gradle test runner (parse JUnit XML).
- Jest test runner (parse JSON reporter).
- Cypress runner (basic — full E2E lifecycle in Phase 8).
- Failure-explanation agent.
- Logic-fix-proposal agent.
- Fix loop orchestrator (bounded retry, human-in-loop gate).
- UI: test results table, failure detail, fix prompt.

## Out of scope

- Authoring new integration/E2E tests (Phase 8 — uses existing slice-emitted tests for now).
- Multi-module test runs.
- Test selection (no "run only these tests" yet).

## Architecture introduced

- **Test lifecycle orchestrator** parallel to module-creation orchestrator: same agent base, different agents.
- **Fix loop** as its own orchestrator with explicit retry counter.
- **Failure parsers** — one per test framework. Normalize to `FailingTest`.

## Files to create

### Migrations
- `V005__test_runs.sql` — `test_runs`, `failing_tests`, `proposed_fixes`.

### Prompts — `prompts/test-fix/`
- `explain-failure.md`.
- `propose-fix.md`.

### Test stack
- `resources/test-stack/docker-compose.test.yml` — Postgres 16 with healthcheck on port 5433.

### Main
- `services/db/repositories/testRuns.repo.ts`.
- `runners/docker.runner.ts` — compose up/down, wait healthy.
- `runners/gradle.runner.ts` — expand: `test`, parse JUnit XML.
- `runners/jest.runner.ts` — wrap jest with JSON reporter.
- `runners/cypress.runner.ts` — basic invocation.
- `agents/testFix/explain.agent.ts`.
- `agents/testFix/proposeFix.agent.ts`.
- `orchestrators/testLifecycle.ts`.
- `orchestrators/fixLoop.ts` — bounded retry.
- `ipc/test.handlers.ts`.

### Renderer
- `routes/Tests.tsx` — pick module + scope + run.
- `features/testing/TestResultsTable.tsx`.
- `features/testing/FailingTestDetail.tsx`.
- `features/testing/ProposedFixPanel.tsx` — diff + Accept/Reject.
- `features/testing/FixLoopProgress.tsx`.
- `stores/testRun.store.ts`.

## Build order

### Day 1–2: data + docker
1. V005 migration + repos.
2. `docker.runner.ts` — compose up, healthcheck, compose down.
3. `docker-compose.test.yml` — Postgres 16 named `x_test_pg` on port 5433.
4. Smoke: up, `psql` connect, down.

### Day 3–4: runners + parsers
1. Gradle test with `--info`; capture JUnit XML from `build/test-results/test/`.
2. JUnit XML parser → `FailingTest[]`.
3. Jest with JSON reporter; parse.
4. Smoke: deliberate failing test in ModuleX, parsed correctly.

### Day 5–7: explain + propose-fix agents
1. `prompts/test-fix/explain-failure.md` — input: failure, raw stack, related source files; output: NL explanation.
2. `prompts/test-fix/propose-fix.md` — input: explanation + `ResolvedModuleSpec` for affected entity + source files; output: proposed file diffs.
3. **Guard**: in `proposeFix.agent.ts`'s `writeFiles`, refuse to write to any path under `**/test/**` or `__tests__/**`.
4. Agents emit unified diffs; orchestrator applies them.

### Day 8–10: orchestrator + fix loop
1. `testLifecycle.ts` — run tests, collect failures, hand off to fix loop.
2. `fixLoop.ts` — per failure: explain → propose → await user (Accept/Reject) → apply → re-run → repeat (max 3).
3. UI: TestResultsTable, FailingTestDetail, ProposedFixPanel.
4. IPC: `testRun:applyFix`.

### Day 11–14: integration scope + polish
1. Integration scope: docker up → bootRun BE → npm test with `VITE_API_URL` pointing at BE → teardown.
2. Cancellation: clean teardown.
3. Manual smoke: introduce a logic bug in spa; run tests; accept fix; verify pass.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Docker not installed | High | Detect at scope-select time; show docs link. |
| Fix proposal modifies the test | **Critical** | Hard guard in `writeFiles` + warning in prompt + CI test that asserts test files are immutable across the fix loop. |
| Fix loop ping-pongs (fix A breaks B) | Medium | Max 3 attempts per failure; track failing-test names across iterations, surface oscillation to user. |
| Junit XML schema variance | Low | Use a dedicated parser; tolerate missing fields. |
| Integration test port allocation | Medium | Always port 0 for BE; named port for Postgres in compose. |

## Test plan

### Unit
- Each parser against fixture XML/JSON.
- Fix loop with mocked agents — exits after 3 attempts.
- Guard in `proposeFix.agent.ts` — writing under `__tests__/` throws.

### Integration
- Deliberately failing BE test fixture → explain → propose → apply → pass.

### Manual smoke
- One-line bug in `SpaService.calculateTotal`; run; accept fix; verify pass.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] Max-retries case shown in UI with a "manual fix needed" state.
- [ ] Docker teardown verified even on cancel.
- [ ] Test-files-immutability test in CI.

## Next phase

Phase 8 — Integration & E2E Test Authoring.
