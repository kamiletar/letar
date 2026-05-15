/**
 * Компоненты плеера
 */

export { VideoPlayer } from './VideoPlayer'

// Типы из types.ts
export type { AudioTrackInfo, PlayerState, SubtitleFormat, VideoPlayerProps, VideoPlayerRef } from './types'

// Константы
export { AUDIO_SYNC_THRESHOLD, HIDE_CONTROLS_TIMEOUT, SKIP_TIME, VOLUME_STEP } from './constants'

// Хуки (для расширения плеера)
export {
  useAudioSync,
  useAutoHideControls,
  useKeyboardShortcuts,
  usePlayerControls,
  usePlayerState,
  useSubtitleManagement,
} from './_hooks'

// Подкомпоненты (для кастомизации)
export { PlayerHeader } from './_components'

// Shared компоненты из @letar/video-player-react
export {
  PlayerLoadingOverlay,
  SharedPlayerControls,
  SubtitleOverlay,
  type SubtitleOverlayProps,
} from '@letar/video-player-react'

export { TrackSelector } from './TrackSelector'
export type { TrackInfo, TrackSelectorProps } from './TrackSelector'

export { TrackEditDialog } from './TrackEditDialog'
export type { TrackEditDialogProps } from './TrackEditDialog'

export { ChapterMarkers, detectChapterTypes } from './ChapterMarkers'
export type { Chapter, ChapterMarkersProps } from './ChapterMarkers'

export { ChapterEditor } from './ChapterEditor'
export type { ChapterEditorProps, EpisodeBrief } from './ChapterEditor'

export { ComparePlayer } from './ComparePlayer'

// Оверлеи из @letar/video-player-react
export { ResumeOverlay, UpNextOverlay } from '@letar/video-player-react'
export type { ResumeOverlayProps, UpNextContent, UpNextOverlayProps } from '@letar/video-player-react'

export { CompletionOverlay } from './CompletionOverlay'
export type { CompletionOverlayProps } from './CompletionOverlay'
