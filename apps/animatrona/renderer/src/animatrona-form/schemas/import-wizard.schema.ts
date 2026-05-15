'use client'

import { z } from 'zod/v4'

/**
 * Информация о распознанной папке
 */
export const ParsedFolderInfoSchema = z.object({
  animeName: z.string(),
  seasonNumber: z.number().nullable(),
  subGroup: z.string().nullable(),
  quality: z.string().nullable(),
  source: z.enum(['files', 'folder']),
})

/**
 * Превью аниме из Shikimori
 */
export const ShikimoriAnimePreviewSchema = z.object({
  id: z.number(),
  name: z.string(),
  russian: z.string().nullable(),
  image: z
    .object({
      original: z.string().nullable(),
      preview: z.string().nullable(),
    })
    .nullable(),
  kind: z.string().nullable(),
  score: z.string().nullable(),
  status: z.string().nullable(),
  episodes: z.number().nullable(),
  episodesAired: z.number().nullable(),
  airedOn: z.string().nullable(),
  releasedOn: z.string().nullable(),
})

/**
 * Распознанный файл
 */
export const ParsedFileSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number(),
  episodeNumber: z.number().nullable(),
  selected: z.boolean(),
})

/**
 * Рекомендация для аудиодорожки
 */
export const AudioRecommendationSchema = z.object({
  trackIndex: z.number(),
  action: z.enum(['transcode', 'skip']),
  reason: z.string(),
  enabled: z.boolean(),
})

/**
 * Результат анализа файла
 */
export const FileAnalysisSchema = z.object({
  file: ParsedFileSchema,
  mediaInfo: z.unknown().nullable(), // MediaInfo слишком сложный, используем unknown
  isAnalyzing: z.boolean(),
  error: z.string().nullable(),
  audioRecommendations: z.array(AudioRecommendationSchema),
})

/**
 * Схема визарда импорта
 *
 * Разделена на сегменты по шагам:
 * - folder: выбор папки
 * - anime: поиск в Shikimori
 * - files: сканирование файлов
 * - analysis: анализ и настройки
 */
export const ImportWizardSchema = z
  .object({
    // Шаг 1: Папка
    folder: z.object({
      path: z.string().min(1, 'Выберите папку'),
      parsedInfo: ParsedFolderInfoSchema.nullable(),
    }),

    // Шаг 2: Аниме из Shikimori
    anime: z.object({
      selectedAnime: ShikimoriAnimePreviewSchema.nullable(),
    }),

    // Шаг 3: Файлы
    files: z.object({
      items: z.array(ParsedFileSchema),
    }),

    // Шаг 4: Анализ
    analysis: z.object({
      items: z.array(FileAnalysisSchema),
    }),
  })
  .strip()

export type ImportWizardFormData = z.infer<typeof ImportWizardSchema>

export type ParsedFolderInfo = z.infer<typeof ParsedFolderInfoSchema>
export type ShikimoriAnimePreview = z.infer<typeof ShikimoriAnimePreviewSchema>
export type ParsedFile = z.infer<typeof ParsedFileSchema>
export type AudioRecommendation = z.infer<typeof AudioRecommendationSchema>
export type FileAnalysis = z.infer<typeof FileAnalysisSchema>

/**
 * Дефолтные значения для формы визарда
 */
export const importWizardDefaults: ImportWizardFormData = {
  folder: {
    path: '',
    parsedInfo: null,
  },
  anime: {
    selectedAnime: null,
  },
  files: {
    items: [],
  },
  analysis: {
    items: [],
  },
}
