import { compareSemver } from '@letar/semver-compare'
import type { GitHubRelease } from './types'

const GITHUB_API = 'https://api.github.com/repos'
const ISR_REVALIDATE_SECONDS = 3600

/**
 * Next.js augments `fetch`'s `RequestInit` with a `next` option (ISR revalidation) via global
 * ambient types pulled in through `next-env.d.ts` — not available to a plain library, so it's
 * redeclared locally rather than depending on the consuming app's Next.js types being in scope.
 */
type FetchInitWithNextRevalidate = RequestInit & { next?: { revalidate?: number | false } }

export interface FetchReleasesOptions {
  owner: string
  repo: string
  /** GitHub personal access token — raises the unauthenticated rate limit and works for private repos. */
  token?: string
  /**
   * Only releases whose tag starts with this prefix are considered — a monorepo publishing
   * several products under one GitHub repo (tags like `<app>-v1.2.3`) needs this to avoid
   * showing another product's release. Omit when the repo hosts a single product.
   */
  tagPrefix?: string
}

function buildHeaders(token: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Fetch releases for a repo, newest first, filtered to non-draft/non-prerelease and (optionally)
 * to a tag prefix. Uses Next.js ISR — revalidates every hour.
 */
export async function fetchReleases(options: FetchReleasesOptions & { limit?: number }): Promise<GitHubRelease[]> {
  const { owner, repo, token, tagPrefix, limit = 10 } = options

  try {
    const init: FetchInitWithNextRevalidate = {
      headers: buildHeaders(token),
      next: { revalidate: ISR_REVALIDATE_SECONDS },
    }
    const res = await fetch(`${GITHUB_API}/${owner}/${repo}/releases?per_page=${limit}`, init)

    if (!res.ok) {
      return []
    }

    const releases = (await res.json()) as GitHubRelease[]

    return releases.filter((r) => !r.draft && !r.prerelease && (!tagPrefix || r.tag_name.startsWith(tagPrefix)))
  } catch {
    return []
  }
}

/**
 * Fetch the latest release. Without `tagPrefix` this hits GitHub's dedicated `/releases/latest`
 * endpoint (one request). With `tagPrefix` it lists releases and picks the matching one with the
 * highest semver, since `/releases/latest` has no way to filter by tag.
 *
 * ⚠️ GitHub's `/releases` order is NOT a reliable freshness signal — in a shared monorepo
 * repository with frequent releases across several products, a just-created release can sit far
 * from the top for a while, and manual re-releases or out-of-order hotfixes make the list order
 * diverge from semver outright. Same root cause as
 * `libs/electron-monorepo-updater/src/lib/find-own-release.ts`; picking `releases[0]` there showed
 * a stale/wrong "latest" version to visitors.
 */
export async function fetchLatestRelease(options: FetchReleasesOptions): Promise<GitHubRelease | null> {
  const { owner, repo, token, tagPrefix } = options

  if (tagPrefix) {
    const releases = await fetchReleases({ owner, repo, token, tagPrefix, limit: 30 })
    if (releases.length === 0) {
      return null
    }
    return releases.reduce((best, current) =>
      compareSemver(current.tag_name.slice(tagPrefix.length), best.tag_name.slice(tagPrefix.length)) > 0
        ? current
        : best
    )
  }

  try {
    const init: FetchInitWithNextRevalidate = {
      headers: buildHeaders(token),
      next: { revalidate: ISR_REVALIDATE_SECONDS },
    }
    const res = await fetch(`${GITHUB_API}/${owner}/${repo}/releases/latest`, init)

    if (!res.ok) {
      return null
    }

    return (await res.json()) as GitHubRelease
  } catch {
    return null
  }
}
