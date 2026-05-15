/**
 * Реэкспорт хуков просмотрщика мандал.
 */

// Утилитарные хуки
export { useEventListener, useEventListeners } from './use-event-listener'
export { getVariantStyles, useVariantStyles, type VariantStyles, type ViewerVariant } from './use-variant-styles'

// Canvas эффекты
export {
  useCanvasEffect,
  type CanvasSize,
  type UseCanvasEffectOptions,
  type UseCanvasEffectProps,
} from './use-canvas-effect'

// Аудио
export { useAudioAnalyzer, type AudioAnalyzerData } from './use-audio-analyzer'
export { useAudioKeyboardShortcuts } from './use-audio-keyboard-shortcuts'
export { useAudioPlayback, type PlaylistItem } from './use-audio-playback'
export { useAudioSyncedEffects } from './use-audio-synced-effects'
export { useCustomAudioTracks } from './use-custom-audio-tracks'

// Визуальные эффекты
export { useBreathingScale, type BreathingMode } from './use-breathing-scale'
export { useHueRotateEffect } from './use-hue-rotate-effect'

// Управление
export { useFullscreenControls } from './use-fullscreen-controls'
export { useGestureControls } from './use-gesture-controls'
export { useMandalaNavigation } from './use-mandala-navigation'
export { useViewerSettingsStorage } from './use-viewer-settings-storage'
