/**
 * Метки для enum'ов Animatrona
 *
 * Реэкспорт из generated form-schemas.
 * Используются в Select компонентах для отображения человекочитаемых названий.
 */

// Аниме
export { AnimeStatusLabels as animeStatusLabels } from '@/generated/form-schemas/enums/AnimeStatus.form'
export { SeasonTypeLabels as seasonTypeLabels } from '@/generated/form-schemas/enums/SeasonType.form'

// Кодирование
export { BRefModeLabels as bRefModeLabels } from '@/generated/form-schemas/enums/BRefMode.form'
export { MultipassLabels as multipassLabels } from '@/generated/form-schemas/enums/Multipass.form'
export { RateControlLabels as rateControlLabels } from '@/generated/form-schemas/enums/RateControl.form'
export { TuneLabels as tuneLabels } from '@/generated/form-schemas/enums/Tune.form'
export { VideoCodecLabels as videoCodecLabels } from '@/generated/form-schemas/enums/VideoCodec.form'

// Медиа
export { FileCategoryLabels as fileCategoryLabels } from '@/generated/form-schemas/enums/FileCategory.form'
export { TrackPreferenceLabels as trackPreferenceLabels } from '@/generated/form-schemas/enums/TrackPreference.form'

// Метаданные
export { RelationKindLabels as relationKindLabels } from '@/generated/form-schemas/enums/RelationKind.form'

/**
 * Пресеты кодирования GPU (NVENC p1-p7)
 */
export const presetLabels: Record<string, string> = {
  p1: 'p1 — Быстро',
  p2: 'p2',
  p3: 'p3',
  p4: 'p4 — Баланс',
  p5: 'p5',
  p6: 'p6',
  p7: 'p7 — Качество',
}

/**
 * Пресеты кодирования CPU — SVT-AV1 (числовые)
 * Меньше число = медленнее, но качественнее
 */
export const cpuPresetLabels: Record<string, string> = {
  '10': '10 — Быстро',
  '8': '8 — Баланс',
  '6': '6 — Средне',
  '4': '4 — Качество',
}

/**
 * Пресеты кодирования CPU — libx265/libx264 (именованные)
 */
export const x26xPresetLabels: Record<string, string> = {
  veryfast: 'Быстро',
  faster: 'Баланс',
  medium: 'Средне',
  slow: 'Качество',
}
