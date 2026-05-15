/**
 * Zod-схема настроек просмотрщика мандал.
 *
 * Константы и типы вынесены в:
 * - `../_constants/viewer-constants.ts` — основные константы
 * - `../_constants/audio-presets.ts` — аудио-пресеты
 */

import { z } from 'zod/v4'

import { AUDIO_PRESETS } from '../_constants/audio-presets'
import {
  AUDIO_SOURCES,
  AUDIO_SYNC_MODES,
  BREATHING_MODES,
  CONTROLS_MODES,
  EFFECT_TYPES,
  HUE_ROTATE_MODES,
  REPEAT_MODES,
} from '../_constants/viewer-constants'

// Реэкспорт для обратной совместимости
export * from '../_constants/audio-presets'
export * from '../_constants/viewer-constants'

// =============================================================================
// Zod-схема
// =============================================================================

/**
 * Схема настроек просмотра мандалы
 */
export const ViewerSettingsSchema = z.object({
  /** Длительность полного оборота в секундах (1-3600) */
  spinDuration: z.number().min(1).max(3600).default(60),
  /** Вращение на паузе */
  isPaused: z.boolean().default(false),
  /** Обратное направление вращения */
  isReverse: z.boolean().default(false),
  /** Индекс текущего эффекта (0-5) */
  effectIndex: z.number().min(0).max(5).default(0),
  /** Тип эффекта: gradient (круговой градиент) или solid (сплошной цвет) */
  effectType: z.enum(EFFECT_TYPES).default('gradient'),
  /** Автоматическая смена blend-эффектов */
  autoEffects: z.boolean().default(false),
  /** Интервал автосмены blend-эффектов в секундах */
  autoEffectInterval: z.number().min(5).max(60).default(10),
  /** Автоматическая смена layer-эффектов (gradient, conic, aurora, plasma, tunnel) */
  autoLayerEffects: z.boolean().default(false),
  /** Интервал автосмены layer-эффектов в секундах */
  autoLayerEffectInterval: z.number().min(5).max(120).default(15),
  /** Скорость анимации градиента в мс (1000-10000) */
  gradientDuration: z.number().min(1000).max(10000).default(4200),
  /** Режим медитации */
  meditationEnabled: z.boolean().default(false),
  /** Длительность медитации в минутах */
  meditationDuration: z.number().min(1).max(60).default(5),
  /** Анимация дыхания (пульсация) */
  breathingEnabled: z.boolean().default(false),
  /** Ночной режим (приглушённые цвета) */
  nightMode: z.boolean().default(false),
  /** Включена ли фоновая музыка */
  audioEnabled: z.boolean().default(false),
  /** Источник аудио: встроенный плеер или микрофон */
  audioSource: z.enum(AUDIO_SOURCES).default('player'),
  /** ID текущего встроенного трека */
  audioTrack: z.string().default('meditation-background'),
  /** ID кастомного трека пользователя (из OPFS) */
  customAudioTrackId: z.string().nullable().default(null),
  /** Громкость музыки (0-100) */
  audioVolume: z.number().min(0).max(100).default(50),
  /** Автоматический переход на следующую мандалу */
  autoNextEnabled: z.boolean().default(false),
  /** Интервал автоперехода в секундах */
  autoNextInterval: z.number().min(10).max(300).default(60),
  /** Синхронизация музыки с визуальными эффектами */
  audioSyncEnabled: z.boolean().default(false),
  /** Пресет аудио-синхронизации */
  audioPreset: z.enum(AUDIO_PRESETS).default('meditation'),
  /** Режим синхронизации: meditation (мягко) или trance (интенсивно) */
  audioSyncMode: z.enum(AUDIO_SYNC_MODES).default('meditation'),
  /** Чувствительность к басу (0-100) */
  bassSensitivity: z.number().min(0).max(100).default(50),
  /** Чувствительность к ритму (0-100) */
  beatSensitivity: z.number().min(0).max(100).default(50),
  /** Пульсация мандалы на бит */
  beatPulseEnabled: z.boolean().default(true),
  /** Адаптивная скорость градиента */
  adaptiveGradientEnabled: z.boolean().default(true),
  /** Адаптивная скорость вращения */
  adaptiveSpinEnabled: z.boolean().default(false),
  /** Длительность crossfade при смене мандалы в секундах (0.2-10) */
  crossfadeDuration: z.number().min(0.2).max(10).default(3.14),
  /** Включить эффект hue-rotate (цветовое вращение) */
  hueRotateEnabled: z.boolean().default(false),
  /** Режим работы hue-rotate эффекта */
  hueRotateMode: z.enum(HUE_ROTATE_MODES).default('combined'),
  /** Базовая скорость вращения hue в градусах/сек (0-100) */
  hueRotateBaseSpeed: z.number().min(0).max(100).default(12),
  /** Модуляция от баса в процентах (0-100) */
  hueRotateBassModulation: z.number().min(0).max(100).default(50),
  /** Размер скачка на бите в градусах (0-90) */
  hueRotateBeatJump: z.number().min(0).max(90).default(30),
  /** Сглаживание переходов в процентах (0-100) */
  hueRotateSmoothing: z.number().min(0).max(100).default(10),
  /** Виньетка — затемнение краёв */
  vignetteEnabled: z.boolean().default(false),
  /** Интенсивность виньетки (0-100) */
  vignetteIntensity: z.number().min(0).max(100).default(30),
  /** Свечение вокруг мандалы */
  glowEnabled: z.boolean().default(false),
  /** Цвет свечения */
  glowColor: z.string().default('#8B5CF6'),
  /** Интенсивность свечения (0-100) */
  glowIntensity: z.number().min(0).max(100).default(50),
  /** Показывать прогресс-кольцо аудио */
  showProgressRing: z.boolean().default(true),
  /** Показывать спектр-визуализатор */
  showSpectrum: z.boolean().default(false),
  /** Цвет спектра */
  spectrumColor: z.string().default('#8B5CF6'),
  /** Интенсивность спектра (0-100) */
  spectrumIntensity: z.number().min(0).max(100).default(50),
  /** Показывать мини-плеер */
  showMiniPlayer: z.boolean().default(true),
  /** Режим повтора плеера */
  repeatMode: z.enum(REPEAT_MODES).default('all'),
  /** Включён ли shuffle (случайный порядок треков) */
  isShuffled: z.boolean().default(false),
  /** Режим дыхания */
  breathingMode: z.enum(BREATHING_MODES).default('relaxing'),
  /** Показывать кольцо дыхания */
  showBreathingRing: z.boolean().default(true),
  /** Режим панели управления: простой или расширенный */
  controlsMode: z.enum(CONTROLS_MODES).default('simple'),
  /** ID текущего пресета атмосферы (null = ручные настройки) */
  currentPreset: z.string().nullable().default(null),
})

