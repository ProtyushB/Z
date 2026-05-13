import { app } from 'electron'
import { join, extname } from 'node:path'
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
  unlinkSync,
  chmodSync,
  statSync,
  readdirSync
} from 'node:fs'
import { randomUUID } from 'node:crypto'
import { logger } from '../../logger'

// Manages screenshot files associated with MCFs.
//
// Storage layout:
//   <userData>/mcf-assets/<workspace-id>/<mcf-slug>/<uuid>.<ext>
//
// The MCF schema only stores the filename (e.g., "abc123.png"); the renderer
// resolves it back to a path through this service when needed. Keeping the
// filename portable means MCFs can in principle be exported/imported between
// machines (Chunk 5 import/export feature).

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

function assetsRoot(): string {
  return join(app.getPath('userData'), 'mcf-assets')
}

function workspaceAssetsDir(workspaceId: string): string {
  return join(assetsRoot(), workspaceId)
}

function mcfAssetsDir(workspaceId: string, mcfSlug: string): string {
  return join(workspaceAssetsDir(workspaceId), mcfSlug)
}

// Reused from workspace.service — Windows + read-only git-pack-style files
// won't apply here, but the chmod-walk is defensive against any future
// asset types that might land in this tree.
function chmodRecursive(path: string): void {
  let stats
  try {
    stats = statSync(path)
  } catch {
    return
  }
  if (stats.isDirectory()) {
    try {
      chmodSync(path, 0o755)
    } catch {
      /* best-effort */
    }
    try {
      for (const entry of readdirSync(path)) chmodRecursive(join(path, entry))
    } catch {
      /* best-effort */
    }
  } else {
    try {
      chmodSync(path, 0o644)
    } catch {
      /* best-effort */
    }
  }
}

function rmRecursive(path: string): void {
  if (!existsSync(path)) return
  chmodRecursive(path)
  rmSync(path, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
}

export const mcfAssetsService = {
  /**
   * Save an uploaded screenshot. `bytes` is the file content. Validates the
   * extension and size. Returns the generated filename (a UUID + the original
   * extension) — the caller stores this in the MCF.
   */
  async uploadScreenshot(
    workspaceId: string,
    mcfSlug: string,
    originalName: string,
    bytes: Uint8Array
  ): Promise<string> {
    const ext = extname(originalName).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(
        `Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      )
    }
    if (bytes.length > MAX_FILE_BYTES) {
      throw new Error(
        `File too large (${(bytes.length / 1024 / 1024).toFixed(1)} MB). Max ${MAX_FILE_BYTES / 1024 / 1024} MB per screenshot.`
      )
    }

    const dir = mcfAssetsDir(workspaceId, mcfSlug)
    mkdirSync(dir, { recursive: true })

    const filename = `${randomUUID()}${ext}`
    writeFileSync(join(dir, filename), bytes)

    logger.info(
      { workspaceId, mcfSlug, filename, bytes: bytes.length },
      'mcf screenshot uploaded'
    )
    return filename
  },

  deleteScreenshot(workspaceId: string, mcfSlug: string, filename: string): void {
    const path = join(mcfAssetsDir(workspaceId, mcfSlug), filename)
    if (existsSync(path)) {
      try {
        unlinkSync(path)
        logger.info({ workspaceId, mcfSlug, filename }, 'mcf screenshot deleted')
      } catch (err) {
        logger.warn(
          { workspaceId, mcfSlug, filename, err: (err as Error).message },
          'failed to delete mcf screenshot'
        )
      }
    }
  },

  /** Absolute path for a stored screenshot — used by future preview code. */
  resolvePath(workspaceId: string, mcfSlug: string, filename: string): string {
    return join(mcfAssetsDir(workspaceId, mcfSlug), filename)
  },

  /** Remove all assets for an MCF. Called when an MCF is deleted. */
  cleanupForMcf(workspaceId: string, mcfSlug: string): void {
    rmRecursive(mcfAssetsDir(workspaceId, mcfSlug))
  },

  /** Remove all MCF assets for a workspace. Called when a workspace is deleted. */
  cleanupForWorkspace(workspaceId: string): void {
    rmRecursive(workspaceAssetsDir(workspaceId))
  }
}
