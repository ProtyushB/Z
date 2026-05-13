import { describe, it, expect } from 'vitest'
import { ModuleCreationFile, ModuleCreationFileChecked } from '../../src/shared/schemas/mcf'

const now = '2026-05-13T10:00:00.000Z'

function baseMcf(overrides?: Partial<{ slug: string; entities: unknown }>): unknown {
  return {
    mcfVersion: 1,
    kind: 'new-module',
    meta: {
      slug: overrides?.slug ?? 'spa',
      displayName: 'Spa',
      description: 'Day-spa vertical, similar to parlour with cabin resource.',
      referenceModule: 'parlour',
      createdAt: now,
      updatedAt: now
    },
    entities: overrides?.entities ?? [
      {
        slug: 'category',
        displayName: 'Category',
        inheritFromReference: true
      }
    ]
  }
}

describe('ModuleCreationFile (shallow Zod)', () => {
  it('accepts a minimal valid MCF', () => {
    expect(() => ModuleCreationFile.parse(baseMcf())).not.toThrow()
  })

  it('rejects an invalid slug (uppercase)', () => {
    expect(() => ModuleCreationFile.parse(baseMcf({ slug: 'Spa' }))).toThrow()
  })

  it('rejects an empty entities array', () => {
    expect(() => ModuleCreationFile.parse(baseMcf({ entities: [] }))).toThrow()
  })

  it('rejects mcfVersion other than 1', () => {
    const mcf = baseMcf() as Record<string, unknown>
    mcf.mcfVersion = 2
    expect(() => ModuleCreationFile.parse(mcf)).toThrow()
  })

  it('fills in defaults for optional sections', () => {
    const parsed = ModuleCreationFile.parse(baseMcf())
    expect(parsed.ui.inheritFromReference).toBe(true)
    expect(parsed.integrations.tabConfig.enabled).toBe(true)
    expect(parsed.testing.backend.generateUnit).toBe(true)
  })
})

describe('ModuleCreationFileChecked (cross-field validation)', () => {
  it('rejects a reserved slug', () => {
    const result = ModuleCreationFileChecked.safeParse(baseMcf({ slug: 'parlour' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => /collides/.test(i.message))).toBe(true)
    }
  })

  it('rejects a relationship target that does not exist', () => {
    const result = ModuleCreationFileChecked.safeParse(
      baseMcf({
        entities: [
          {
            slug: 'category',
            displayName: 'Category',
            inheritFromReference: true,
            relationships: [
              { name: 'ghost', kind: 'many-to-one', targetEntity: 'nonexistent_entity' }
            ]
          }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => /unknown entity/.test(i.message))).toBe(true)
    }
  })

  it('accepts a relationship targeting a known common entity', () => {
    const result = ModuleCreationFileChecked.safeParse(
      baseMcf({
        entities: [
          {
            slug: 'category',
            displayName: 'Category',
            inheritFromReference: true,
            relationships: [{ name: 'biz', kind: 'many-to-one', targetEntity: 'business' }]
          }
        ]
      })
    )
    expect(result.success).toBe(true)
  })

  it('rejects an enum field without enumValues', () => {
    const result = ModuleCreationFileChecked.safeParse(
      baseMcf({
        entities: [
          {
            slug: 'category',
            displayName: 'Category',
            inheritFromReference: false,
            fields: [{ name: 'status', type: 'enum' }]
          }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => /enumValues/.test(i.message))).toBe(true)
    }
  })

  it('rejects two entities with the same slug', () => {
    const result = ModuleCreationFileChecked.safeParse(
      baseMcf({
        entities: [
          { slug: 'dup', displayName: 'First', inheritFromReference: true },
          { slug: 'dup', displayName: 'Second', inheritFromReference: true }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => /duplicate entity slug "dup"/.test(i.message))
      ).toBe(true)
    }
  })

  it('rejects two fields with the same name within an entity', () => {
    const result = ModuleCreationFileChecked.safeParse(
      baseMcf({
        entities: [
          {
            slug: 'category',
            displayName: 'Category',
            inheritFromReference: false,
            fields: [
              { name: 'price', type: 'decimal' },
              { name: 'price', type: 'int' }
            ]
          }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => /duplicate field name "price"/.test(i.message))
      ).toBe(true)
    }
  })

  it('rejects a reference field without referenceEntity', () => {
    const result = ModuleCreationFileChecked.safeParse(
      baseMcf({
        entities: [
          {
            slug: 'category',
            displayName: 'Category',
            inheritFromReference: false,
            fields: [{ name: 'parent', type: 'reference' }]
          }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => /referenceEntity/.test(i.message))).toBe(true)
    }
  })
})
