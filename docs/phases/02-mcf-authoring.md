# Phase 2 — MCF Authoring

> **Goal:** User can create, save, load, list, and delete Module Creation Files for a workspace.
> **Duration:** ~1 week
> **Status:** Not started
> **Depends on:** Phase 1
> **Unlocks:** Phase 3+

## Deliverable

Inside a workspace, the user authors an MCF: pick a reference module from the cloned backend, name the new module, declare entities (each inheriting or overriding from the reference), attach screenshots, add tab config, and save. Saved MCFs persist in SQLite, are listed under the workspace, and can be edited or deleted.

## Acceptance criteria

- [ ] V004 migration creates `mcfs` table (one row per saved MCF, MCF JSON in TEXT column).
- [ ] Reference scanner lists available reference modules from the cloned backend.
- [ ] `CreateModule` route loads a form with Zod-validated fields.
- [ ] Form supports entities, per-entity field overrides, per-entity endpoint overrides, UI screens, integrations, testing.
- [ ] Validation issues display inline before save; save is blocked while issues exist.
- [ ] Screenshot drop zone accepts PNGs; files are copied into `<workspace>/mcf-assets/<mcf-slug>/`.
- [ ] Save persists MCF; reload shows it in the workspace's MCF list.
- [ ] Edit an existing MCF; save updates the row.
- [ ] Delete MCF removes the DB row and the mcf-assets folder.
- [ ] Authoring the "spa mirroring parlour" example MCF end-to-end works in < 10 minutes.

## In scope

- Full MCF Zod schema.
- MCF storage and CRUD.
- MCF form with all sections: meta, entities, UI, integrations, testing.
- Screenshot copying and path tracking.
- Reference module + reference entity selectors.

## Out of scope

- Running an MCF (Phase 3+).
- Importing/exporting MCFs as JSON files (easy add later).
- Editing the resolved spec directly (intentionally not allowed).

## Architecture introduced

- **MCF library table** keyed by `(workspace_id, slug)`. JSON-in-TEXT.
- **mcf-assets directory** per workspace, per MCF; stores screenshots and any large attached resources outside the DB.
- **`react-hook-form` + `@hookform/resolvers/zod`** — single source of truth between schema and form.

## Files to create

### Migrations
- `resources/migrations/V004__mcf_library.sql` — `mcfs(workspace_id, slug, display_name, mcf_json, created_at, updated_at)`.

### Shared
- `src/shared/schemas/mcf.ts` — full Zod schema (see master architecture doc).

### Main
- `services/db/repositories/mcf.repo.ts`.
- `services/reference/referenceScanner.ts` — expand from Phase 1: list each reference module's entities.
- `services/fs/mcfAssets.service.ts` — copy and clean up screenshots.
- `ipc/mcf.handlers.ts` — list, get, save, delete, validate.

### Renderer
- `routes/CreateModule.tsx` — top-level page, list of MCFs + "New" button.
- `routes/EditMcf.tsx` — form route.
- `features/moduleCreation/McfForm.tsx` — top-level form orchestrator.
- `features/moduleCreation/McfMetaSection.tsx`.
- `features/moduleCreation/ReferenceModulePicker.tsx`.
- `features/moduleCreation/EntityList.tsx`.
- `features/moduleCreation/EntityEditor.tsx` — per-entity inheritance + overrides.
- `features/moduleCreation/FieldOverrideEditor.tsx`.
- `features/moduleCreation/EndpointOverrideEditor.tsx`.
- `features/moduleCreation/UiScreensSection.tsx`.
- `features/moduleCreation/ScreenshotDrop.tsx`.
- `features/moduleCreation/IntegrationsSection.tsx`.
- `features/moduleCreation/TestingSection.tsx`.
- `features/moduleCreation/ValidationIssuesPanel.tsx`.
- `stores/mcfDraft.store.ts` — autosaved drafts in localStorage as fallback.

## Build order

### Day 1: data layer
1. V004 migration.
2. `mcf.repo.ts` — list/get/save/delete + JSON parse/stringify.
3. IPC handlers.
4. Manually insert a sample MCF row; confirm list/get works.

### Day 2: reference scanner
1. Walk `<backend>/src/main/java/com/modulex/modules/<vertical>/`.
2. For each vertical, list controllers → derive entity slugs (e.g., `ParlourCategoryController` → `category`).
3. Mark the largest entity-set vertical as the default reference (parlour, in practice).

### Day 3–4: form skeleton + meta + reference picker
1. `CreateModule.tsx` lists MCFs via `mcf:list`.
2. `EditMcf.tsx` loads via `mcf:get`, mounts `McfForm`.
3. `McfMetaSection` — slug, displayName, description, referenceModule.
4. `react-hook-form` wired with Zod resolver; save calls `mcf:save`.

### Day 5: entities + overrides
1. `EntityList` adds entities (default: all entities from reference, all `inheritFromReference: true`).
2. `EntityEditor` per row — toggle inherit, add field overrides, endpoint overrides, notes.
3. `FieldOverrideEditor` — action picker (add/remove/rename/change-type), conditional fields.

### Day 6: UI screens + integrations + testing
1. `UiScreensSection` — per-entity-and-screen rows.
2. `ScreenshotDrop` — drag-drop, copies into mcf-assets dir, records relative path.
3. `IntegrationsSection` — checkboxes for dms/loyalty/paymentPlans/servicePlans, tab editor.
4. `TestingSection` — backend/frontend/e2e toggles + custom scenarios.

### Day 7: validation + polish
1. `ValidationIssuesPanel` — surfaces Zod errors + `superRefine` issues.
2. Edit flow.
3. Delete flow with confirmation.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Form UX for nested overrides overwhelming | High | Default all entities inherited; override editor only shows when row is expanded. |
| Reference scanner misidentifies entities | Medium | List controllers verbatim, let user re-map; expose mapping in MCF. |
| Screenshots blow up workspace dir | Low | Per-MCF size cap (50 MB), warn before. |
| Invalid MCF written to DB | Low | `ModuleCreationFileChecked.parse` before write; only valid input persisted. |

## Test plan

### Unit
- `mcf.ts` schema accepts the example MCF; rejects invalid slugs.
- `mcf.repo.ts` round-trip.
- `referenceScanner.ts` against fixture backend dir.

### Integration
- Save MCF → restart → reopen: same form values, same screenshots present.

### Manual smoke
- Author "spa mirroring parlour" example MCF end-to-end.

## Definition of done

- [ ] All acceptance criteria checked.
- [ ] Example MCF authored and persisted.
- [ ] Form validates on every keystroke (with debounce).
- [ ] Screenshots stored under mcf-assets, referenced by relative path.
- [ ] Delete cleans up both DB row and asset dir.

## Next phase

Phase 3 — Agent Infrastructure + Spec Slice.