export type ViewerSettings = z.infer<typeof ViewerSettingsSchema>

// =============================================================================
// Значения по умолчанию
// =============================================================================

/**
 * Значения по умолчанию для настроек
 */
export const defaultViewerSettings: ViewerSettings = {
  spinDuration: 60,
  isPaused: false,
  isReverse: false,
  effectIndex: 0,
  effectType: 'gradient',
  autoEffects: false,
  autoEffectInterval: 10,
  autoLayerEffects: false,
  autoLayerEffectInterval: 15,
  gradientDuration: 4200,
  meditationEnabled: false,
  meditationDuration: 5,
  breathingEnabled: false,
  nightMode: false,
  audioEnabled: false,
  audioSource: 'player',
  audioTrack: 'meditation-background',
  customAudioTrackId: null,
  audioVolume: 50,
  autoNextEnabled: false,
  autoNextInterval: 60,
  audioSyncEnabled: false,
  audioPreset: 'meditation',
  audioSyncMode: 'meditation',
  bassSensitivity: 40,
  beatSensitivity: 30,
  beatPulseEnabled: true,
  adaptiveGradientEnabled: true,
  adaptiveSpinEnabled: false,
  crossfadeDuration: 3.14,
  hueRotateEnabled: false,
  hueRotateMode: 'combined',
  hueRotateBaseSpeed: 12,
  hueRotateBassModulation: 50,
  hueRotateBeatJump: 30,
  hueRotateSmoothing: 10,
  vignetteEnabled: false,
  vignetteIntensity: 30,
  glowEnabled: false,
  glowColor: '#8B5CF6',
  glowIntensity: 50,
  showProgressRing: true,
  showSpectrum: false,
  spectrumColor: '#8B5CF6',
  spectrumIntensity: 50,
  showMiniPlayer: true,
  repeatMode: 'all',
  isShuffled: false,
  breathingMode: 'relaxing',
  showBreathingRing: true,
  controlsMode: 'simple',
  currentPreset: null,
}
