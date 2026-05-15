import { z } from 'zod/v4'
import type { NamingPattern, SeasonType } from '../../../../shared/types/export'

/**
 * Паттерны именования файлов (legacy)
 */
export const LEGACY_NAMING_PATTERNS: { value: NamingPattern; label: string }[] = [
  { value: '[{Anime}] - S{ss}E{nn} - {Episode}', label: '[Anime] - S01E01 - Episode' },
  { value: '{Anime} - {nn}', label: 'Anime - 01' },
  { value: 'S{ss}E{nn} - {Episode}', label: 'S01E01 - Episode' },
  { value: '{Anime} - S{ss}E{nn}', label: 'Anime - S01E01' },
]

/**
 * Новые паттерны с годом в начале (для группировки на мобильных)
 */
export const YEAR_FIRST_PATTERNS: { value: NamingPattern; label: string; forTypes: SeasonType[] }[] = [
  {
    value: '{Year} - {Anime} - S{ss}E{nn}',
    label: '2024 - Anime - S01E01',
    forTypes: ['TV', 'ONA'],
  },
  {
    value: '{Year} - {Anime}',
    label: '2024 - Anime (для фильмов)',
    forTypes: ['MOVIE'],
  },
  {
    value: '{Year} - {Anime} - OVA{nn}',
    label: '2024 - Anime - OVA01',
    forTypes: ['OVA'],
  },
  {
    value: '{Year} - {Anime} - SP{nn}',
    label: '2024 - Anime - SP01',
    forTypes: ['SPECIAL'],
  },
]

/**
 * Все паттерны (legacy + новые)
 */
export const NAMING_PATTERNS: { value: NamingPattern; label: string }[] = [
  // Новые паттерны (год в начале) — приоритетные
  ...YEAR_FIRST_PATTERNS,
  // Legacy паттерны
  ...LEGACY_NAMING_PATTERNS,
]

/**
 * Получить рекомендованный паттерн по типу контента
 */
export function getRecommendedPattern(seasonType: SeasonType): NamingPattern {
  const pattern = YEAR_FIRST_PATTERNS.find((p) => p.forTypes.includes(seasonType))
  return pattern?.value ?? '{Year} - {Anime} - S{ss}E{nn}'
}

/**
 * Схема для диалога экспорта сериала
 */
export const ExportSeriesSchema = z
  .object({
    /** Выбранные ключи аудиодорожек (language:title) */
    selectedAudioKeys: z.array(z.string()).min(1, 'Выберите хотя бы одну аудиодорожку'),

    /** Выбранные ключи субтитров (language:title) */
    selectedSubtitleKeys: z.array(z.string()),

    /** Путь к папке назначения */
    outputDir: z.string().min(1, 'Выберите папку для экспорта'),

    /** Паттерн именования файлов */
    namingPattern: z.enum([
      // Legacy patterns
      '[{Anime}] - S{ss}E{nn} - {Episode}',
      '{Anime} - {nn}',
      'S{ss}E{nn} - {Episode}',
      '{Anime} - S{ss}E{nn}',
      // New patterns (год в начале)
      '{Year} - {Anime} - S{ss}E{nn}',
      '{Year} - {Anime}',
      '{Year} - {Anime} - OVA{nn}',
      '{Year} - {Anime} - SP{nn}',
    ] as const),

    /** Создавать структуру папок (franchise/year-name) */
    createFolderStructure: z.boolean().default(true),

    /** Открыть папку после экспорта */
    openFolderAfterExport: z.boolean().default(true),
  })
  .strip()

export type ExportSeriesFormData = z.infer<typeof ExportSeriesSchema>

/**
 * Дефолтные значения для экспорта
 */
export const exportSeriesDefaults: ExportSeriesFormData = {
  selectedAudioKeys: [],
  selectedSubtitleKeys: [],
  outputDir: '',
  namingPattern: '{Year} - {Anime} - S{ss}E{nn}',
  createFolderStructure: true,
  openFolderAfterExport: true,
}
