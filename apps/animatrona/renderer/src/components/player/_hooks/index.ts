/**
 * Экспорт хуков для VideoPlayer
 *
 * 4 хука re-exported из @letar/video-player-react (shared)
 * 3 хука остаются локальными (Electron-специфичные)
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

// Electron-специфичные хуки
export { useAudioSync } from './useAudioSync'
export type { UseAudioSyncOptions } from './useAudioSync'

export { useShakaPlayer } from './useShakaPlayer'
export type { UseShakaPlayerOptions, UseShakaPlayerReturn } from './useShakaPlayer'

export { useSubtitleManagement } from './useSubtitleManagement'
export type { UseSubtitleManagementOptions, UseSubtitleManagementReturn } from './useSubtitleManagement'
