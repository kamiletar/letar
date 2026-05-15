/**
 * Пресеты аудио-синхронизации для просмотрщика мандал.
 */

import type { AudioSyncMode } from './viewer-constants'

// =============================================================================
// Типы пресетов
// =============================================================================

/**
 * Пресеты для разных жанров музыки
 */
export const AUDIO_PRESETS = ['custom', 'meditation', 'ambient', 'trance', 'psytrance'] as const
export type AudioPreset = (typeof AUDIO_PRESETS)[number]

/**
 * Названия пресетов для UI
 */
export const AUDIO_PRESET_LABELS: Record<AudioPreset, string> = {
  custom: 'Ручной',
  meditation: 'Медитация',
  ambient: 'Эмбиент',
  trance: 'Транс',
  psytrance: 'Псай-транс',
}

/**
 * Описания пресетов для UI
 */
export const AUDIO_PRESET_DESCRIPTIONS: Record<AudioPreset, string> = {
  custom: 'Ручная настройка',
  meditation: 'Мягкие эффекты для спокойной музыки',
  ambient: 'Минимальные эффекты для фоновой музыки',
  trance: 'Энергичные эффекты для транса',
  psytrance: 'Максимальные эффекты для psytrance',
}

// =============================================================================
// Конфигурации пресетов
// =============================================================================

/**
 * Настройки аудио-синхронизации для каждого пресета
 */
export interface AudioPresetConfig {
  audioSyncMode: AudioSyncMode
  bassSensitivity: number
  beatSensitivity: number
  beatPulseEnabled: boolean
  adaptiveGradientEnabled: boolean
  adaptiveSpinEnabled: boolean
}

/**
 * Конфигурации для всех пресетов (кроме custom)
 */
export const AUDIO_PRESET_CONFIGS: Record<Exclude<AudioPreset, 'custom'>, AudioPresetConfig> = {
  meditation: {
    audioSyncMode: 'meditation',
    bassSensitivity: 40,
    beatSensitivity: 30,
    beatPulseEnabled: true,
    adaptiveGradientEnabled: true,
    adaptiveSpinEnabled: false,
  },
  ambient: {
    audioSyncMode: 'meditation',
    bassSensitivity: 20,
    beatSensitivity: 10,
    beatPulseEnabled: false,
    adaptiveGradientEnabled: true,
    adaptiveSpinEnabled: false,
  },
  trance: {
    audioSyncMode: 'trance',
    bassSensitivity: 70,
    beatSensitivity: 80,
    beatPulseEnabled: true,
    adaptiveGradientEnabled: true,
    adaptiveSpinEnabled: true,
  },
  psytrance: {
    audioSyncMode: 'trance',
    bassSensitivity: 90,
    beatSensitivity: 95,
    beatPulseEnabled: true,
    adaptiveGradientEnabled: true,
    adaptiveSpinEnabled: true,
  },
}
