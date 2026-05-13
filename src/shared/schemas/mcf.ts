import { z } from 'zod'

// The Module Creation File (MCF) is the single canonical input every slice
// agent reads in Phase 3+. It describes a new business-vertical module as a
// DELTA from a reference module that already exists in the cloned backend.
//
// Design philosophy:
//   - Inheritance by default: entities inherit fields/relationships/endpoints
//     from the picked `referenceModule` unless explicitly overridden.
//   - Types are a closed enum: every type maps to a (PG type, JPA type, JS shape).
//     No free-text "myType" strings.
//   - No raw SQL/Java/JS in the MCF — agents emit code; MCF is the spec.
//   - Versioned (`mcfVersion: 1`) so future schema breaks can be migrated.

// ─── Primitives ──────────────────────────────────────────────────────────────

const Slug = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z][a-z0-9_]*$/, 'lowercase, snake-case, starts with a letter')

const DisplayName = z.string().min(1).max(60)

const Identifier = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'identifier (letters, digits, underscores)')

// ─── Field types ─────────────────────────────────────────────────────────────
// Each maps to a known (PG type, JPA type, JS shape) triple. Agents own the mapping.

export const FieldType = z.enum([
  'text',
  'varchar',
  'int',
  'bigint',
  'decimal',
  'boolean',
  'date',
  'time',
  'timestamp',
  'uuid',
  'enum',
  'json',
  'reference'
])
export type FieldType = z.infer<typeof FieldType>

const FieldValidation = z.object({
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  pattern: z.string().optional(),
  enumValues: z.array(z.string()).optional()
})

const FieldDefinition = z.object({
  name: Identifier,
  type: FieldType,
  varcharLength: z.number().int().positive().max(10_000).optional(),
  decimalPrecision: z.number().int().min(1).max(38).optional(),
  decimalScale: z.number().int().min(0).optional(),
  referenceEntity: Slug.optional(),
  referenceCardinality: z.enum(['many-to-one', 'one-to-one']).optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  validation: FieldValidation.default({}),
  description: z.string().max(500).optional()
})
export type FieldDefinition = z.infer<typeof FieldDefinition>

// ─── Field-level overrides on an inherited entity ───────────────────────────

const FieldOverride = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), field: FieldDefinition }),
  z.object({ action: z.literal('remove'), fieldName: Identifier }),
  z.object({ action: z.literal('rename'), fieldName: Identifier, newName: Identifier }),
  z.object({
    action: z.literal('change-type'),
    fieldName: Identifier,
    newType: FieldType,
    validation: FieldValidation.optional()
  })
])

// ─── Relationships ───────────────────────────────────────────────────────────

const Relationship = z.object({
  name: Identifier,
  kind: z.enum(['many-to-one', 'one-to-many', 'one-to-one', 'many-to-many']),
  targetEntity: Slug,
  joinTableName: z.string().optional(),
  inverseFieldName: Identifier.optional(),
  nullable: z.boolean().default(true)
})

// ─── Endpoint customization (deltas vs. standard CRUD from the reference) ────

const HttpMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

const EntityEndpoint = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('exclude'),
    standardOp: z.enum(['list', 'get', 'create', 'update', 'patch', 'delete'])
  }),
  z.object({
    action: z.literal('add'),
    method: HttpMethod,
    path: z.string().regex(/^\/[a-zA-Z0-9/_{}-]*$/),
    description: z.string().max(500),
    requestBody: z.string().max(2000).optional(),
    responseBody: z.string().max(2000).optional()
  })
])

// ─── Status transitions ──────────────────────────────────────────────────────

const StatusTransition = z.object({
  from: Identifier,
  to: Identifier,
  triggerEvent: Identifier.optional(),
  guardCondition: z.string().max(500).optional()
})

// ─── Entity ──────────────────────────────────────────────────────────────────

