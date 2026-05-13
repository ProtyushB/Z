# Phase 2 — MCF Authoring

## ✅ Phase status — Closed (2026-05-13)

| Chunk | Title                                        | Status                  |
| ----- | -------------------------------------------- | ----------------------- |
| 1     | MCF schema + DB foundation + IPC             | ✅ Closed (2026-05-13)  |
| 2     | MCF list + minimal form (meta only)          | ✅ Closed (2026-05-13)  |
| 3     | Entity editor (overrides, fields, endpoints) | ✅ Closed (2026-05-13)  |
| 4     | Integrations + screens + screenshots         | ✅ Closed (2026-05-13)  |
| 5     | Validation panel + polish                    | ✅ Closed (2026-05-13)  |

**Deviation from doc:** original plan said `V004__mcf_library.sql`. We used V004 in Phase 1 (orphan cleanup). Phase 2's first migration is therefore **V005**.

---

### ✅ Chunk 1 — MCF schema + DB foundation + IPC (closed 2026-05-13)

| Item                                                              | Status                    |
| ----------------------------------------------------------------- | ------------------------- |
| V005 migration (`mcfs` table, FK to workspaces with CASCADE)      | ✓                         |
| Full MCF Zod schema in `src/shared/schemas/mcf.ts`                | ✓                         |
| Cross-field validation (`ModuleCreationFileChecked.superRefine`)  | ✓                         |
| `mcfRepo` (list / get / save with upsert / delete)                | ✓                         |
| 5 IPC channels (`mcf:list/get/save/delete/validate`)              | ✓                         |
| Registered in `main/index.ts`                                     | ✓                         |
| Cross-field validation runs at IPC boundary before persistence    | ✓                         |
| `mcf.schema.test.ts` (10 tests — shallow + cross-field)           | ✓                         |
| `mcf.repo.test.ts` (7 tests including FK cascade)                 | ✓                         |
| `migrator.test.ts` updated (expects V001–V005, `mcfs` table)      | ✓                         |
| `npm run typecheck`                                               | ✓ clean                   |
| `npm test`                                                        | ✓ 48 / 48 (up from 31)    |
| V005 applied on user's real DB                                    | ✓ verified by user        |
| `scripts/inspect-db.mjs` for ad-hoc DB inspection                 | ✓ reusable across phases  |

**Files added**

- `resources/migrations/V005__mcf_library.sql`
- `src/shared/schemas/mcf.ts`
- `src/main/services/db/repositories/mcf.repo.ts`
- `src/main/ipc/mcf.handlers.ts`
- `scripts/inspect-db.mjs`
- `tests/unit/mcf.schema.test.ts`
- `tests/unit/mcf.repo.test.ts`

**Files modified**

- `src/shared/ipc/contracts.ts` — 5 new MCF channels, imports from `@shared/schemas/mcf`
- `src/main/index.ts` — `registerMcfHandlers()` after workspace + github handlers
- `tests/unit/migrator.test.ts` — bumped expectation to V001–V005, added `mcfs` to table check

**Decision notes**

- Migration numbering: doc originally planned `V004__mcf_library.sql`. We used V004 in Phase 1 (orphan cleanup migration). MCF migration is therefore **V005**. Future doc updates should reference V005.
- Cross-field validation lives in the IPC handler (`ModuleCreationFileChecked.safeParse`), not in the repo. The repo does shallow `ModuleCreationFile.parse` only. This lets us reuse the repo from contexts where the data is already validated (e.g., test fixtures, future agent-generated MCFs in Phase 3+).
- `scripts/inspect-db.mjs` is reusable infrastructure for every phase from here on. Reads `x.db` directly without needing the Electron app running.

**Issues & resolutions**

1. **Race between concurrent dev sessions on the same `x.db`.** User had a long-lived `npm run dev` running before V005 was added. When my brief `timeout 10 npm run dev` applied V005 to the file, the original session still had a pre-V005 in-memory `_db`. Its next `persist()` (triggered by any subsequent write) would have written V001–V004 back to disk, reverting V005. → Resolved by closing all dev sessions and starting fresh. **Action for Phase 9 polish:** detect multiple X instances on launch (file lock, OS-level mutex, or just a sentinel file).
2. **Test slug `shared-slug` rejected** by the snake_case-only Slug regex. Fixed to `shared_slug`. Small but documents that the schema is strict — Chunk 2's form will need an `auto-snake-case` helper for display-name → slug.

