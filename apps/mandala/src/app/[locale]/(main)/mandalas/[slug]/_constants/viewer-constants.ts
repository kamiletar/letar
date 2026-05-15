/**
 * Константы для просмотрщика мандал.
 */

// =============================================================================
// Blend-эффекты
// =============================================================================

/**
 * Список доступных blend-эффектов
 */
export const BLEND_EFFECTS = ['multiply', 'color-burn', 'overlay', 'darken', 'color-dodge', 'disabled'] as const
export type BlendEffect = (typeof BLEND_EFFECTS)[number]

/**
 * Названия blend-эффектов для отображения в UI
 */
export const BLEND_EFFECT_LABELS: Record<BlendEffect, string> = {
  multiply: 'Умножение',
  'color-burn': 'Затемнение',
  overlay: 'Наложение',
  darken: 'Темнее',
  'color-dodge': 'Осветление',
  disabled: 'Выключено',
}

// =============================================================================
// Треки для медитации
// =============================================================================

/**
 * Доступные треки для медитации
 */
export const MEDITATION_TRACKS = [
  { id: 'none', name: 'Без музыки', url: '', category: 'none' },
  // Медитация
  {
    id: 'meditation-background',
    name: 'Meditation Background',
    url: '/api/files/audio/meditation-background.mp3',
    category: 'meditation',
  },
  {
    id: 'meditation-music',
    name: 'Meditation Music',
    url: '/api/files/audio/meditation-music.mp3',
    category: 'meditation',
  },
  // Эмбиент
  { id: 'ambient-calm', name: 'Ambient Calm', url: '/api/files/audio/ambient-calm.mp3', category: 'ambient' },
  { id: 'space-ambient', name: 'Space Ambient', url: '/api/files/audio/space-ambient.mp3', category: 'ambient' },
  {
    id: 'ambient-background',
    name: 'Ambient Background',
    url: '/api/files/audio/ambient-background.mp3',
    category: 'ambient',
  },
  // Транс
  {
    id: 'trance-progressive',
    name: 'Trance Progressive',
    url: '/api/files/audio/trance-progressive.mp3',
    category: 'trance',
  },
  { id: 'psycho-trance', name: 'Psycho Trance Journey', url: '/api/files/audio/psycho-trance.mp3', category: 'trance' },
] as const

export type MeditationTrackId = (typeof MEDITATION_TRACKS)[number]['id']
export type MeditationTrackCategory = (typeof MEDITATION_TRACKS)[number]['category']

// =============================================================================
// Типы эффектов (слои)
// =============================================================================

/**
 * Типы эффектов наложения (слои)
 */
export const EFFECT_TYPES = ['gradient', 'solid', 'conic', 'aurora', 'plasma', 'tunnel'] as const
export type EffectType = (typeof EFFECT_TYPES)[number]

/**
 * Названия типов эффектов для UI
 */
export const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
  gradient: 'Радиальный',
  solid: 'Сплошной',
  conic: 'Конический',
  aurora: 'Сияние',
  plasma: 'Плазма',
  tunnel: 'Тоннель',
}

// =============================================================================
// Источники аудио
// =============================================================================

/**
 * Источники аудио для синхронизации
 */
export const AUDIO_SOURCES = ['player', 'microphone'] as const
export type AudioSource = (typeof AUDIO_SOURCES)[number]

/**
 * Названия источников аудио для UI
 */
export const AUDIO_SOURCE_LABELS: Record<AudioSource, string> = {
  player: 'Встроенный плеер',
  microphone: 'Микрофон',
}

// =============================================================================
// Режимы синхронизации
// =============================================================================

/**
 * Режимы синхронизации музыки с эффектами
 */
export const AUDIO_SYNC_MODES = ['off', 'meditation', 'trance'] as const
export type AudioSyncMode = (typeof AUDIO_SYNC_MODES)[number]

/**
 * Названия режимов синхронизации для UI
 */
export const AUDIO_SYNC_MODE_LABELS: Record<AudioSyncMode, string> = {
  off: 'Выключено',
  meditation: 'Медитация',
  trance: 'Транс',
}

// =============================================================================
// Режимы Hue-Rotate эффекта
// =============================================================================

