/** Human-readable relative time like "just now", "5m ago", "2d ago". */
export function formatRelative(iso: string): string {
  const date = new Date(iso)
  const ms = Date.now() - date.getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  if (ms < 30 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`
  return date.toLocaleDateString()
}

/** Extract `owner/repo` from a typical https://github.com/owner/repo(.git) URL. */
export function shortRepoLabel(url: string): string {
  try {
    const u = new URL(url)
    const parts = u.pathname.replace(/\.git$/, '').split('/').filter(Boolean)
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`
    return u.pathname
  } catch {
    return url
  }
}

/**
 * Forgiving URL normalization. Accepts:
 *   - `https://github.com/owner/repo` (canonical)
 *   - `github.com/owner/repo`         (missing scheme)
 *   - `owner/repo`                    (shorthand → assumes github.com)
 *   - With or without `.git` suffix
 *   - With surrounding whitespace
 *   - `http://...` is upgraded to `https://`
 *
 * Returns the canonical `https://host/owner/repo[.git]` form, or the original
 * trimmed string if it can't be normalized (e.g. SSH `git@host:owner/repo`).
 * The caller is responsible for running the strict regex against the result.
 */
export function normalizeRepoUrl(raw: string): string {
  let s = raw.trim()
  if (!s) return s
  // SSH URLs need SSH-key auth, which X doesn't do. Leave as-is so the strict
  // regex will reject them.
  if (/^git@/i.test(s)) return s
  if (!/^https?:\/\//i.test(s)) {
    if (/^[\w.-]+\/[\w.-]+(\.git)?$/.test(s)) {
      // `owner/repo` shorthand → assume github.com.
      s = `https://github.com/${s}`
    } else {
      // Looks like `host/owner/repo` without scheme — just prepend https://.
      s = `https://${s}`
    }
  }
  // Downgrade-protection: never store http://, force https://.
  s = s.replace(/^http:\/\//i, 'https://')
  return s
}
