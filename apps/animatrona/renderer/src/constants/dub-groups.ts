/**
 * Константы для языков и групп озвучки/субтитров
 */

import type { SubtitleType } from '@/components/import/preview/types'

/** Опция языка для выбора */
export interface LanguageOption {
  /** ISO 639-1/2 код языка */
  code: string
  /** Название языка */
  label: string
  /** Флаг (emoji) */
  flag?: string
}

/** Популярные языки аниме-контента */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ja', label: 'Японский', flag: '🇯🇵' },
  { code: 'en', label: 'Английский', flag: '🇬🇧' },
  { code: 'uk', label: 'Украинский', flag: '🇺🇦' },
  { code: 'de', label: 'Немецкий', flag: '🇩🇪' },
  { code: 'fr', label: 'Французский', flag: '🇫🇷' },
  { code: 'es', label: 'Испанский', flag: '🇪🇸' },
  { code: 'it', label: 'Итальянский', flag: '🇮🇹' },
  { code: 'zh', label: 'Китайский', flag: '🇨🇳' },
  { code: 'ko', label: 'Корейский', flag: '🇰🇷' },
  { code: 'pt', label: 'Португальский', flag: '🇵🇹' },
  { code: 'pl', label: 'Польский', flag: '🇵🇱' },
  { code: 'und', label: 'Неизвестный', flag: '🌐' },
]

/**
 * Маппинг ISO 639-2 (3 буквы) → ISO 639-1 (2 буквы)
 * FFprobe возвращает 3-буквенные коды, а селект использует 2-буквенные
 */
const ISO_639_2_TO_1: Record<string, string> = {
  rus: 'ru',
  jpn: 'ja',
  eng: 'en',
  ukr: 'uk',
  ger: 'de',
  deu: 'de',
  fre: 'fr',
  fra: 'fr',
  spa: 'es',
  ita: 'it',
  chi: 'zh',
  zho: 'zh',
  kor: 'ko',
  por: 'pt',
  pol: 'pl',
}

/**
 * Нормализовать код языка в ISO 639-1 (2 буквы)
 * Преобразует 3-буквенные коды (rus, jpn, eng) в 2-буквенные (ru, ja, en)
 *
 * @param code - Код языка (может быть ISO 639-1 или ISO 639-2)
 * @returns ISO 639-1 код или исходный код если маппинг не найден
 */
export function normalizeLanguageCode(code: string | undefined): string | undefined {
  if (!code) {
    return undefined
  }
  const lower = code.toLowerCase()
  return ISO_639_2_TO_1[lower] || lower
}

/** Маппинг кодов языков на опции (включая ISO 639-2 алиасы) */
export const LANGUAGE_MAP: Record<string, LanguageOption> = {
  // ISO 639-1 коды
  ...Object.fromEntries(LANGUAGE_OPTIONS.map((opt) => [opt.code, opt])),
  // ISO 639-2 алиасы → те же опции
  rus: LANGUAGE_OPTIONS[0]!, // ru
  jpn: LANGUAGE_OPTIONS[1]!, // ja
  eng: LANGUAGE_OPTIONS[2]!, // en
  ukr: LANGUAGE_OPTIONS[3]!, // uk
  ger: LANGUAGE_OPTIONS[4]!, // de
  deu: LANGUAGE_OPTIONS[4]!, // de
  fre: LANGUAGE_OPTIONS[5]!, // fr
  fra: LANGUAGE_OPTIONS[5]!, // fr
  spa: LANGUAGE_OPTIONS[6]!, // es
  ita: LANGUAGE_OPTIONS[7]!, // it
  chi: LANGUAGE_OPTIONS[8]!, // zh
  zho: LANGUAGE_OPTIONS[8]!, // zh
  kor: LANGUAGE_OPTIONS[9]!, // ko
  por: LANGUAGE_OPTIONS[10]!, // pt
  pol: LANGUAGE_OPTIONS[11]!, // pl
}

/**
 * Популярные группы озвучки (dub groups)
 * Используются для автозаполнения
 */
export const POPULAR_DUB_GROUPS: string[] = [
  // Российские студии
  'AniDUB',
  'AniLibria',
  'AniStar',
  'AniMaunt',
  'Studio Band',
  'JAM Club',
  'Студийная Банда',
  'Rexus',
  'Sharon',
  'Звук',
  'SHIZA',
  'FanDub',
  // Украинские студии
  'AniUA',
  'Toloka',
  // Субтитры
  'HorribleSubs',
  'Erai-raws',
  'SubsPlease',
  // Старые группы
  'MC Entertainment',
  'Sovetromantika',
]

