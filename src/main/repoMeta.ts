import { join, isAbsolute, resolve } from 'path'
import { readFile, stat } from 'fs/promises'
import { parseRemoteUrl } from './hosting'

// Repository metadata read straight from the files in .git, never by spawning
// git. A row on the Repositories page costs two file reads; spawning `git
// rev-parse` per row would cost a process, and the page lists everything the
// user has ever opened.

/** The real .git directory: a plain repo has a directory, a worktree or
 *  submodule has a file containing `gitdir: `. Null when neither. */
export async function gitDirOf(repoPath: string): Promise<string | null> {
  const dot = join(repoPath, '.git')
  try {
    const info = await stat(dot)
    if (info.isDirectory()) return dot
  } catch {
    return null
  }
  try {
    const text = await readFile(dot, 'utf-8')
    const m = /^gitdir:\s*(.+)$/m.exec(text)
    if (!m) return null
    const target = m[1].trim()
    return isAbsolute(target) ? target : resolve(repoPath, target)
  } catch {
    return null
  }
}

/** The checked-out branch, or null when detached or unreadable. */
export async function readHeadBranch(repoPath: string): Promise<string | null> {
  const gitDir = await gitDirOf(repoPath)
  if (!gitDir) return null
  try {
    const head = await readFile(join(gitDir, 'HEAD'), 'utf-8')
    const m = /^ref:\s*refs\/heads\/(.+)$/m.exec(head)
    return m ? m[1].trim() : null
  } catch {
    return null
  }
}

/**
 * The owning namespace of a remote URL: an org, a user, or the top level of a
 * GitLab group path.
 *
 * `parseRemoteUrl` handles the hosts Gitcito integrates with, but returns null
 * for a self-hosted GitLab or Gitea — which is exactly where an owner column
 * earns its keep. The fallback takes the first path segment after the host.
 */
export function ownerFromRemoteUrl(url: string): string | null {
  if (!url) return null
  const known = parseRemoteUrl(url)
  if (known) return known.owner.split('/')[0] || null

  // scp-style: git@host:namespace/repo.git — but not when a scheme is present,
  // or `user@host:port/namespace/repo` greedily matches this first and the
  // port number gets reported as the owner.
  let m = url.includes('://') ? null : /^[^@\s]+@[^:\s]+:(.+)$/.exec(url.trim())
  if (!m) {
    m = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]+@)?[^/]+\/(.+)$/i.exec(url.trim())
  }
  if (!m) return null
  const segments = m[1].split('/').filter(Boolean)
  return segments.length >= 2 ? segments[0] : null
}

/** The owner of `origin`, read from .git/config. */
export async function readOriginOwner(repoPath: string): Promise<string | null> {
  const gitDir = await gitDirOf(repoPath)
  if (!gitDir) return null
  try {
    const config = await readFile(join(gitDir, 'config'), 'utf-8')
    const section = /\[remote "origin"\]([\s\S]*?)(?=\n\[|$)/.exec(config)
    if (!section) return null
    const url = /^\s*url\s*=\s*(.+)$/m.exec(section[1])
    return url ? ownerFromRemoteUrl(url[1].trim()) : null
  } catch {
    return null
  }
}
