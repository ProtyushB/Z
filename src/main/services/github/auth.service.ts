import { logger } from '../../logger'
import { githubTokenStore } from './tokenStore'

// GitHub authentication via Personal Access Token, per workspace. Each
// workspace stores its own PAT so users can have different identities across
// workspaces (personal + work account, etc.).

const GITHUB_API = 'https://api.github.com'

export interface GithubUser {
  login: string
  name?: string | null
  email?: string | null
}

interface GithubErrorBody {
  message?: string
}

export const githubAuth = {
  /**
   * Validate a PAT by calling `/user`. Returns the user info if accepted by
   * GitHub; throws otherwise. Workspace-agnostic — used to verify a token
   * before persisting it.
   */
  async validate(token: string): Promise<GithubUser> {
    const res = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    if (!res.ok) {
      let detail = ''
      try {
        const body = (await res.json()) as GithubErrorBody
        if (body.message) detail = ` — ${body.message}`
      } catch {
        // body not JSON; ignore
      }
      logger.warn({ status: res.status }, 'github PAT validation failed')
      throw new Error(
        `GitHub auth failed (HTTP ${res.status})${detail}. Check the token is valid and has 'repo' scope.`
      )
    }

    return (await res.json()) as GithubUser
  },

  async setPat(workspaceId: string, token: string): Promise<{ username: string }> {
    const user = await this.validate(token)
    githubTokenStore.save(workspaceId, user.login, token)
    logger.info({ workspaceId, username: user.login }, 'github PAT saved for workspace')
    return { username: user.login }
  },

  async status(workspaceId: string): Promise<{ authenticated: boolean; username: string | null }> {
    const username = githubTokenStore.username(workspaceId)
    return { authenticated: username !== null, username }
  },

  async logout(workspaceId: string): Promise<void> {
    const username = githubTokenStore.username(workspaceId)
    if (username) {
      githubTokenStore.delete(workspaceId)
      logger.info({ workspaceId, username }, 'github PAT removed for workspace')
    }
  }
}