const Entity = z.object({
  slug: Slug,
  displayName: DisplayName,
  referenceEntity: Slug.optional(),
  inheritFromReference: z.boolean().default(true),
  fieldOverrides: z.array(FieldOverride).default([]),
  fields: z.array(FieldDefinition).default([]),
  relationships: z.array(Relationship).default([]),
  endpoints: z.array(EntityEndpoint).default([]),
  statusTransitions: z.array(StatusTransition).default([]),
  searchableFields: z.array(Identifier).default([]),
  notes: z.string().max(2000).optional()
})
export type Entity = z.infer<typeof Entity>

// Convenience type exports derived from Entity. The renderer's per-section
// editors import these so component props stay strictly typed.
export type FieldOverride = Entity['fieldOverrides'][number]
export type Relationship = Entity['relationships'][number]
export type EntityEndpoint = Entity['endpoints'][number]
export type StatusTransition = Entity['statusTransitions'][number]

// ─── UI screens ──────────────────────────────────────────────────────────────

const ScreenType = z.enum(['list', 'detail', 'form', 'page', 'custom'])

const ScreenshotRef = z.object({
  path: z.string(),
  description: z.string().max(500).optional()
})

const Screen = z.object({
  entitySlug: Slug,
  screenType: ScreenType,
  inheritFromReference: z.boolean().default(true),
  referenceScreenPath: z.string().optional(),
  screenshots: z.array(ScreenshotRef).default([]),
  deviationNotes: z.string().max(2000).optional()
})

// ─── Integrations with cross-cutting modulex features ───────────────────────

const Integrations = z.object({
  dms: z
    .object({
      enabled: z.boolean().default(false),
      folderTypes: z
        .array(
          z.enum([
            'business',
            'entity',
            'appointment',
            'bill',
            'order',
            'product',
            'service'
          ])
        )
        .default([])
    })
    .default({}),
  loyalty: z.object({ enabled: z.boolean().default(false) }).default({}),
  paymentPlans: z.object({ enabled: z.boolean().default(false) }).default({}),
  servicePlans: z.object({ enabled: z.boolean().default(false) }).default({}),
  tabConfig: z
    .object({
      enabled: z.boolean().default(true),
      tabs: z
        .array(
          z.object({
            key: Identifier,
            label: DisplayName,
            enabledByDefault: z.boolean().default(true)
          })
        )
        .default([])
    })
    .default({})
})

// ─── Testing spec ────────────────────────────────────────────────────────────

const TestingSpec = z.object({
  backend: z
    .object({
      generateUnit: z.boolean().default(true),
      generateIntegration: z.boolean().default(true)
    })
    .default({}),
  frontend: z
    .object({
      generateComponent: z.boolean().default(true),
      generateHook: z.boolean().default(true)
    })
    .default({}),
  e2e: z
    .object({
      generate: z.boolean().default(false),
      scenarios: z
        .array(
          z.object({
            name: z.string().max(120),
            steps: z.string().max(2000)
          })
        )
        .default([])
    })
    .default({})
})

// ─── Top-level MCF ───────────────────────────────────────────────────────────

export const ModuleCreationFile = z.object({
  mcfVersion: z.literal(1),
  kind: z.literal('new-module'),
  meta: z.object({
    slug: Slug,
    displayName: DisplayName,
    description: z.string().max(2000),
    referenceModule: Slug,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    author: z.string().max(120).optional()
  }),
  entities: z.array(Entity).min(1),
  ui: z
    .object({
      inheritFromReference: z.boolean().default(true),
      screens: z.array(Screen).default([])
    })
    .default({}),
  integrations: Integrations.default({}),
  testing: TestingSpec.default({}),
  globalNotes: z.string().max(5000).optional()
})

export type ModuleCreationFile = z.infer<typeof ModuleCreationFile>

// ─── Cross-field validation (post-Zod, semantic checks) ──────────────────────