/**
 * Извлечь название группы из пути к папке
 * Например: "D:/Anime/Rus Sub/AniDUB/" -> "AniDUB"
 *
 * @param folderPath - Полный путь к папке
 * @returns Название последней папки или undefined
 */
export function extractGroupFromPath(folderPath: string | undefined): string | undefined {
  if (!folderPath) {
    return undefined
  }

  // Нормализуем слеши и убираем trailing slash
  const normalized = folderPath.replace(/\\/g, '/').replace(/\/$/, '')
  const parts = normalized.split('/')
  const lastPart = parts[parts.length - 1]

  // Если последняя часть пустая или это имя файла (с расширением), берём предпоследнюю
  if (!lastPart || lastPart.includes('.')) {
    return parts[parts.length - 2] || undefined
  }

  return lastPart
}

/**
 * Создать groupId для группировки дорожек
 *
 * @param isExternal - Внешний файл или встроенный
 * @param source - Путь к папке (для внешних) или streamIndex (для встроенных)
 * @returns groupId в формате "embedded:0" или "external:FolderName"
 */
export function createTrackGroupId(isExternal: boolean, source: string | number): string {
  if (isExternal) {
    const folderName = typeof source === 'string' ? extractGroupFromPath(source) : String(source)
    return `external:${folderName || 'unknown'}`
  }
  return `embedded:${source}`
}

/**
 * Распарсить groupId обратно в компоненты
 *
 * @param groupId - ID группы
 * @returns { type, source }
 */
export function parseTrackGroupId(groupId: string): { type: 'embedded' | 'external'; source: string } {
  const [type, ...rest] = groupId.split(':')
  return {
    type: type as 'embedded' | 'external',
    source: rest.join(':'),
  }
}

/**
 * Отформатировать отображение языка (полное)
 *
 * @param code - Код языка
 * @returns "🇷🇺 Русский" или код если неизвестен
 */
export function formatLanguage(code: string): string {
  const option = LANGUAGE_MAP[code.toLowerCase()]
  if (option) {
    return option.flag ? `${option.flag} ${option.label}` : option.label
  }
  return code.toUpperCase()
}

/**
 * Отформатировать отображение языка (короткое для Badge)
 *
 * @param code - Код языка
 * @returns "🇯🇵 JA" или код если неизвестен
 */
export function formatLanguageShort(code: string): string {
  const option = LANGUAGE_MAP[code.toLowerCase()]
  if (option) {
    // Нормализуем код в ISO 639-1 (2 буквы) для отображения
    const normalized = normalizeLanguageCode(code)?.toUpperCase() || code.toUpperCase()
    return option.flag ? `${option.flag} ${normalized}` : normalized
  }
  return code.toUpperCase()
}

/**
 * Отформатировать название дорожки для плеера
 *
 * @param language - Код языка
 * @param dubGroup - Группа озвучки (опционально)
 * @returns "Русский (AniDUB)" или "Русский"
 */
export function formatTrackName(language: string, dubGroup?: string | null): string {
  const option = LANGUAGE_MAP[language.toLowerCase()]
  const langLabel = option?.label || language.toUpperCase()

  if (dubGroup) {
    return `${langLabel} (${dubGroup})`
  }
  return langLabel
}

/** Опция типа субтитров для UI */
export interface SubtitleTypeOption {
  value: SubtitleType
  label: string
  /** Краткое описание */
  description: string
}

/** Опции типов субтитров для выпадающего списка */
export const SUBTITLE_TYPE_OPTIONS: SubtitleTypeOption[] = [
  { value: 'full', label: 'Полные', description: 'Полный перевод диалогов' },
  { value: 'signs', label: 'Надписи', description: 'Только надписи и вывески' },
  { value: 'songs', label: 'Песни', description: 'Тексты песен (OP/ED/Insert)' },
]

/**
 * Отформатировать тип субтитров для отображения
 *
 * @param type - Тип субтитров
 * @returns "Полные" / "Надписи" / "Песни"
 */
export function formatSubtitleType(type: SubtitleType | undefined): string {
  if (!type || type === 'full') {
    return 'Полные'
  }
  const option = SUBTITLE_TYPE_OPTIONS.find((o) => o.value === type)
  return option?.label || 'Полные'
}
