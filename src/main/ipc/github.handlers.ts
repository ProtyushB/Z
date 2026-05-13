import { registerHandler } from './registry'
import { githubAuth } from '../services/github/auth.service'

export function registerGithubHandlers(): void {
  registerHandler('github:auth:setPat', ({ workspaceId, token }) =>
    githubAuth.setPat(workspaceId, token)
  )

  registerHandler('github:auth:status', ({ workspaceId }) => githubAuth.status(workspaceId))

  registerHandler('github:auth:logout', ({ workspaceId }) => githubAuth.logout(workspaceId))
}
