const GITHUB_API = 'https://api.github.com/repos/kamiletar/aira/releases/latest'

interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GitHubRelease {
  tag_name: string
  published_at: string
  body: string
  assets: GitHubAsset[]
}

export type Platform = 'linux' | 'macos' | 'windows' | 'android' | 'unknown'
export type Arch = 'x86_64' | 'aarch64' | 'unknown'

/**
 * `installer` — native installer (.msi, .dmg, .AppImage, .apk). Preferred
 * for end users; shown on the primary download button.
 * `portable`  — raw archive (.tar.gz, .zip). Secondary option for power
 * users who don't want a system installer.
 */
export type AssetKind = 'installer' | 'portable'

export interface ReleaseAsset {
  name: string
  url: string
  size: number
  platform: Platform
  arch: Arch
  kind: AssetKind
}

export interface ReleaseInfo {
  version: string
  publishedAt: string
  changelog: string
  assets: ReleaseAsset[]
}

function parseAsset(name: string): { platform: Platform; arch: Arch; kind: AssetKind } | null {
  if (name.endsWith('.sha256')) {
    return null
  }

  // Normalize for keyword matching — file names are a mix of case
  // (`aira-0.3.5-*` portable archives are lowercase, `Aira-0.3.5-*` installers
  // from bundle scripts are title case).
  const lower = name.toLowerCase()

  // ─── Installer formats (distinguished by extension) ──────────────────
  if (lower.endsWith('.apk')) {
    return { platform: 'android', arch: 'aarch64', kind: 'installer' }
  }
  if (lower.endsWith('.msi')) {
    return { platform: 'windows', arch: 'x86_64', kind: 'installer' }
  }
  if (lower.endsWith('.appimage')) {
    return { platform: 'linux', arch: 'x86_64', kind: 'installer' }
  }
  if (lower.endsWith('.dmg')) {
    // DMGs are named Aira-0.3.5-arm64.dmg / Aira-0.3.5-x86_64.dmg
    const arch: Arch =
      lower.includes('arm64') || lower.includes('aarch64') ? 'aarch64' : lower.includes('x86_64') ? 'x86_64' : 'unknown'
    return { platform: 'macos', arch, kind: 'installer' }
  }

  // ─── Portable archives (distinguished by target triple in the name) ──
  const platform: Platform = lower.includes('linux')
    ? 'linux'
    : lower.includes('apple') || lower.includes('darwin')
      ? 'macos'
      : lower.includes('windows')
        ? 'windows'
        : 'unknown'

  if (platform === 'unknown') {
    return null
  }

  const arch: Arch = lower.includes('x86_64')
    ? 'x86_64'
    : lower.includes('aarch64') || lower.includes('arm64')
      ? 'aarch64'
      : 'unknown'

  return { platform, arch, kind: 'portable' }
}

/**
 * Fetch latest release from GitHub Releases API.
 * Uses Next.js ISR — revalidates every hour.
 * Returns null if no release found or fetch fails.
 */
export async function getLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const headers: HeadersInit = { Accept: 'application/vnd.github+json' }

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const res = await fetch(GITHUB_API, {
      headers,
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return null
    }

    const release: GitHubRelease = await res.json()

    const assets: ReleaseAsset[] = release.assets
      .map((a) => {
        const meta = parseAsset(a.name)
        if (!meta) {
          return null
        }
        return {
          name: a.name,
          url: a.browser_download_url,
          size: a.size,
          ...meta,
        }
      })
      .filter((a): a is ReleaseAsset => a !== null)

    return {
      version: release.tag_name,
      publishedAt: release.published_at,
      changelog: release.body,
      assets,
    }
  } catch {
    return null
  }
}

/**
 * Find the best download for a platform/arch combination. Prefers the
 * native installer (MSI / DMG / AppImage / APK); falls back to the
 * portable archive (tar.gz / zip) when no installer is available (e.g.
 * older releases before Milestone 9.5).
 */
export function findAsset(assets: ReleaseAsset[], platform: Platform, arch: Arch): ReleaseAsset | undefined {
  const installer = assets.find((a) => a.platform === platform && a.arch === arch && a.kind === 'installer')
  if (installer) {
    return installer
  }
  return assets.find((a) => a.platform === platform && a.arch === arch && a.kind === 'portable')
}

/**
 * Find a specific asset kind (e.g. the portable archive for a platform
 * even when an installer also exists). Used to render the "portable
 * version" secondary link under the main download button.
 */
export function findAssetByKind(
  assets: ReleaseAsset[],
  platform: Platform,
  arch: Arch,
  kind: AssetKind
): ReleaseAsset | undefined {
  return assets.find((a) => a.platform === platform && a.arch === arch && a.kind === kind)
}

/**
 * Format bytes to human-readable size.
 */
export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}
