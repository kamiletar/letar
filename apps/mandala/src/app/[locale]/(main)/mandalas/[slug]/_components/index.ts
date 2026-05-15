/**
 * Реэкспорт компонентов просмотрщика мандал.
 */

// =============================================================================
// Контролы (из подпапки controls/)
// =============================================================================
export * from './controls'

// =============================================================================
// Аудио плеер (из подпапки audio-player/)
// =============================================================================
export * from './audio-player'

// =============================================================================
// Саундскейпы (из подпапки soundscape/)
// =============================================================================
export { CategoryCard, type CategoryData } from './soundscape/category-card'
export { SoundscapeSelector } from './soundscape/index'
export { TrackCard } from './soundscape/track-card'

// =============================================================================
// Canvas эффекты
// =============================================================================
export { AnimatedAurora } from './animated-aurora'
export { AnimatedConicGradient } from './animated-conic-gradient'
export { AnimatedPlasma } from './animated-plasma'
export { AnimatedRadialGradient } from './animated-radial-gradient'
export { AnimatedSolidColor } from './animated-solid-color'
export { AnimatedTunnel } from './animated-tunnel'

// =============================================================================
// Визуальные эффекты и оверлеи
// =============================================================================
export { EffectLayerRenderer } from './effect-layer-renderer'
export { GlowOverlay } from './glow-overlay'
export { NightModeOverlay } from './night-mode-overlay'
export { VignetteOverlay } from './vignette-overlay'

// =============================================================================
// Аудио визуализация
// =============================================================================
export { AudioProgressRing } from './audio-progress-ring'
export { AudioSpectrumVisualizer } from './audio-spectrum-visualizer'

// =============================================================================
// Медитация и дыхание
// =============================================================================
export { BreathingGuide } from './breathing-guide'
export { BreathingOverlay } from './breathing-overlay'
export { MeditationAudioPlayer } from './meditation-audio-player'
export { MeditationTimer } from './meditation-timer'

// =============================================================================
// Аудио управление
// =============================================================================
export { CustomAudioManager } from './custom-audio-manager'
export { FloatingMiniPlayer } from './floating-mini-player'

// =============================================================================
// Навигация и карусель
// =============================================================================
export { MandalaCarousel } from './mandala-carousel'
export { MandalaNavigation } from './mandala-navigation'

// =============================================================================
// Основные компоненты
// =============================================================================
export { MandalaCanvas } from './mandala-canvas'
export { MandalaViewer } from './mandala-viewer'
export { QuickPresets } from './quick-presets'
export { ShareButton } from './share-button'
export { ViewerControls } from './viewer-controls'
