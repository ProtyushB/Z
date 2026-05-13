import { registerHandler } from './registry'
import { mcfRepo } from '../services/db/repositories/mcf.repo'
import { mcfAssetsService } from '../services/fs/mcfAssets.service'
import { ModuleCreationFileChecked } from '@shared/schemas/mcf'

export function registerMcfHandlers(): void {
  registerHandler('mcf:list', ({ workspaceId }) => mcfRepo.list(workspaceId))

  registerHandler('mcf:get', ({ workspaceId, slug }) => mcfRepo.get(workspaceId, slug))

  registerHandler('mcf:save', ({ workspaceId, mcf }) => {
    // Cross-field validation BEFORE persisting. The repo runs the shallow Zod
    // parse too — this catches the semantic issues only `superRefine` knows
    // about (slug collisions, dangling relationship targets, enum-without-values).
    const result = ModuleCreationFileChecked.safeParse(mcf)
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join('; ')
      throw new Error(`Invalid MCF: ${issues}`)
    }
    mcfRepo.save(workspaceId, result.data)
  })

  registerHandler('mcf:delete', ({ workspaceId, slug }) => {
    mcfRepo.delete(workspaceId, slug)
    // Also clean up any uploaded screenshots for this MCF. Best-effort —
    // failures here don't block the DB delete.
    mcfAssetsService.cleanupForMcf(workspaceId, slug)
  })

  registerHandler('mcf:validate', ({ mcf }) => {
    const result = ModuleCreationFileChecked.safeParse(mcf)
    if (result.success) return { ok: true as const }
    return {
      ok: false as const,
      issues: result.error.issues.map(
        (i) => `${i.path.join('.') || '<root>'}: ${i.message}`
      )
    }
  })

  registerHandler('mcf:uploadScreenshot', async ({ workspaceId, mcfSlug, fileName, bytes }) => {
    const filename = await mcfAssetsService.uploadScreenshot(
      workspaceId,
      mcfSlug,
      fileName,
      new Uint8Array(bytes)
    )
    return { filename }
  })

  registerHandler('mcf:deleteScreenshot', ({ workspaceId, mcfSlug, filename }) => {
    mcfAssetsService.deleteScreenshot(workspaceId, mcfSlug, filename)
  })
}
