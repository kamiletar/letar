/**
 * Типы для GitHub Releases API
 */

export interface ReleaseAsset {
  id: number
  name: string
  size: number
  browser_download_url: string
  content_type: string
  download_count: number
}

export interface Release {
  id: number
  tag_name: string
  name: string
  body: string | null
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at: string
  assets: ReleaseAsset[]
  html_url: string
}

/**
 * Архитектура Mac
 */
export type MacArch = 'arm64' | 'x64'

/**
 * Ассеты для macOS (два варианта)
 */
export interface MacOSAssets {
  /** Apple Silicon (M1/M2/M3) */
  arm64: ReleaseAsset | null
  /** Intel */
  x64: ReleaseAsset | null
}

export interface ParsedRelease {
  version: string
  date: string
  changes: ReleaseChange[]
  /** Оригинальный body релиза из GitHub для рендеринга Markdown */
  rawBody?: string | null
  assets: {
    windows: ReleaseAsset | null
    macos: MacOSAssets
    linux: ReleaseAsset | null
  }
}

export interface ReleaseChange {
  type: 'feature' | 'fix' | 'improvement' | 'breaking'
  text: string
}

/**
 * Платформа для скачивания
 */
export type Platform = 'windows' | 'macos' | 'linux'

/**
 * Информация о платформе
 */
export interface PlatformInfo {
  name: string
  icon: string
  filePattern: RegExp
  requirements: string[]
}

export const PLATFORMS: Record<Platform, PlatformInfo> = {
  windows: {
    name: 'Windows',
    icon: '⊞',
    filePattern: /\.exe$/i,
    requirements: ['Windows 10+', 'NVIDIA GPU (опционально)'],
  },
  macos: {
    name: 'macOS',
    icon: '',
    filePattern: /\.dmg$/i,
    requirements: ['macOS 10.13+', 'Intel или Apple Silicon'],
  },
  linux: {
    name: 'Linux',
    icon: '🐧',
    filePattern: /\.AppImage$/i,
    requirements: ['Ubuntu 18.04+', 'Debian, Fedora, Arch'],
  },
}