const RESERVED_SLUGS = [
  'parlour',
  'pharmacy',
  'polyclinic',
  'restaurant',
  'electronics',
  'pharmacy_polyclinic',
  'common'
]

/**
 * Entities that exist in the ModuleX `common` package and can be referenced
 * from any vertical's relationships. The renderer's RelationshipsEditor
 * includes these in its target-entity picker so users can wire FKs to them.
 */
export const COMMON_ENTITIES: readonly string[] = [
  'business',
  'person',
  'employment',
  'loyalty_config',
  'payment_plan',
  'service_plan_template',
  'tab_config',
  'status_transition'
]

export const ModuleCreationFileChecked = ModuleCreationFile.superRefine((mcf, ctx) => {
  // 1. slug must not collide with an existing modulex vertical
  if (RESERVED_SLUGS.includes(mcf.meta.slug)) {
    ctx.addIssue({
      code: 'custom',
      path: ['meta', 'slug'],
      message: `slug "${mcf.meta.slug}" collides with an existing module`
    })
  }

  // 2. relationship targets resolve to an entity in this MCF or a common entity
  const entitySlugs = new Set(mcf.entities.map((e) => e.slug))
  for (const entity of mcf.entities) {
    for (const rel of entity.relationships) {
      if (!entitySlugs.has(rel.targetEntity) && !COMMON_ENTITIES.includes(rel.targetEntity)) {
        ctx.addIssue({
          code: 'custom',
          path: ['entities'],
          message: `entity "${entity.slug}" relationship "${rel.name}" targets unknown entity "${rel.targetEntity}"`
        })
      }
    }
  }

  // 3. enum fields must declare enumValues
  for (const entity of mcf.entities) {
    for (const f of entity.fields) {
      if (f.type === 'enum' && (f.validation.enumValues?.length ?? 0) === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['entities'],
          message: `entity "${entity.slug}" field "${f.name}" is enum but has no enumValues`
        })
      }
    }
  }

  // 4. reference fields must declare a target entity
  for (const entity of mcf.entities) {
    for (const f of entity.fields) {
      if (f.type === 'reference' && !f.referenceEntity) {
        ctx.addIssue({
          code: 'custom',
          path: ['entities'],
          message: `entity "${entity.slug}" field "${f.name}" is reference but has no referenceEntity`
        })
      }
    }
  }

  // 5. screens reference an entity that exists
  for (const screen of mcf.ui.screens) {
    if (!entitySlugs.has(screen.entitySlug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ui', 'screens'],
        message: `screen targets unknown entity "${screen.entitySlug}"`
      })
    }
  }

  // 6. entity slugs must be unique within the MCF
  //    Otherwise the agents wouldn't know which entity a relationship or
  //    screen is pointing at, and generated files would collide on disk.
  const entitySlugCount = new Map<string, number>()
  for (const e of mcf.entities) {
    entitySlugCount.set(e.slug, (entitySlugCount.get(e.slug) ?? 0) + 1)
  }
  for (const [slug, count] of entitySlugCount) {
    if (count > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['entities'],
        message: `duplicate entity slug "${slug}" (appears ${count} times) — each entity must have a unique slug`
      })
    }
  }

  // 7. field names must be unique within each entity
  //    Two fields with the same name would generate conflicting columns / Java
  //    accessors. Note: this only checks the `fields` array; field overrides
  //    (add/remove/rename/change-type) are resolved later in the Spec slice
  //    against the inherited reference fields.
  for (const entity of mcf.entities) {
    const seen = new Set<string>()
    for (const f of entity.fields) {
      if (seen.has(f.name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['entities'],
          message: `entity "${entity.slug}" has duplicate field name "${f.name}"`
        })
      }
      seen.add(f.name)
    }
  }
})

// ─── Summary shape used by the list IPC ─────────────────────────────────────

export interface McfSummary {
  slug: string
  displayName: string
  updatedAt: string
}
