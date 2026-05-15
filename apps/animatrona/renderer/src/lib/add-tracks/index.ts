/**
 * Модуль добавления дорожек из папки-донора
 *
 * Структура:
 * - types.ts — типы и интерфейсы
 * - utils.ts — утилитарные функции
 * - episode-matcher.ts — сопоставление файлов с эпизодами
 * - use-add-tracks-state.ts — управление состоянием wizard
 * - use-track-analysis.ts — сканирование и анализ файлов (ffprobe)
 * - use-track-selection.ts — выбор дорожек
 * - use-track-processing.ts — обработка/транскодирование
 * - use-add-tracks-flow.ts — главный хук-композиция
 */

// Типы
export type {
  AddTracksProgress,
  AddTracksStage,
  AddTracksState,
  AddedRecord,
  AudioTask,
  DonorProbeResult,
  FileProgress,
  LibraryEpisode,
  SelectedTrack,
  SubtitleTask,
  TrackFilterConfig,
  TrackInfo,
  UseAddTracksFlowOptions,
} from './types'

// Утилиты
export {
  DEFAULT_TRACK_FILTER,
  formatChannels,
  getInitialConcurrency,
  needsAudioTranscode,
  runWithConcurrency,
  shouldAutoSelectTrack,
} from './utils'

// Episode matcher
export * from './episode-matcher'

// Хуки (для продвинутого использования)
export { useAddTracksState, type UseAddTracksStateReturn } from './use-add-tracks-state'
export { useTrackAnalysis, type UseTrackAnalysisReturn } from './use-track-analysis'
export { useTrackProcessing, type UseTrackProcessingReturn } from './use-track-processing'
export { useTrackSelection, type UseTrackSelectionReturn } from './use-track-selection'

// Главный хук
export { useAddTracksFlow } from './use-add-tracks-flow'
