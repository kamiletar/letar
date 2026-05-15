/**
 * Типы для глобального видеоплеера (mini-player)
 */

/** Режим отображения видео */
export type VideoDisplayMode =
  | 'embedded' // Встроен в страницу просмотра (WatchPage)
  | 'mini' // Свёрнут в mini-player
  | 'pip' // Нативный Picture-in-Picture
  | 'hidden' // Скрыт (нет активного видео)

/** Метаданные воспроизведения */
export interface PlaybackMetadata {
  /** ID эпизода */
  episodeId: string
  /** ID аниме */
  animeId: string
  /** Название аниме */
  animeName: string
  /** Номер эпизода */
  episodeNumber: number
  /** Название эпизода */
  episodeName?: string
  /** Номер сезона */
  seasonNumber?: number
  /** Путь к постеру */
  posterPath?: string | null
  /** Путь для возврата на страницу просмотра */
  returnPath: string
}

/** Состояние глобального видео */
export interface GlobalVideoState {
  /** Режим отображения */
  mode: VideoDisplayMode
  /** URL видео источника */
  src: string | null
  /** URL отдельной аудиодорожки */
  audioSrc: string | null
  /** Текущее время воспроизведения (сек) */
  currentTime: number
  /** Длительность видео (сек) */
  duration: number
  /** Воспроизводится ли видео */
  isPlaying: boolean
  /** Громкость (0-1) */
  volume: number
  /** Выключен ли звук */
  isMuted: boolean
  /** Метаданные текущего контента */
  metadata: PlaybackMetadata | null
}
