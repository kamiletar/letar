/**
 * Кастомные хуки для Animatrona
 */

// Сканирование папки
export { useScanFolder } from './use-scan-folder'
export type {
  BaseScannedFile,
  InitialSelectionFn,
  ParseFileFn,
  SortFn,
  UseScanFolderOptions,
  UseScanFolderResult,
} from './use-scan-folder'

// AnimeManifest из IPFS (v0.28.0)
export { useAnimeManifest } from './use-anime-manifest'

// AnimeInfo из IPFS (метаданные аниме)
export { useAnimeInfo } from './use-anime-info'

// Главы эпизода из IPFS манифеста
export { useEpisodeChapters } from './use-episode-chapters'

// Sprite thumbnails для hover preview на таймлайне
export { useSpriteThumbnails } from './use-sprite-thumbnails'

// IPFS данные аниме (превью, связи, видео, дорожки)
export { useAnimeIpfsData } from './use-anime-ipfs-data'

// URL обложки через локальный Kubo gateway
export { useCoverUrl } from './use-cover-url'

// Виртуализация сетки карточек с адаптивным числом колонок
export { useVirtualizedGrid } from './use-virtualized-grid'
export type { UseVirtualizedGridOptions } from './use-virtualized-grid'
