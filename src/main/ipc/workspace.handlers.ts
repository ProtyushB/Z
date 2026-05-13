import { registerHandler } from './registry'
import { workspacesRepo } from '../services/db/repositories/workspaces.repo'
import { workspaceService } from '../services/workspace/workspace.service'
import { referenceScanner } from '../services/reference/referenceScanner'
import { CreateWorkspaceInput } from '@shared/schemas/workspace'

export function registerWorkspaceHandlers(): void {
  registerHandler('workspace:list', () => workspacesRepo.list())

  registerHandler('workspace:get', ({ id }) => workspacesRepo.get(id))

  registerHandler('workspace:create', (input) => {
    // IPC is a trust boundary — validate at runtime, not just at compile time.
    const validated = CreateWorkspaceInput.parse(input)
    return workspacesRepo.create(validated)
  })

  registerHandler('workspace:delete', ({ id }) => {
    workspaceService.delete(id)
  })

  registerHandler('workspace:cloneRepos', ({ id }) => workspaceService.cloneRepos(id))

  registerHandler('workspace:openFolder', ({ id }) => workspaceService.openFolder(id))

  registerHandler('reference:scan', ({ workspaceId }) => {
    const ws = workspacesRepo.get(workspaceId)
    if (!ws?.backendLocalPath) return []
    return referenceScanner.scanBackend(ws.backendLocalPath)
  })
}
