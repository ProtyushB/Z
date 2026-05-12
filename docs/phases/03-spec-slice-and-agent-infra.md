# Phase 3 — Agent Infrastructure + Spec Slice

> **Goal:** Click "Run" on an MCF; the Spec slice executes end-to-end; ResolvedModuleSpec is saved; UI shows verification.
> **Duration:** ~2 weeks
> **Status:** Not started
> **Depends on:** Phase 2
> **Unlocks:** All future agents (Phases 4, 5, 7, 8)

## Deliverable

The foundational agent phase. From this point on, every slice is a thin specialization of what Phase 3 builds. After Phase 3, the user clicks "Run" on a saved MCF, sees a slice-progress timeline ("Spec — running... → succeeded"), and at the end has a `ResolvedModuleSpec` persisted to SQLite plus dropped as JSON in the workspace's `module-runs/<run-id>/` directory. If Claude's verification flags errors, the run halts and surfaces them.

## Acceptance criteria

- [ ] Anthropic API key set via Settings; stored in OS keychain.
- [ ] V002 + V003 migrations create `module_runs` and `slice_events` tables.
- [ ] Clicking "Run" on an MCF creates a module run, returns a `runId`, begins streaming progress events.
- [ ] Deterministic resolver (`resolveModuleSpec`) reads reference Java entity files and expands inheritance into the `ResolvedModuleSpec` shape.
- [ ] Spec agent calls Claude with the prompt at `prompts/spec/module-spec.md`; output validates against `SpecVerificationOutput` schema; failures retry once with a reformat hint.
- [ ] On success: `ResolvedModuleSpec` written to DB and to `module-runs/<run-id>/resolved-spec.json`.
- [ ] On `ready: false`: run status set to "failed"; issues displayed in UI.
- [ ] Slice timeline UI streams events in real time.
- [ ] Cancellation works: `moduleRun:cancel` halts the slice mid-stream.
- [ ] Prompt-cache usage visible — second run of the same MCF shows `cache_read` tokens > 0 (validated explicitly in a dev panel).

## In scope

- Anthropic client wrapper with prompt caching + streaming.
- `defineSliceAgent` factory.
- `ResolvedModuleSpec` type (shared).
- Deterministic resolver: parse Java entity files, expand inheritance, compute identifiers, scan migration dir for next V##.
- Spec agent (verification + summary only — no codegen).
- Module run orchestrator skeleton (runs Spec, halts after).
- Slice timeline + module run detail UI.
- Settings panel — minimum: Anthropic key + model selection.

## Out of scope

- Code-emitting slices (Phase 4+).
- Writing into the cloned repos (Phase 4+).
- Branch creation in cloned repos (Phase 4 triggers it).
- Multi-slice orchestration (Phase 4+).

## Architecture introduced

- **`AnthropicClient`** singleton owns streaming + caching.
- **`defineSliceAgent(config)`** factory — every concrete agent is a thin wrapper.
- **`AgentContext`** passed to every agent: workspace paths, MCF, resolved spec (null inside Spec itself), emitter, anthropic client.
- **Orchestrator** owns the run lifecycle: creates branches (Phase 4+), runs slices in order, emits events, persists per-slice progress.
- **`module_runs` + `slice_events`** tables: one row per run; append-only event log.

## Files to create

### Migrations
- `V002__module_runs.sql` — `module_runs`, `module_run_slices`.
- `V003__slice_events.sql` — append-only event log.

### Prompts
- `prompts/system/base.md` — shared system header (cached).
- `prompts/spec/module-spec.md` — Spec verification prompt.

### Shared
- `src/shared/types/resolvedSpec.ts` — full `ResolvedModuleSpec` shape.