---

### ✅ Chunk 2 — MCF list + minimal form (closed 2026-05-13)

| Item                                                       | Status                |
| ---------------------------------------------------------- | --------------------- |
| `useMcfStore` Zustand store                                | ✓                     |
| `McfList` route per workspace                              | ✓                     |
| `McfEditor` route (handles new + edit modes)               | ✓                     |
| `McfForm` orchestrator with `mcf:validate` IPC             | ✓                     |
| `McfMetaSection` (display name, slug, description, picker) | ✓                     |
| `ReferenceModulePicker` (cards sorted by entity count)     | ✓                     |
| `EntitiesPreview` (replaced by `EntityList` in Chunk 3)    | ✓                     |
| Slug auto-derivation from display name                     | ✓                     |
| Slug locked in edit mode (PK in DB)                        | ✓                     |
| 3 routes in App.tsx (`/mcfs`, `/mcfs/new`, `/mcfs/:slug`)  | ✓                     |
| MCFs link in `WorkspaceDetail`                             | ✓                     |
| Cross-field uniqueness checks (#6, #7) added mid-chunk     | ✓                     |
| `npm run typecheck`                                        | ✓ clean               |
| `npm test`                                                 | ✓ 50 / 50 (up from 48)|
| Manual smoke (create / list / edit / delete)               | ✓ verified by user    |

**Files added**

- `src/renderer/stores/mcf.store.ts`
- `src/renderer/routes/McfList.tsx`
- `src/renderer/routes/McfEditor.tsx`
- `src/renderer/features/moduleCreation/McfForm.tsx`
- `src/renderer/features/moduleCreation/McfMetaSection.tsx`
- `src/renderer/features/moduleCreation/ReferenceModulePicker.tsx`
- `src/renderer/features/moduleCreation/EntitiesPreview.tsx` (replaced in Chunk 3)

**Files modified**

- `src/renderer/App.tsx` — 3 new routes
- `src/renderer/routes/WorkspaceDetail.tsx` — MCFs link
- `src/shared/schemas/mcf.ts` — uniqueness checks (#6 entity slugs, #7 field names)
- `tests/unit/mcf.schema.test.ts` — 2 new tests for the uniqueness checks

**Issues & resolutions**

1. Initial schema lacked duplicate-entity-slug and duplicate-field-name checks. User spotted the gap mid-chunk. Added both with tests; now caught at the IPC boundary before persist.
2. Validation issues from `mcf:validate` show inline; UX intentionally surfaces ALL issues at once (Zod aggregates), not first-error-only.

**Decision notes**

- Each MCF lives at `/workspaces/:id/mcfs/:slug` — keyed by composite `(workspace, slug)` per V005 schema. Slug is the URL parameter so it has to be URL-safe (snake_case, no hyphens) — the schema regex enforces this.
- Slug auto-derivation only fires when user hasn't customized it. Once customized, future display-name changes don't clobber.
- In edit mode slug is read-only (PK is immutable; delete + recreate to rename).
- `ReferenceModulePicker` sorts by entity count desc so the densest/canonical reference (parlour, in user's case) appears first.
- One entity is auto-seeded in new MCFs (Category, inheriting from reference) so the schema requirement `entities.min(1)` is satisfied at creation.

---

### ✅ Chunk 3 — Entity editor (closed 2026-05-13)

| Item                                                                | Status                  |
| ------------------------------------------------------------------- | ----------------------- |
| `EntityList` (replaces `EntitiesPreview` — expandable card list)    | ✓                       |
| `EntityCard` (per-entity expandable wrapper + identity + notes)     | ✓                       |
| `FieldDefinitionRow` (single field with type-specific config)       | ✓                       |
| `FieldsEditor` (used when `inherit=false`)                          | ✓                       |
| `FieldOverridesEditor` (4 actions: add / remove / rename / change-type) | ✓                   |
| `RelationshipsEditor` (name, kind, target picker incl. common entities) | ✓                   |
| `EndpointsEditor` (exclude standard ops + add custom endpoints)     | ✓                       |
| `StatusTransitionsEditor` (from / to / trigger / guard)             | ✓                       |
| `SearchableFieldsEditor` (chip input with Enter-to-add)             | ✓                       |
| Card header summary line (inherits / fields / relationships counts) | ✓                       |
| Single-entity new MCFs auto-expand the card                         | ✓                       |
| Self-reference filtered out of relationship target picker           | ✓                       |
| `COMMON_ENTITIES` exported from schema; included in target pickers  | ✓                       |
| Named type exports from schema (FieldOverride, Relationship, etc.)  | ✓                       |
| `npm run typecheck`                                                 | ✓ clean                 |
| `npm test`                                                          | ✓ 50 / 50 unchanged     |
| Manual smoke (toggle inherit, add field, relationship, endpoint)    | ✓ verified by user      |

**Files added**

- `src/renderer/features/moduleCreation/EntityList.tsx`
- `src/renderer/features/moduleCreation/EntityCard.tsx`
- `src/renderer/features/moduleCreation/FieldDefinitionRow.tsx`
- `src/renderer/features/moduleCreation/FieldsEditor.tsx`
- `src/renderer/features/moduleCreation/FieldOverridesEditor.tsx`
- `src/renderer/features/moduleCreation/RelationshipsEditor.tsx`
- `src/renderer/features/moduleCreation/EndpointsEditor.tsx`
- `src/renderer/features/moduleCreation/StatusTransitionsEditor.tsx`
- `src/renderer/features/moduleCreation/SearchableFieldsEditor.tsx`

**Files modified**

- `src/shared/schemas/mcf.ts` — exported `FieldOverride`, `Relationship`, `EntityEndpoint`, `StatusTransition`, `COMMON_ENTITIES` for renderer use
- `src/renderer/features/moduleCreation/McfForm.tsx` — swap `EntitiesPreview` → `EntityList`

**Files removed**

- `src/renderer/features/moduleCreation/EntitiesPreview.tsx` (superseded)

**Issues & resolutions**

1. **`as const` on `COMMON_ENTITIES`** narrowed it to a tuple of literal strings, which broke the `.includes(string)` check in `superRefine`. Fix: typed it as `readonly string[]`. Lesson: tuple-narrowing via `as const` is great for exhaustive switch-style usage, but hostile to general string lookups.

**Decision notes**

- **Single-entity new MCFs auto-expand** the only entity card so users immediately see the editor without an extra click. Multi-entity MCFs start collapsed (the summary line gives enough info to scan).
- **Inherit toggle controls which editor is visible** — `FieldOverridesEditor` for inherit=true, `FieldsEditor` for inherit=false. Switching the toggle preserves both arrays (the inactive one stays around); validation accepts whichever is non-empty.
- **Self-reference forbidden** at picker level (entity can't reference itself in relationships/reference fields). Could be a polish item to allow with explicit confirmation; for now filtered out of dropdowns.
- The accordion pattern scales to ~20 entities (parlour has 14). For larger entity counts a search/filter input becomes useful — defer to future polish.

---

### ✅ Chunk 4 — Integrations + screens + screenshots (closed 2026-05-13)

| Item                                                                  | Status                |
| --------------------------------------------------------------------- | --------------------- |
| `IntegrationsSection` (DMS, loyalty, paymentPlans, servicePlans, tabs)| ✓                     |
| `UiScreensSection` (per-entity screen overrides + reference path)     | ✓                     |
| `ScreenshotsEditor` (file upload via IPC, captions, delete)           | ✓                     |
| `TestingSection` (BE/FE/E2E toggles + scenarios)                      | ✓                     |
| `GlobalNotesSection` (top-level free-text for agent)                  | ✓                     |
| `mcfAssets.service.ts` (file storage on disk)                         | ✓                     |
| `mcf:uploadScreenshot` + `mcf:deleteScreenshot` IPC channels          | ✓                     |
| MCF delete cascades to assets dir                                     | ✓ verified by user    |
| Workspace delete cascades to all MCF assets                           | ✓ verified by user    |
| Screenshots disabled in new mode (slug stable only after save)        | ✓                     |
| Sticky save bar in form                                               | ✓                     |
| `npm run typecheck`                                                   | ✓ clean               |
| `npm test`                                                            | ✓ 50 / 50 unchanged   |

**Files added**

- `src/main/services/fs/mcfAssets.service.ts`
- `src/renderer/features/moduleCreation/IntegrationsSection.tsx`
- `src/renderer/features/moduleCreation/UiScreensSection.tsx`
- `src/renderer/features/moduleCreation/ScreenshotsEditor.tsx`
- `src/renderer/features/moduleCreation/TestingSection.tsx`
- `src/renderer/features/moduleCreation/GlobalNotesSection.tsx`

**Files modified**

- `src/shared/ipc/contracts.ts` — 2 new screenshot channels
- `src/main/ipc/mcf.handlers.ts` — upload/delete handlers + cleanup-on-delete
- `src/main/services/workspace/workspace.service.ts` — cleanup MCF assets on workspace delete
- `src/renderer/features/moduleCreation/McfForm.tsx` — added 4 new sections + global notes
- `scripts/inspect-db.mjs` — added `mcf-assets on disk` section for cascade verification

**Issues & resolutions**

1. None blocking — Chunk 4 went cleanly. The earlier chmod-before-rm fix from Phase 1 was reused in `mcfAssets.service.cleanupFor*` for Windows read-only file safety.

**Decision notes**

- **Screenshot files** stored at `<userData>/mcf-assets/<workspaceId>/<mcfSlug>/<uuid>.<ext>`. The MCF stores just the filename (UUID + ext), making the JSON portable across machines.
- **Cascade cleanup** at both levels (MCF delete + workspace delete) was verified empirically by the user with the inspect script.
- **Screenshot upload gated by `isEdit`** — new MCFs can't upload because the slug is still in flux (auto-derives from display name). After first save the slug is locked and uploads become safe.
- Image preview deferred to Chunk 5 polish.

---

### ✅ Chunk 5 — Polish (closed 2026-05-13)

| Item                                                                | Status                  |
| ------------------------------------------------------------------- | ----------------------- |
| Image preview via custom `mcf-asset://` Electron protocol           | ✓                       |
| CSP updated to allow `mcf-asset:` in `img-src`                      | ✓                       |
| `ScreenshotsEditor` renders thumbnails (click → full size)          | ✓                       |
| Live validation (debounced 500 ms `mcf:validate`)                   | ✓                       |
| Amber issue panel; save button disabled while issues exist          | ✓                       |
| MCF JSON export (button in form's sticky bar)                       | ✓                       |
| MCF JSON import (button in MCF list header)                         | ✓                       |
| Reference scanner deepening (parse JPA entity `.java` files)        | ✓                       |
| `ReferenceModule` type expanded (`entities: { slug, fields }[]`)    | ✓                       |
| `WorkspaceDetail` shows entity + field counts                       | ✓                       |
| Per-chunk closings written for Chunks 2 – 5 (this section + above)  | ✓                       |
| `npm run typecheck`                                                 | ✓ clean                 |
| `npm test`                                                          | ✓ 50 / 50               |
| `npm run e2e`                                                       | ✓ passed                |
| Manual smoke (preview, live val, export/import, scanner fields)     | ✓ verified by user      |

**Files added**

- (none — Chunk 5 is mostly modifications)

**Files modified**

- `src/main/index.ts` — registered `mcf-asset://` privileged scheme + protocol handler
- `src/renderer/index.html` — CSP allows `mcf-asset:` in `img-src`
- `src/renderer/features/moduleCreation/ScreenshotsEditor.tsx` — thumbnail rendering via custom protocol
- `src/renderer/features/moduleCreation/McfForm.tsx` — debounced live validation; Export JSON button in sticky bar
- `src/renderer/routes/McfList.tsx` — Import JSON button
- `src/main/services/reference/referenceScanner.ts` — added regex-based JPA field parser; fallback to controller-derived slugs preserved
- `src/shared/ipc/contracts.ts` — `ReferenceModule` shape updated (`entities[]` with `fields[]`)
- `src/renderer/routes/WorkspaceDetail.tsx` — uses new `ReferenceModule` shape; shows entity + field counts
- `src/renderer/features/moduleCreation/ReferenceModulePicker.tsx` — uses new shape

**Issues & resolutions**

1. **Initial `WorkspaceDetail` edit failed** with a stale-anchor mismatch (the `ul` closing tag's indentation differed by one space from my best-guess old_string). Fixed by reading the file first, then re-applying the edit with exact whitespace. Lesson: for files I haven't touched in a few turns, `Read` first when the old_string is multi-line and visually similar to other patterns.

**Decision notes**

- **Custom `mcf-asset://` protocol** instead of `file://` keeps the CSP strict while still allowing local image serving. Registered via `protocol.registerSchemesAsPrivileged` (must run before `app.whenReady`) + `protocol.handle` (in `whenReady`).
- **Live validation debounced 500 ms** — too eager would flicker the issue panel as users type; too slow feels stale. Save button is disabled while there are live issues, which prevents trivial save-then-server-rejects round-trips.
- **Export/Import** uses browser-native Blob/download for export and `<input type="file">` for import. Imported MCFs go through `mcf:save` which runs full validation — invalid imports throw and surface as inline errors. No staging area.
- **Java field parser is regex-based**. Handles typical Lombok @Entity / @Column / @ManyToOne style. May miss exotic constructs; Phase 3's Spec slice can re-validate against Claude for cases that matter for code generation.
- **Field-info doesn't yet feed back into the form**. Chunk 3's `EntityCard` doesn't surface "parlour.category has these fields: …" hints based on the new data. Worth a future polish pass; not blocking Phase 3 which will read the scanner output directly.

---

> **Goal:** User can create, save, load, list, and delete Module Creation Files for a workspace.
> **Duration:** ~1 week (actual: 1 working day)
> **Status:** ✅ Closed (2026-05-13)
> **Depends on:** Phase 1
> **Unlocks:** Phase 3+

## Deliverable

Inside a workspace, the user authors an MCF: pick a reference module from the cloned backend, name the new module, declare entities (each inheriting or overriding from the reference), attach screenshots, add tab config, and save. Saved MCFs persist in SQLite, are listed under the workspace, and can be edited or deleted.

## Acceptance criteria

- [x] V005 migration creates `mcfs` table (one row per saved MCF, MCF JSON in TEXT column).
- [x] Reference scanner lists available reference modules from the cloned backend.
- [x] `McfEditor` route loads a form with Zod-validated fields.
- [x] Form supports entities, per-entity field overrides, per-entity endpoint overrides, UI screens, integrations, testing.
- [x] Validation issues display inline before save (live, debounced); save is blocked while issues exist.
- [x] Screenshot upload accepts PNG/JPG/WebP/GIF; files are copied into `<userData>/mcf-assets/<workspaceId>/<mcfSlug>/`.
- [x] Save persists MCF; reload shows it in the workspace's MCF list.
- [x] Edit an existing MCF; save updates the row.
- [x] Delete MCF removes the DB row and the mcf-assets folder.
- [x] MCF JSON export/import round-trips correctly.

## In scope

- Full MCF Zod schema.
- MCF storage and CRUD.
- MCF form with all sections: meta, entities, UI, integrations, testing, global notes.
- Screenshot upload + image preview via custom protocol.
- Reference module + reference entity selectors (with field-level parsing).
- JSON export/import.

## Out of scope

- Running an MCF (Phase 3+).
- Editing the resolved spec directly (intentionally not allowed).
- Pushing field-info hints into the entity editor UI (deferred polish).

## Architecture introduced

- **MCF library table** keyed by `(workspace_id, slug)`. JSON-in-TEXT.
- **mcf-assets directory** per workspace, per MCF; stores screenshots and any large attached resources outside the DB. MCF stores filenames; absolute paths resolved by the main process via `mcfAssetsService.resolvePath`.
- **Custom `mcf-asset://` Electron protocol** for serving local image assets to the renderer with CSP intact.
- **Reference scanner** that parses JPA entity Java files for field metadata; consumed by both Phase 2's MCF authoring UI and (later) Phase 3's Spec slice.
- **Cross-field validation pipeline**: shallow Zod parse at repo write + `ModuleCreationFileChecked.superRefine` at IPC boundary. Live in renderer via debounced `mcf:validate` IPC.

## Next phase

Phase 3 — Agent Infrastructure + Spec Slice.