/**
 * Режимы работы hue-rotate эффекта
 */
export const HUE_ROTATE_MODES = ['bass', 'accumulative', 'multiband', 'beat-driven', 'combined'] as const
export type HueRotateMode = (typeof HUE_ROTATE_MODES)[number]

/**
 * Названия режимов hue-rotate для UI
 */
export const HUE_ROTATE_MODE_LABELS: Record<HueRotateMode, string> = {
  bass: 'По басу',
  accumulative: 'Плавное вращение',
  multiband: 'Многополосный',
  'beat-driven': 'Импульсы на битах',
  combined: 'Комбинированный',
}

// =============================================================================
// Режимы дыхания и управления
// =============================================================================

/**
 * Режимы дыхания
 */
export const BREATHING_MODES = ['4-7-8', 'box', 'relaxing', 'energizing'] as const
export type BreathingMode = (typeof BREATHING_MODES)[number]

/**
 * Режимы панели управления
 */
export const CONTROLS_MODES = ['simple', 'advanced'] as const
export type ControlsMode = (typeof CONTROLS_MODES)[number]

// =============================================================================
// Режимы повтора плеера
// =============================================================================

/**
 * Режимы повтора плейлиста
 */
export const REPEAT_MODES = ['off', 'one', 'all'] as const
export type RepeatMode = (typeof REPEAT_MODES)[number]

/**
 * Названия режимов повтора для UI
 */
export const REPEAT_MODE_LABELS: Record<RepeatMode, string> = {
  off: 'Выключено',
  one: 'Повтор трека',
  all: 'Повтор плейлиста',
}

// =============================================================================
// Кастомные аудио-треки
// =============================================================================

/**
 * Кастомный аудио-трек пользователя (хранится в OPFS)
 */
export interface CustomAudioTrack {
  /** Уникальный идентификатор (UUID) */
  id: string
  /** Название трека */
  name: string
  /** Категория для группировки */
  category: 'custom'
  /** Размер файла в байтах */
  size: number
  /** MIME-тип файла (audio/mpeg, audio/wav, audio/ogg) */
  mimeType: string
  /** Длительность в секундах */
  duration: number
  /** Расширение файла (mp3, wav, ogg) */
  extension: string
  /** Время загрузки (timestamp) */
  uploadedAt: number
}

// =============================================================================
// Пресеты атмосферы
// =============================================================================

/**
 * Пресеты атмосферы для быстрого выбора настроек
 */
export const ATMOSPHERE_PRESETS = {
  calm: {
    id: 'calm',
    name: 'Спокойствие',
    icon: 'LuMoon',
    description: 'Медленное вращение, тихая музыка, ночной режим',
    settings: {
      spinDuration: 120,
      nightMode: true,
      audioEnabled: true,
      audioTrack: 'meditation-background',
      audioVolume: 30,
      breathingEnabled: false,
      vignetteEnabled: true,
      vignetteIntensity: 40,
      glowEnabled: true,
      glowIntensity: 30,
    },
  },
  energy: {
    id: 'energy',
    name: 'Энергия',
    icon: 'LuZap',
    description: 'Быстрое вращение, динамичные эффекты',
    settings: {
      spinDuration: 15,
      nightMode: false,
      audioEnabled: true,
      audioTrack: 'trance-progressive',
      audioVolume: 60,
      audioSyncEnabled: true,
      beatPulseEnabled: true,
      glowEnabled: true,
      glowIntensity: 70,
      adaptiveSpinEnabled: true,
    },
  },
  meditation: {
    id: 'meditation',
    name: 'Медитация',
    icon: 'LuHeart',
    description: 'Дыхание + таймер + спокойная музыка',
    settings: {
      spinDuration: 60,
      breathingEnabled: true,
      breathingMode: '4-7-8' as const,
      meditationEnabled: true,
      meditationDuration: 10,
      audioEnabled: true,
      audioTrack: 'meditation-music',
      audioVolume: 40,
      vignetteEnabled: true,
      vignetteIntensity: 25,
      nightMode: true,
    },
  },
} as const

export type AtmospherePresetId = keyof typeof ATMOSPHERE_PRESETS
export type AtmospherePreset = (typeof ATMOSPHERE_PRESETS)[AtmospherePresetId]
