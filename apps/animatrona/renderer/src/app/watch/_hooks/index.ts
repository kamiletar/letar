/**
 * Хуки для страницы просмотра эпизода
 */

// Типы
export { SAVE_INTERVAL } from './types'
export type { EpisodeNavInfo, EpisodeWithTracks, SubtitleTrackWithFonts } from './types'

// Хуки
export { useChapterAutoSkip, type UseChapterAutoSkipReturn } from './use-chapter-auto-skip'
export { useChapterEditor, type UseChapterEditorReturn } from './use-chapter-editor'
export { useEpisodeNavigation, type UseEpisodeNavigationReturn } from './use-episode-navigation'
export { usePlayerTracks, type UsePlayerTracksReturn } from './use-player-tracks'
export { useUpNext, type UpNextContent, type UseUpNextReturn } from './use-up-next'
export { useWatchProgress, type UseWatchProgressReturn } from './use-watch-progress'
export { useGlobalVideo } from './useGlobalVideo'
