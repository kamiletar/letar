/**
 * Контракт хоста для папочного плеера — абстрагирует IPC/Electron-specific вызовы.
 *
 * Renderer-код (`useFolderPlayer`, `useExternalAudio`, ...) не знает про `window.electronAPI`
 * напрямую — вместо этого принимает реализацию `FolderPlayerHost`. Так один и тот же код
 * работает и в Animatrona (host строится из `window.electronAPI`), и в будущем лёгком
 * приложении-плеере (host на своих собственных IPC-каналах и `MediaInfoWasmProber`).
 */

import type { SubtitleType } from '@letar/folder-scan'

/** Базовая информация о медиафайле, полученная сканером папки */
export interface MediaFileInfo {
  path: string
  name: string
  size: number
  extension: string
}

/** Фильтр расширений для системного диалога выбора файла */
export interface FileFilter {
  name: string
  extensions: string[]
}

/** Результат матчинга внешнего субтитра */
export interface ExternalSubtitleMatch {
  filePath: string
  language: string
  title: string
  format: 'ass' | 'srt' | 'vtt' | 'ssa'
  episodeNumber: number | null
  fontNames: string[]
  matchedFonts: Array<{ name: string; path: string }>
  groupName?: string
  subtitleType: SubtitleType
}

/** Результат сканирования внешних субтитров */
export interface ExternalSubtitleScanResult {
  subsDirs: string[]
  fontsDirs: string[]
  subtitles: ExternalSubtitleMatch[]
  unmatchedFiles: string[]
}

/** Результат матчинга внешнего аудио */
export interface ExternalAudioMatch {
  filePath: string
  episodeNumber: number | null
  language: string
  title: string
  groupName: string
  codec: string
  channels: number
  bitrate: number
}

/** Результат сканирования внешнего аудио */
export interface ExternalAudioScanResult {
  audioDirs: string[]
  audioTracks: ExternalAudioMatch[]
  unmatchedFiles: string[]
}

/** Аудиодорожка, найденная пробой медиафайла */
export interface ProbedAudioTrack {
  index: number
  language: string
  title: string
  codec: string
  channels: number
  bitrate?: number
  isDefault?: boolean
  isForced?: boolean
}

/** Дорожка субтитров, найденная пробой медиафайла */
export interface ProbedSubtitleTrack {
  index: number
  language: string
  title: string
  codec: string
  isDefault?: boolean
  isForced?: boolean
  subtitleType?: SubtitleType
}

/** Данные, которые пробa (ffprobe / MediaInfo) отдаёт о медиафайле */
export interface MediaProbeInfo {
  audioTracks?: ProbedAudioTrack[]
  subtitleTracks?: ProbedSubtitleTrack[]
}

/** Результат пробы медиафайла */
export interface MediaProbeResult {
  success: boolean
  data?: MediaProbeInfo
  error?: string
}

/**
 * Хост-контракт: всё, что папочный плеер запрашивает у окружения (Electron main-процесс
 * Animatrona, main-процесс лёгкого плеера, ...).
 */
export interface FolderPlayerHost {
  /** Открыть системный диалог выбора папки */
  selectFolder(): Promise<string | null>
  /** Открыть системный диалог выбора одного файла */
  selectFile(filters?: FileFilter[]): Promise<string | null>
  /** Сканировать папку на медиафайлы */
  scanFolder(
    folderPath: string,
    recursive?: boolean,
    mediaTypes?: Array<'video' | 'audio'>,
  ): Promise<{ success: boolean; files: MediaFileInfo[] }>
  /** Сканировать внешние аудиодорожки (Rus Sound/, Audio/ и т.д.) */
  scanExternalAudio(
    folderPath: string,
    videoFiles: Array<{ path: string; episodeNumber: number }>,
  ): Promise<ExternalAudioScanResult>
  /** Сканировать внешние субтитры (Rus Sub/, Eng Sub/ и т.д.) */
  scanExternalSubtitles(
    folderPath: string,
    videoFiles: Array<{ path: string; episodeNumber: number }>,
  ): Promise<ExternalSubtitleScanResult>
  /** Получить технические данные о медиафайле (аудио/субтитр дорожки, кодеки) */
  probe(filePath: string): Promise<MediaProbeResult>
  /** Преобразовать локальный путь в URL, воспроизводимый в `<video>`/`<audio>` */
  toMediaUrl(path: string): string
}

/**
 * Хранилище для персистентных данных папочного плеера (прогресс просмотра, история папок).
 *
 * Синхронный подмножество `Storage` (`localStorage`/`sessionStorage`) — оба Electron-приложения
 * (Animatrona, будущий лёгкий плеер) рендерят в обычном Chromium-окне, где `window.localStorage`
 * уже удовлетворяет этому контракту без адаптера.
 */
export interface FolderPlayerStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
