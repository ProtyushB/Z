import simpleGit, { type SimpleGit } from 'simple-git'
import { logger } from '../../logger'

// GitHub accepts `x-access-token` as the HTTPS basic-auth username when the
// password is a PAT. This injection avoids ever storing the credential URL
// on disk or in shell history.
function injectToken(url: string, token: string): string {
  try {
    const u = new URL(url)
    u.username = 'x-access-token'
    u.password = token
    return u.toString()
  } catch {
    return url
  }
}

// Defense-in-depth: scrub any accidental token leak before logging/throwing.
function redact(str: string, token: string | null): string {
  if (!token) return str
  return str.replaceAll(token, '<redacted>')
}

export interface CloneOptions {
  url: string
  destination: string
  token?: string
}

export const gitService = {
  /**
   * Shallow-or-full clone of `url` into `destination` via system `git`. If a
   * `token` is provided it's injected as the HTTPS password. Errors are
   * scrubbed of the token before being thrown.
   */
  async clone({ url, destination, token }: CloneOptions): Promise<void> {
    const cloneUrl = token ? injectToken(url, token) : url
    const git: SimpleGit = simpleGit()

    logger.info({ url, destination }, 'git clone start')
    try {
      await git.clone(cloneUrl, destination)
      logger.info({ destination }, 'git clone done')
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      const safe = redact(raw, token ?? null)
      logger.error({ url, err: safe }, 'git clone failed')
      throw new Error(`git clone failed: ${safe}`)
    }
  }
}
