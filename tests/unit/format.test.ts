import { describe, it, expect } from 'vitest'
import { formatRelative, shortRepoLabel, normalizeRepoUrl } from '../../src/renderer/lib/format'

describe('formatRelative', () => {
  it('returns "just now" for very recent timestamps', () => {
    expect(formatRelative(new Date(Date.now() - 30_000).toISOString())).toBe('just now')
  })

  it('returns minutes for sub-hour timestamps', () => {
    expect(formatRelative(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago')
  })

  it('returns hours for sub-day timestamps', () => {
    expect(formatRelative(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3h ago')
  })

  it('returns days for sub-month timestamps', () => {
    expect(formatRelative(new Date(Date.now() - 5 * 86_400_000).toISOString())).toBe('5d ago')
  })
})

describe('shortRepoLabel', () => {
  it('extracts owner/repo from a github HTTPS URL', () => {
    expect(shortRepoLabel('https://github.com/owner/repo')).toBe('owner/repo')
  })

  it('strips the .git suffix', () => {
    expect(shortRepoLabel('https://github.com/owner/repo.git')).toBe('owner/repo')
  })

  it('works for non-github hosts', () => {
    expect(shortRepoLabel('https://gitlab.example.com/team/project.git')).toBe('team/project')
  })

  it('returns the input as-is when it is not a URL', () => {
    expect(shortRepoLabel('not a url')).toBe('not a url')
  })
})

describe('normalizeRepoUrl', () => {
  it('passes through canonical HTTPS URLs', () => {
    expect(normalizeRepoUrl('https://github.com/owner/repo')).toBe('https://github.com/owner/repo')
  })

  it('preserves the .git suffix', () => {
    expect(normalizeRepoUrl('https://github.com/owner/repo.git')).toBe(
      'https://github.com/owner/repo.git'
    )
  })

  it('adds https:// when the scheme is missing', () => {
    expect(normalizeRepoUrl('github.com/owner/repo')).toBe('https://github.com/owner/repo')
  })

  it('expands owner/repo shorthand to github.com', () => {
    expect(normalizeRepoUrl('owner/repo')).toBe('https://github.com/owner/repo')
  })

  it('expands owner/repo.git shorthand and keeps the suffix', () => {
    expect(normalizeRepoUrl('owner/repo.git')).toBe('https://github.com/owner/repo.git')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeRepoUrl('  owner/repo  ')).toBe('https://github.com/owner/repo')
  })

  it('upgrades http:// to https://', () => {
    expect(normalizeRepoUrl('http://github.com/owner/repo')).toBe('https://github.com/owner/repo')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeRepoUrl('')).toBe('')
    expect(normalizeRepoUrl('   ')).toBe('')
  })

  it('leaves SSH URLs alone so the strict regex rejects them', () => {
    expect(normalizeRepoUrl('git@github.com:owner/repo.git')).toBe(
      'git@github.com:owner/repo.git'
    )
  })
})
