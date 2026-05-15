import { z } from 'zod/v4'

/**
 * Схема настроек приложения
 */
export const SettingsSchema = z
  .object({
    /** Использовать GPU (NVENC) */
    useGpu: z.boolean().default(true),

    /** Качество видео CQ (15-40) */
    videoQuality: z.number().min(15).max(40).default(24),

    /** Битрейт аудио в kbps */
    audioBitrate: z.number().min(64).max(512).default(192),

    /** Путь к библиотеке */
    libraryPath: z.string().nullable().default(null),

    /** Путь для вывода */
    outputPath: z.string().nullable().default(null),

    /** Автопропуск опенинга */
    skipOpening: z.boolean().default(false),

    /** Автопропуск эндинга */
    skipEnding: z.boolean().default(false),

    /** Автовоспроизведение */
    autoplay: z.boolean().default(true),
  })
  .strip()

export type SettingsFormData = z.infer<typeof SettingsSchema>

/**
 * Дефолтные значения настроек
 */
export const settingsDefaults: SettingsFormData = {
  useGpu: true,
  videoQuality: 24,
  audioBitrate: 192,
  libraryPath: null,
  outputPath: null,
  skipOpening: false,
  skipEnding: false,
  autoplay: true,
}
