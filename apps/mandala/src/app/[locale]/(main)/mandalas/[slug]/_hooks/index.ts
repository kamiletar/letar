/**
 * Реэкспорт хуков просмотрщика мандал.
 */

// Утилитарные хуки
export { useEventListener, useEventListeners } from './use-event-listener'
export { getVariantStyles, useVariantStyles, type VariantStyles, type ViewerVariant } from './use-variant-styles'

// Canvas эффекты
export {
  type CanvasSize,
  useCanvasEffect,
  type UseCanvasEffectOptions,
  type UseCanvasEffectProps,
} from './use-canvas-effect'

// Аудио
export { type AudioAnalyzerData, useAudioAnalyzer } from './use-audio-analyzer'
export { useAudioKeyboardShortcuts } from './use-audio-keyboard-shortcuts'
export { type PlaylistItem, useAudioPlayback } from './use-audio-playback'
export { useAudioSyncedEffects } from './use-audio-synced-effects'
export { useCustomAudioTracks } from './use-custom-audio-tracks'

// Визуальные эффекты
export { type BreathingMode, useBreathingScale } from './use-breathing-scale'
export { useHueRotateEffect } from './use-hue-rotate-effect'

// Управление
export { useFullscreenControls } from './use-fullscreen-controls'
export { useGestureControls } from './use-gesture-controls'
export { useMandalaNavigation } from './use-mandala-navigation'
export { useViewerSettingsStorage } from './use-viewer-settings-storage'
