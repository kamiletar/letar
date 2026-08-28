const UNITS: Record<'en' | 'ru', readonly string[]> = {
  en: ['B', 'KB', 'MB', 'GB', 'TB'],
  ru: ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'],
}

export interface FormatFileSizeOptions {
  /** Единицы измерения: латиница (по умолчанию) или кириллица */
  locale?: 'en' | 'ru'
}

/**
 * Форматирование размера файла в читаемый вид: "1.5 MB", "256 KB", "12 B".
 *
 * @example formatFileSize(1536) // '1.5 KB'
 * @example formatFileSize(1536, { locale: 'ru' }) // '1.5 КБ'
 * @example formatFileSize(0) // '0 B'
 */
export function formatFileSize(bytes: number, options?: FormatFileSizeOptions): string {
  const units = UNITS[options?.locale ?? 'en']

  if (bytes < 1024) {
    return `${bytes} ${units[0]}`
  }

  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`
}
