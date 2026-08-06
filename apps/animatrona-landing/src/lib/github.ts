import type { MacOSAssets, ParsedRelease, Platform, Release, ReleaseChange } from '@/types/release'
import { fetchLatestRelease, fetchReleases } from '@letar/github-releases'

const OWNER = process.env.GITHUB_OWNER || 'kamiletar'
const REPO = process.env.GITHUB_REPO || 'animatrona'

/**
 * @letar/github-releases типизирует ответ узким срезом полей (см. его README) — сам ответ
 * GitHub возвращает полный объект Release, поэтому каст на более широкий локальный тип не меняет
 * рантайм-поведение, только расширяет то, что видит TypeScript.
 */
function asRelease(release: Awaited<ReturnType<typeof fetchLatestRelease>>): Release | null {
  return release as unknown as Release | null
}

/**
 * Получить последний релиз
 */
export async function getLatestRelease(): Promise<Release | null> {
  const release = await fetchLatestRelease({ owner: OWNER, repo: REPO, token: process.env.GITHUB_TOKEN })
  return asRelease(release)
}

/**
 * Получить все релизы
 */
export async function getAllReleases(limit = 10): Promise<Release[]> {
  const releases = await fetchReleases({ owner: OWNER, repo: REPO, token: process.env.GITHUB_TOKEN, limit })
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
