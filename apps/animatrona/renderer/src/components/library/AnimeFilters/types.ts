/** Опции сортировки */
export type SortOption =
  | 'title'
  | '-title'
  | '-updatedAt'
  | '-createdAt'
  | '-watchedAt'
  | 'year'
  | '-year'
  | '-rating'
  | '-episodeCount'

/** Пропсы для компонента фильтров */
export interface AnimeFiltersProps {
  /** Поисковый запрос */
  search: string
  onSearchChange: (value: string) => void

  /** Статус аниме */
  status: string
  onStatusChange: (value: string) => void

  /** Год выпуска — диапазон (v0.19.0) */
  yearMin: string
  onYearMinChange: (value: string) => void
  yearMax: string
  onYearMaxChange: (value: string) => void
  /** Очистка обоих полей года за один вызов (v0.19.0 fix) */
  onYearRangeClear?: () => void

  /** Жанр */
  genre: string
  onGenreChange: (value: string) => void
  genres: { id: string; name: string }[]

  /** Студия (v0.5.1) */
  studio: string
  onStudioChange: (value: string) => void
  studios: { id: string; name: string }[]

  /** Команда озвучки (v0.5.1) */
  fandubber: string
  onFandubberChange: (value: string) => void
  fandubbers: { id: string; name: string }[]

  /** Режиссёр (v0.19.0) */
  director: string
  onDirectorChange: (value: string) => void
  directors: { id: string; name: string }[]

  /** Диапазон эпизодов (v0.5.1) */
  episodesMin: string
  onEpisodesMinChange: (value: string) => void
  episodesMax: string
  onEpisodesMaxChange: (value: string) => void
  /** Очистка обоих полей эпизодов за один вызов (v0.19.0 fix) */
  onEpisodesRangeClear?: () => void

  /** Разрешение (v0.6.35) */
  resolution: string
  onResolutionChange: (value: string) => void

  /** Битность (v0.6.35) */
  bitDepth: string
  onBitDepthChange: (value: string) => void

  /** Очистка обоих полей качества за один вызов (v0.19.0 fix) */
  onQualityClear?: () => void

  /** Сортировка (v0.7.0) */
  sortBy: SortOption
  onSortChange: (value: SortOption) => void

  /** Статус просмотра (v0.9.0) */
  watchStatus: string
  onWatchStatusChange: (value: string) => void

  /** Статус хранения: '' = все, 'local' = на диске, 'remote' = облако */
  pinnedStatus: string
  onPinnedStatusChange: (value: string) => void

  /** Возрастной рейтинг: '' = все, 'kids' = до 13, 'teen' = 13+, 'adult' = 17+ */
  ageRatingFilter: string
  onAgeRatingFilterChange: (value: string) => void

  /** Сброс всех фильтров */
  onReset: () => void

  /** Количество результатов (для кнопки "Показать") */
  resultCount?: number

  /** Счётчики для faceted search (v0.18.0) */
  counts?: {
    status?: Record<string, number>
    year?: Record<string, number>
    watchStatus?: Record<string, number>
    resolution?: Record<string, number>
    bitDepth?: Record<string, number>
  }

  /** Флаг загрузки счётчиков */
  isLoadingCounts?: boolean
}
