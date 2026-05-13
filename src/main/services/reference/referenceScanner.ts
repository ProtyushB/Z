import { readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

export interface ReferenceModule {
  slug: string
  entityHints: string[]
}

// Phase 2's MCF authoring needs to enumerate the "module verticals" inside a
// cloned ModuleX repo so the user can pick a reference to mirror. This is a
// minimal skeleton — just enumerate directory names under com/modulex/modules/
// and derive entity slugs from controller filenames. Future polish in Phase 2
// will read entity classes for full field information.

export const referenceScanner = {
  /**
   * Scan the cloned backend repo for module verticals.
   *
   * For each directory under `<backend>/src/main/java/com/modulex/modules/`:
   *   - The directory name is the vertical slug (`parlour`, `pharmacy`, …).
   *   - Controller files inside `<vertical>/controller/` are stripped to
   *     produce entity slugs (`ParlourCategoryController.java` → `category`).
   *
   * Returns an empty array if the modules directory doesn't exist (e.g.,
   * the repo isn't ModuleX at all or hasn't been cloned yet).
   */
  scanBackend(backendPath: string): ReferenceModule[] {
    const modulesDir = join(backendPath, 'src', 'main', 'java', 'com', 'modulex', 'modules')
    if (!existsSync(modulesDir)) return []

    const verticals = readdirSync(modulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()

    return verticals.map((slug) => {
      const controllerDir = join(modulesDir, slug, 'controller')
      let entityHints: string[] = []

      if (existsSync(controllerDir) && statSync(controllerDir).isDirectory()) {
        // Vertical class prefix is the slug capitalized (parlour → Parlour).
        // We strip it so `ParlourCategoryController` → `Category` → `category`.
        const verticalClass = slug.charAt(0).toUpperCase() + slug.slice(1)
        entityHints = readdirSync(controllerDir)
          .filter((f) => f.endsWith('Controller.java'))
          .map((f) =>
            f
              .replace(/Controller\.java$/, '')
              .replace(new RegExp(`^${verticalClass}`), '')
              .replace(/^./, (c) => c.toLowerCase())
          )
          .filter((s) => s.length > 0)
          .sort()
      }

      return { slug, entityHints }
    })
  }
}
