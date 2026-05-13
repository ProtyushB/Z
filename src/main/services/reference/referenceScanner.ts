import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReferenceModule, ReferenceEntity } from '@shared/ipc/contracts'

// Phase 2's MCF authoring needs to enumerate the "module verticals" inside a
// cloned ModuleX repo so the user can pick a reference to mirror. Chunk 5
// deepened this from "list controller names" to "parse the JPA entity Java
// files so we know what fields each entity has." Phase 3's Spec slice will
// need this same data — putting the parser here so both consumers share it.

/** Strip `verticalClass` prefix and CamelCase → snake_case. */
function classNameToEntitySlug(className: string, verticalClass: string): string {
  const stripped = className.startsWith(verticalClass)
    ? className.slice(verticalClass.length)
    : className
  if (!stripped) return ''
  return stripped
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

/**
 * Regex-based JPA entity field extractor. Handles typical Lombok-style entity
 * files: optional annotation block, then `private TYPE name [= default];`.
 * Skips `serialVersionUID` and `static final` fields. Not exhaustive — exotic
 * constructs (multi-line annotations with nested parens, fields without
 * `private`) may slip through. Sufficient for ModuleX-style code; Phase 3's
 * Spec slice can re-validate via Claude if precision matters.
 */
function parseEntityFields(source: string): { name: string; type: string }[] {
  const clean = source
    .replace(/\/\/[^\n]*/g, '')       // line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments

  const fields: { name: string; type: string }[] = []
  // Match: optional annotation(s), then `private <type> <name>[= ...];`
  const re = /(?:@\w+(?:\([^)]*\))?\s*)*\s*private\s+([\w<>,\s?.]+?)\s+(\w+)\s*(?:=[^;]+)?;/g

  let m: RegExpExecArray | null
  while ((m = re.exec(clean)) !== null) {
    const type = m[1].trim().replace(/\s+/g, ' ')
    const name = m[2].trim()
    if (name === 'serialVersionUID') continue
    if (/\b(static|final)\b/.test(type)) continue
    fields.push({ name, type })
  }

  return fields
}

export const referenceScanner = {
  /**
   * Scan the cloned backend repo for module verticals + their entities.
   *
   * For each directory under `<backend>/src/main/java/com/modulex/modules/`:
   *   1. Try parsing every `*.java` in `<vertical>/entity/` for fields.
   *   2. Fall back to listing controller filenames (with empty `fields`) if
   *      the entity dir doesn't exist — keeps display useful for incomplete
   *      verticals like `pharmacy_polyclinic`.
   *
   * Returns empty array if the modules directory doesn't exist (the repo
   * isn't ModuleX or hasn't been cloned yet).
   */
  scanBackend(backendPath: string): ReferenceModule[] {
    const modulesDir = join(backendPath, 'src', 'main', 'java', 'com', 'modulex', 'modules')
    if (!existsSync(modulesDir)) return []

    const verticals = readdirSync(modulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()

    return verticals.map((slug) => {
      // Camel-case prefix used by the class names: parlour → Parlour.
      // Underscore-separated slugs need handling too: pharmacy_polyclinic → PharmacyPolyclinic.
      const verticalClass = slug
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join('')

      const entities: ReferenceEntity[] = []

      // Primary path: parse entity .java files.
      const entityDir = join(modulesDir, slug, 'entity')
      if (existsSync(entityDir) && statSync(entityDir).isDirectory()) {
        for (const file of readdirSync(entityDir).filter((f) => f.endsWith('.java'))) {
          const fullPath = join(entityDir, file)
          const className = file.replace(/\.java$/, '')
          const entitySlug = classNameToEntitySlug(className, verticalClass)
          if (!entitySlug) continue
          let source: string
          try {
            source = readFileSync(fullPath, 'utf-8')
          } catch {
            continue
          }
          entities.push({ slug: entitySlug, fields: parseEntityFields(source) })
        }
      }

      // Fallback: derive slugs from controller filenames if no entities found.
      if (entities.length === 0) {
        const controllerDir = join(modulesDir, slug, 'controller')
        if (existsSync(controllerDir) && statSync(controllerDir).isDirectory()) {
          for (const file of readdirSync(controllerDir).filter((f) =>
            f.endsWith('Controller.java')
          )) {
            const className = file.replace(/Controller\.java$/, '')
            const entitySlug = classNameToEntitySlug(className, verticalClass)
            if (entitySlug) entities.push({ slug: entitySlug, fields: [] })
          }
        }
      }

      entities.sort((a, b) => a.slug.localeCompare(b.slug))
      return { slug, entities }
    })
  }
}