### Main
- `services/anthropic/client.ts` — wrapper.
- `services/anthropic/caching.ts` — cache_control helpers.
- `services/settings/settings.service.ts` — get/set; Anthropic key via keychain.
- `services/db/repositories/moduleRuns.repo.ts`.
- `services/db/repositories/sliceEvents.repo.ts`.
- `agents/_base.ts` — `defineSliceAgent`, `AgentContext`, `extractTaggedJson`.
- `agents/spec/moduleSpec.agent.ts`.
- `agents/spec/resolveModuleSpec.ts` — deterministic resolver.
- `agents/spec/referenceParser.ts` — parses Java entity + annotations.
- `orchestrators/moduleCreation.ts` — for now: runs Spec, persists, halts.
- `ipc/module.handlers.ts` — create/list/get/cancel.
- `ipc/settings.handlers.ts`.

### Renderer
- `routes/ModuleRunDetail.tsx` — full run view.
- `routes/Settings.tsx` — Anthropic key, models.
- `features/moduleCreation/SliceTimeline.tsx`.
- `features/moduleCreation/ResolvedSpecPreview.tsx` — read-only render.
- `features/moduleCreation/VerificationIssuesList.tsx`.
- `stores/moduleRun.store.ts` — current run + slice progress, subscribes to events.

## Build order

### Day 1–2: settings + Anthropic plumbing
1. `settings.service.ts` — get/update; API key via keychain.
2. Settings UI: Anthropic key field + model dropdowns.
3. `AnthropicClient.run` — streaming, cache_control on `cacheableSystem`.
4. Smoke script (in `tests/manual/`) that calls Claude through the wrapper.

### Day 3–4: data layer
1. V002 + V003 migrations.
2. `moduleRuns.repo.ts` + `sliceEvents.repo.ts`.
3. `ipc/module.handlers.ts` create/list/get/cancel — for now, `create` just returns runId (no agent yet).

### Day 5–6: deterministic resolver
1. `referenceParser.ts` — extract `@Entity`, `@Table`, `@Column`, `@ManyToOne`/`@OneToMany`, class name.
2. `resolveModuleSpec.ts` — apply inheritance + overrides, compute identifiers, scan migrations for next V##, resolve reference file paths per entity.
3. Test: feed parlour entity files + spa MCF; snapshot-assert `ResolvedModuleSpec`.

### Day 7–8: agent base
1. `_base.ts` — `defineSliceAgent`, `extractTaggedJson`, prompt loading.
2. Unit test: fake agent returning canned output; assert events, schema validation.

### Day 9–10: Spec agent
1. `prompts/spec/module-spec.md` — verification prompt.
2. `moduleSpec.agent.ts` — buildPrompt (deterministic resolve + Claude verify), writeFiles (persist + drop JSON).
3. Orchestrator runs Spec only.
4. UI: SliceTimeline + VerificationIssuesList.
5. End-to-end: spa MCF → Spec → `ResolvedModuleSpec` persisted.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Java parser misses fields due to Lombok / annotations | High | Start with regex + light AST parsing; surface unrecognized fields as verification issues, never silently drop. |
| Claude returns malformed JSON | Medium | One automatic reformat retry with explicit reformat hint. |
| Anthropic SDK rate-limit during dev | Low | Centralize retries with exponential backoff in `client.ts`. |
| Prompt caching not triggering | Medium | Log usage every call; expose `cacheRead`/`cacheCreation` in a dev panel. |
| Verification produces false positives | Medium | Prompt: "do not invent issues." Iterate with evals. |

## Test plan

### Unit
- `referenceParser.ts` against fixture Java files.
- `resolveModuleSpec.ts` fixture MCF + reference → snapshot.
- `_base.ts` fake agent: events in order, schema enforced.
- `anthropic/client.ts` mocked SDK: cache_control present, streaming callback fires.

### Integration
- Mock Claude server returns canned `<output>`; Spec agent produces expected `ResolvedModuleSpec`.

### Manual smoke
- Real Claude call: spa MCF → sensible summary, `ready: true`.
- Malformed MCF (relationship to missing entity) → `ready: false`, issue shown.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] One real Claude run completes under $0.50.
- [ ] Cancellation tested mid-stream.
- [ ] Slice timeline shows live token-count updates.
- [ ] No prompt strings inline anywhere — everything in `.md` files.

## Next phase

Phase 4 — Backend Module Scaffolding.
