/**
 * Экспорт хуков для VideoPlayer
 *
 * 4 хука re-exported из @letar/video-player-react (shared)
 * 1 хук остаётся локальным (Electron-специфичный)
 */

// Shared хуки из библиотеки
export { useAutoHideControls, useKeyboardShortcuts, usePlayerControls, usePlayerState } from '@letar/video-player-react'
export type {
  UseAutoHideControlsOptions,
  UseAutoHideControlsReturn,
  UseKeyboardShortcutsOptions,
  UsePlayerControlsOptions,
  UsePlayerControlsReturn,
  UsePlayerStateOptions,
  UsePlayerStateReturn,
} from '@letar/video-player-react'

// Electron-специфичный хук
export { useSubtitleManagement } from './useSubtitleManagement'
export type { UseSubtitleManagementOptions, UseSubtitleManagementReturn } from './useSubtitleManagement'
