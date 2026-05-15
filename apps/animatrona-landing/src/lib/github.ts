import type { MacOSAssets, ParsedRelease, Platform, Release, ReleaseChange } from '@/types/release'

const GITHUB_API = 'https://api.github.com/repos'
const OWNER = process.env.GITHUB_OWNER || 'kamiletar'
const REPO = process.env.GITHUB_REPO || 'animatrona'

/**
 * Получить заголовки для GitHub API
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  return headers
}

/**
 * Получить последний релиз
 */
export async function getLatestRelease(): Promise<Release | null> {
  try {
    const res = await fetch(`${GITHUB_API}/${OWNER}/${REPO}/releases/latest`, {
      headers: getHeaders(),
      next: { revalidate: 3600 }, // Кэш 1 час
    })

    if (!res.ok) {
      console.error('Failed to fetch latest release:', res.status)
      return null
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching latest release:', error)
    return null
  }
}

/**
 * Получить все релизы
 */
export async function getAllReleases(limit = 10): Promise<Release[]> {
  try {
    const res = await fetch(`${GITHUB_API}/${OWNER}/${REPO}/releases?per_page=${limit}`, {
      headers: getHeaders(),
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error('Failed to fetch releases:', res.status)
      return []
    }

    const releases: Release[] = await res.json()
    // Фильтруем черновики и пререлизы
    return releases.filter((r) => !r.draft)
  } catch (error) {
    console.error('Error fetching releases:', error)
    return []
  }
}

/**
 * Парсинг release notes в структурированный формат
 */
export function parseReleaseNotes(body: string | null): ReleaseChange[] {
  if (!body) {
    return []
  }

  const changes: ReleaseChange[] = []
  const lines = body.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // Определяем тип изменения по эмодзи или префиксу
    let type: ReleaseChange['type'] = 'improvement'
    let text = trimmed

    if (trimmed.includes('✨') || trimmed.toLowerCase().includes('feat')) {
      type = 'feature'
      text = trimmed.replace(/^[-*]\s*✨?\s*/, '').replace(/^feat[:\s]*/i, '')
    } else if (trimmed.includes('🐛') || trimmed.toLowerCase().includes('fix')) {
      type = 'fix'
      text = trimmed.replace(/^[-*]\s*🐛?\s*/, '').replace(/^fix[:\s]*/i, '')
    } else if (trimmed.includes('💥') || trimmed.toLowerCase().includes('breaking')) {
      type = 'breaking'
      text = trimmed.replace(/^[-*]\s*💥?\s*/, '').replace(/^breaking[:\s]*/i, '')
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      text = trimmed.replace(/^[-*]\s*/, '')
    } else {
      continue // Пропускаем строки без маркера
    }

    if (text) {
      changes.push({ type, text })
    }
  }

  return changes
}

/**
 * Найти ассет для платформы
 */
export function findAssetForPlatform(release: Release, platform: Platform) {
  const patterns: Record<Platform, RegExp> = {
    windows: /\.exe$/i,
    macos: /\.dmg$/i,
    linux: /\.AppImage$/i,
  }

  return release.assets.find((asset) => patterns[platform].test(asset.name)) || null
}

/**
 * Найти ассеты macOS для обеих архитектур
 */
export function findMacOSAssets(release: Release): MacOSAssets {
  const dmgAssets = release.assets.filter((asset) => /\.dmg$/i.test(asset.name))

  // Паттерны: -arm64.dmg для Apple Silicon, -x64.dmg или без суффикса для Intel
  const arm64 = dmgAssets.find((asset) => /-arm64\.dmg$/i.test(asset.name)) || null
  // x64 может быть с суффиксом -x64 или без архитектуры (legacy)
  const x64 =
    dmgAssets.find((asset) => /-x64\.dmg$/i.test(asset.name)) ||
    dmgAssets.find((asset) => !/-arm64\.dmg$/i.test(asset.name)) ||
    null

  return { arm64, x64 }
}

/**
 * Форматирование размера файла
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Парсинг релиза в удобный формат
 */
export function parseRelease(release: Release): ParsedRelease {
  return {
    version: release.tag_name.replace(/^v/, ''),
    date: new Date(release.published_at).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    changes: parseReleaseNotes(release.body),
    rawBody: release.body,
    assets: {
      windows: findAssetForPlatform(release, 'windows'),
      macos: findMacOSAssets(release),
      linux: findAssetForPlatform(release, 'linux'),
    },
  }
}

/**
 * Получить версию для отображения (fallback если нет релизов)
 */
export function getDisplayVersion(release: Release | null): string {
  if (!release) {
    return '0.7.0'
  } // Fallback версия
  return release.tag_name.replace(/^v/, '')
}
