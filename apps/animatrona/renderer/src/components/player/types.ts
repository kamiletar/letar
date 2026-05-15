/**
 * Типы для VideoPlayer компонента (desktop)
 *
 * Общие типы реэкспортируются из @letar/video-player-core.
 * Desktop-specific типы определены здесь.
 */

// ─── Реэкспорт shared типов из core ────────────────────────────────

export type {
  AudioTrackInfo,
  PlayerState,
  SubtitleRenderFormat as SubtitleFormat,
  VideoMetadata,
} from '@letar/video-player-core'

// ─── Desktop-specific типы ──────────────────────────────────────────

import type { AudioTrackInfo } from '@letar/video-player-core'

/** Пропсы компонента VideoPlayer */
export interface VideoPlayerProps {
  /** Путь к видеофайлу (локальный путь или URL) */
  src: string
  /** Метаданные видео для оверлея (I) */
  videoMetadata?: import('@letar/video-player-core').VideoMetadata
  /** Автоматически начать воспроизведение */
  autoPlay?: boolean
  /** Начальная позиция в секундах */
  startTime?: number
  /** Показывать контролы */
  showControls?: boolean
  /** Обработчик изменения времени */
  onTimeUpdate?: (currentTime: number, duration: number) => void
  /** Обработчик окончания видео */
  onEnded?: () => void
  /** Обработчик ошибки */
  onError?: (error: Error) => void
  /** Обработчик изменения состояния воспроизведения */
  onPlayStateChange?: (isPlaying: boolean) => void
  /** Аудиодорожки (для режима раздельных дорожек) */
  audioTracks?: AudioTrackInfo[]
  /** ID текущей аудиодорожки */
  currentAudioTrackId?: string
  /** Обработчик смены аудиодорожки */
  onAudioTrackChange?: (trackId: string) => void
  /** Путь к файлу субтитров */
  subtitlePath?: string | null
  /** Формат субтитров (ass, srt, vtt) — если не указан, определяется по расширению URL */
  subtitleFormat?: 'ass' | 'ssa' | 'srt' | 'vtt' | null
  /** Шрифты для субтитров */
  subtitleFonts?: string[]
  /** Главы для маркеров на прогресс-баре */
  chapters?: Array<{ id: string; title: string; startTime: number }>
  /** Переход к главе */
  onChapterSeek?: (time: number) => void
  /** Есть предыдущий эпизод */
  hasPrevEpisode?: boolean
  /** Есть следующий эпизод */
  hasNextEpisode?: boolean
  /** Переход к предыдущему эпизоду */
  onPrevEpisode?: () => void
  /** Переход к следующему эпизоду */
  onNextEpisode?: () => void
  /** Tooltip для предыдущего эпизода */
  prevEpisodeTooltip?: string
  /** Tooltip для следующего эпизода */
  nextEpisodeTooltip?: string
  /** Контент для левой части верхней панели (кнопка назад, название) */
  headerLeft?: React.ReactNode
  /** Контент для центра верхней панели (информация об эпизоде) */
  headerCenter?: React.ReactNode
  /** Контент для правой части верхней панели (выбор дорожек) */
  headerRight?: React.ReactNode
  /**
   * Внешнее аудио управляется снаружи (через useExternalAudio)
   * Когда true, VideoPlayer не будет обновлять isMuted состояние по video.muted
   * (потому что video.muted всегда true для внешнего аудио)
   */
  externalAudioManaged?: boolean
  /** URL спрайт-изображения для hover preview на таймлайне */
  spriteUrl?: string
  /** Распарсенные VTT cues для hover preview на таймлайне */
  spriteCues?: import('@letar/video-player-react').SpriteCue[]
}

/** Публичный API плеера */
export interface VideoPlayerRef {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  setVolume: (volume: number) => void
  getVolume: () => number
  toggleFullscreen: () => void
  /** Получить video элемент (для синхронизации внешнего аудио) */
  getVideoElement: () => HTMLVideoElement | null
}
