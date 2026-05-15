/**
 * Factory для media URL утилит.
 *
 * Каждое приложение создаёт instance со своей toPlayerUrl:
 * - tracker: через IPFS gateway напрямую
 * - web: через /api/ipfs/[cid] прокси
 */

/** Хелперы для работы с media URL */
export interface MediaUrlHelpers {
  /** Конвертировать CID в URL для плеера */
  toPlayerUrl: (cid: string) => string
  /** Получить URL видео из манифеста */
  getVideoUrl: (video: { cid: string }) => string
  /** Получить URL аудиодорожки */
  getAudioUrl: (track: { cid?: string | null }) => string | null
  /** Получить URL субтитров */
  getSubtitleUrl: (track: { cid?: string | null }) => string | null
  /** Получить URL'ы шрифтов из субтитров */
  getFontUrls: (fonts?: Array<{ cid?: string | null }>) => string[]
}

/**
 * Создаёт набор хелперов для работы с media URL.
 *
 * @param toPlayerUrl — функция конвертации CID → URL (зависит от приложения)
 */
export function createMediaUrlHelpers(toPlayerUrl: (cid: string) => string): MediaUrlHelpers {
  return {
    toPlayerUrl,

    getVideoUrl(video: { cid: string }): string {
      return toPlayerUrl(video.cid)
    },

    getAudioUrl(track: { cid?: string | null }): string | null {
      return track.cid ? toPlayerUrl(track.cid) : null
    },

    getSubtitleUrl(track: { cid?: string | null }): string | null {
      return track.cid ? toPlayerUrl(track.cid) : null
    },

    getFontUrls(fonts?: Array<{ cid?: string | null }>): string[] {
      if (!fonts) {
        return []
      }
      return fonts.filter((f): f is { cid: string } => !!f.cid).map((f) => toPlayerUrl(f.cid))
    },
  }
}
