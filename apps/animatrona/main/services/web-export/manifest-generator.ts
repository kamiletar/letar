/**
 * ManifestGenerator — генерация manifest.json для Web Player
 */

import { app } from 'electron'

import type { QueueExportConfig } from '../../../shared/types/export-queue'
import { resolveTrackKey as getTrackKey } from '../../../shared/types/track-key'
import type {
  WebPlayerAudioTrack,
  WebPlayerChapter,
  WebPlayerEpisode,
  WebPlayerManifest,
  WebPlayerResourceMode,
  WebPlayerSubtitleTrack,
} from '../../../shared/types/web-player'

/** Опции генерации манифеста */
interface ManifestOptions {
  config: QueueExportConfig
  mode: WebPlayerResourceMode
  selectedEpisodes: number[]
  defaultAudioKey?: string
  defaultSubtitleKey?: string
}

/**
 * Генерирует путь к ресурсу в зависимости от режима
 */
function getResourcePath(cid: string, relativePath: string, mode: WebPlayerResourceMode): string {
  if (mode === 'referenced') {
    // Используем CID напрямую — плеер будет запрашивать через gateway
    return cid
  }
  // Embedded — используем относительный путь
  return relativePath
}

/**
 * Конвертирует главы в формат Web Player
 */
function convertChapters(
  chapters: Array<{ startMs: number; endMs: number; title: string | null; type: string }>,
): WebPlayerChapter[] {
  return chapters.map((ch) => ({
    start: ch.startMs / 1000,
    end: ch.endMs / 1000,
    title: ch.title || '',
    type: (ch.type as WebPlayerChapter['type']) || 'content',
  }))
}

/**
 * Генерирует манифест для Web Player
 */
export function generateManifest(options: ManifestOptions): WebPlayerManifest {
  const { config, mode, selectedEpisodes, defaultAudioKey, defaultSubtitleKey } = options

  // Фильтруем эпизоды по выбранным номерам
  const episodes = config.episodes
    .filter((ep) => selectedEpisodes.includes(ep.number))
    .sort((a, b) => a.number - b.number)

  // Конвертируем эпизоды в формат манифеста
  const manifestEpisodes: WebPlayerEpisode[] = episodes.map((ep) => {
    // Аудиодорожки
    const audioTracks: WebPlayerAudioTrack[] = ep.audioTracks
      .filter((t) => {
        const key = getTrackKey(t.language, t.title)
        return config.selectedAudioKeys.includes(key)
      })
      .map((t) => ({
        language: t.language,
        title: t.title || 'Default',
        src: getResourcePath(
          t.transcodedCid,
          `episodes/${String(ep.number).padStart(2, '0')}/audio/${t.language}.m4a`,
          mode,
        ),
      }))

    // Субтитры
    const subtitleTracks: WebPlayerSubtitleTrack[] = ep.subtitleTracks
      .filter((t) => {
        const key = getTrackKey(t.language, t.title)
        return config.selectedSubtitleKeys.includes(key)
      })
      .map((t) => {
        // Определяем формат по метаданным или дефолт ASS
        const format = (t.format?.toLowerCase() as 'ass' | 'srt' | 'vtt') || 'ass'

        return {
          language: t.language,
          title: t.title || 'Default',
          format,
          src: getResourcePath(
            t.fileCid,
            `episodes/${String(ep.number).padStart(2, '0')}/subs/${t.language}.ass`,
            mode,
          ),
          // Шрифты всегда по локальным путям — они добавляются в структуру директории
          // Префикс ./ чтобы getUrl не добавлял gateway
          fonts: t.fontCids.map((_, i) => `./episodes/${String(ep.number).padStart(2, '0')}/fonts/font${i}.ttf`),
        }
      })

    // Длительность в секундах (fallback 24 минуты)
    const duration = ep.durationMs ? Math.round(ep.durationMs / 1000) : 1440

    return {
      number: ep.number,
      name: ep.name || undefined,
      season: ep.seasonNumber,
      duration,
      video: getResourcePath(ep.videoCid, `episodes/${String(ep.number).padStart(2, '0')}/video.webm`, mode),
      audio: audioTracks,
      subtitles: subtitleTracks,
      chapters: ep.chapters.length > 0 ? convertChapters(ep.chapters) : undefined,
    }
  })

  // Получаем версию приложения
  const appVersion = app.getVersion()

  return {
    version: 2,
    type: 'anime',
    anime: {
      name: config.animeName,
      originalName: config.originalName || undefined,
      year: config.year,
      poster: config.posterCid ? (mode === 'embedded' ? 'poster.webp' : config.posterCid) : undefined,
    },
    episodes: manifestEpisodes,
    defaults: {
      audioTrack: defaultAudioKey,
      subtitleTrack: defaultSubtitleKey,
    },
    resourceMode: mode,
    createdAt: new Date().toISOString(),
    generatorVersion: appVersion,
  }
}
