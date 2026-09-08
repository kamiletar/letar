import type { MacOSAssets, ParsedRelease, Platform, Release, ReleaseAsset, ReleaseChange } from '@/types/release'
import { fetchLatestRelease, fetchReleases } from '@letar/github-releases'

/**
 * Откуда брать релизы — owner/repo GitHub плюс опциональный префикс тега. Префикс нужен, когда
 * репозиторий публикует несколько продуктов монорепо под одними Releases (см. README
 * `@letar/github-releases`) — без него релизы разных продуктов было бы не различить.
 */
export interface ReleaseSource {
  owner: string
  repo: string
  tagPrefix?: string
}

/** Полная Animatrona — собственный репозиторий, один продукт на репо, префикс не нужен */
export const ANIMATRONA_SOURCE: ReleaseSource = {
  owner: process.env.GITHUB_OWNER || 'kamiletar',
  repo: process.env.GITHUB_REPO || 'animatrona',
}

/** Плеер аниме из папки — релизы едут прямо из монорепо `kamiletar/letar`, без зеркалирования исходников */
export const FOLDER_PLAYER_SOURCE: ReleaseSource = {
  owner: 'kamiletar',
  repo: 'letar',
  tagPrefix: 'animatrona-folder-player-v',
}

/**
 * @letar/github-releases типизирует ответ узким срезом полей (см. его README) — сам ответ
 * GitHub возвращает полный объект Release, поэтому каст на более широкий локальный тип не меняет
 * рантайм-поведение, только расширяет то, что видит TypeScript.
 */
function asRelease(release: Awaited<ReturnType<typeof fetchLatestRelease>>): Release | null {
  return release as unknown as Release | null
}

/**
 * Получить последний релиз указанного продукта (по умолчанию — полная Animatrona)
 */
export async function getLatestRelease(source: ReleaseSource = ANIMATRONA_SOURCE): Promise<Release | null> {
  const release = await fetchLatestRelease({ ...source, token: process.env.GITHUB_TOKEN })
  return asRelease(release)
}

/**
 * Получить все релизы указанного продукта (по умолчанию — полная Animatrona)
 */
export async function getAllReleases(source: ReleaseSource = ANIMATRONA_SOURCE, limit = 10): Promise<Release[]> {
  const releases = await fetchReleases({ ...source, token: process.env.GITHUB_TOKEN, limit })
  return releases as unknown as Release[]
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
    let text: string

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
 * Найти оба Windows-ассета релиза — NSIS-инсталлятор и портативную сборку. В отличие от
 * `findAssetForPlatform('windows')` (берёт первый `.exe`), различает их по имени артефакта —
 * нужно продуктам с двумя `.exe` в одном релизе (см. `electron-builder.yml` `win.target`).
 */
export function findWindowsAssets(release: Release): { installer: ReleaseAsset | null; portable: ReleaseAsset | null } {
  const exeAssets = release.assets.filter((asset) => /\.exe$/i.test(asset.name))
  const portable = exeAssets.find((asset) => /portable/i.test(asset.name)) || null
  const installer = exeAssets.find((asset) => asset !== portable) || null
  return { installer, portable }
}

/**
 * Найти ассеты macOS для обеих архитектур
 */
export function findMacOSAssets(release: Release): MacOSAssets {
  const dmgAssets = release.assets.filter((asset) => /\.dmg$/i.test(asset.name))

  // Паттерны: -arm64.dmg для Apple Silicon, -x64.dmg или без суффикса для Intel
  const arm64 = dmgAssets.find((asset) => /-arm64\.dmg$/i.test(asset.name)) || null
  // x64 может быть с суффиксом -x64 или без архитектуры (legacy)
  const x64 = dmgAssets.find((asset) => /-x64\.dmg$/i.test(asset.name))
    || dmgAssets.find((asset) => !/-arm64\.dmg$/i.test(asset.name))
    || null

  return { arm64, x64 }
}

export { formatFileSize } from '@letar/github-releases'

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
      windows: findWindowsAssets(release).installer,
      macos: findMacOSAssets(release),
      linux: findAssetForPlatform(release, 'linux'),
    },
  }
}

/**
 * Получить версию для отображения (fallback если нет релизов)
 */
export function getDisplayVersion(release: Release | null, fallback = '0.7.0'): string {
  if (!release) {
    return fallback
  }
  return release.tag_name.replace(/^v/, '')
}
