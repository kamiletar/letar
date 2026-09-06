/**
 * Утилиты для парсинга номеров эпизодов из имён файлов
 */

/** Тип эпизода */
export type EpisodeType = 'regular' | 'ova' | 'special' | 'movie'

/** Результат парсинга номера эпизода с типом */
export interface ParsedEpisodeInfo {
  number: number
  type: EpisodeType
}

/** Паттерн парсинга с типом эпизода */
interface EpisodePattern {
  pattern: RegExp
  type: EpisodeType
  group: number
}

/** Маркеры спешлов — проверяются ДО основных паттернов (высший приоритет) */
const SPECIAL_MARKERS: Array<{ pattern: RegExp; group: number }> = [
  // S03E00SP, S01E05SP — суффикс SP после S##E## номера
  { pattern: /S\d{1,2}E(\d{1,4})SP\b/i, group: 1 },
  // S03E00.Special, S01E00 Special
  { pattern: /S\d{1,2}E(\d{1,4})[\s._-]*Special/i, group: 1 },
  // NCED, NCOP, NCED01, NCOP02 — creditless ED/OP (всегда спешлы)
  { pattern: /\bNC(?:ED|OP)\s*(\d{1,2})?/i, group: 1 },
  // OVA, OAD, ONA без номера → эпизод 1
  // [\s_-]* чтобы "OVA-2" не матчило (дефис перед цифрой = номер в названии)
  { pattern: /\b(?:OVA|OAD|ONA)\b(?![\s_-]*\d)/i, group: 0 },
]

/** Регулярные выражения для парсинга номера эпизода (от специфичных к общим) */
const EPISODE_PATTERNS: EpisodePattern[] = [
  // S01E01, S02E13 — формат сезон+эпизод (приоритет!)
  { pattern: /S\d{1,2}E(\d{1,4})/i, type: 'regular', group: 1 },
  // 01_Name, 01.Name — номер в начале строки (высокий приоритет!)
  // Пример: 01_Phi_Brain_TV_2_[ru_&_jp].mkv → эпизод 1, не 2
  // Negative lookahead: не матчим если за числом идёт " - " (разделитель названия)
  // Пример: "86 - Eighty Six 02.avi" → "86" это название аниме, не номер эпизода
  { pattern: /^(\d{1,4})(?:v\d)?(?!\s+-\s)(?:[-_.\s]|$)/, type: 'regular', group: 1 },
  // ][01][ — формат [SubGroup][Anime][01][Quality]
  { pattern: /\]\[(\d{1,4})\]\[/i, type: 'regular', group: 1 },
  // [01] — формат [01]
  { pattern: /\[(\d{1,4})\]/i, type: 'regular', group: 1 },
  // ][OVA1][, ][SP1][, ][Special1][ — спешлы в склеенных скобках
  { pattern: /\]\[(?:OVA|SP|Special)[\s_-]*(\d{1,2})\]\[/i, type: 'ova', group: 1 },
  // [SP1], [Sp1], [OVA1], [Special1] — спешлы в отдельных скобках
  { pattern: /\[(?:OVA|SP|Special)[\s_-]*(\d{1,2})\]/i, type: 'ova', group: 1 },
  // [Group] Title Season (Year) - 01 [Quality].mkv — fansub формат с явным дефисом
  // Допускает слова END/FINAL/FIN после номера: "- 12 END [1080p]"
  // Важно: этот паттерн должен быть ПЕРЕД общим паттерном, иначе "Title 2 (2025)" матчит "2" как эпизод
  { pattern: /\s-\s(\d{1,4})(?:\s*(?:END|FINAL|FIN))?\s*\[/i, type: 'regular', group: 1 },
  // [Group] Title Season - 01 (Year) [Quality].mkv — год ПОСЛЕ номера эпизода
  // Пример: [SubsPlus+] Yofukashi no Uta 2 - 01 (2025) [WEB-DL 1080p x264 AAC].mkv
  { pattern: /\s-\s(\d{1,4})(?:\s*(?:END|FINAL|FIN))?\s*\(\d{4}\)/i, type: 'regular', group: 1 },
  // Episode 01, Ep01, Ep.01
  { pattern: /(?:ep|episode)[-_.\s]*(\d{1,4})/i, type: 'regular', group: 1 },
  // [SubGroup] Anime Name - 01 [1080p].mkv или Anime 01 (720p).mkv
  // Negative lookahead для года: не матчит "2 (2025)" но матчит "01 (720p)"
  { pattern: /[-_\s](\d{1,4})[-_\s]*(?:\[|\((?!\d{4}\))|\.)/i, type: 'regular', group: 1 },
  // Name_01, Name-01 — номер в конце после _ или - (перед расширением)
  { pattern: /[-_](\d{1,4})$/i, type: 'regular', group: 1 },
  // E01 (без S перед ним)
  { pattern: /(?<!S\d{0,2})E(\d{1,4})/i, type: 'regular', group: 1 },
  // OVA 01, OVA01, SP 01, Special 01 — спешлы без скобок
  { pattern: /(?:OVA|SP|Special)[\s_-]*(\d{1,2})/i, type: 'ova', group: 1 },
  // Anime Name 01.mkv (номер в конце строки, НЕ перед годом в скобках)
  { pattern: /\s(\d{1,4})(?=\s*$)/, type: 'regular', group: 1 },
]

/**
 * Извлекает номер и тип эпизода из имени файла
 * @param filename - Имя файла (может быть с расширением)
 * @returns Объект с номером и типом эпизода или null
 */
export function parseEpisodeInfo(filename: string): ParsedEpisodeInfo | null {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

  // Раннее определение спешлов (высший приоритет — перехватывает S03E00SP и т.д.)
  for (const { pattern, group } of SPECIAL_MARKERS) {
    const match = nameWithoutExt.match(pattern)
    if (match) {
      const num = group > 0 && match[group] ? parseInt(match[group], 10) : 1
      return { number: num, type: 'ova' }
    }
  }

  // Основной цикл паттернов
  for (const { pattern, type, group } of EPISODE_PATTERNS) {
    const match = nameWithoutExt.match(pattern)
    if (match && match[group]) {
      const num = parseInt(match[group], 10)
      // Валидный номер эпизода (0-9999, включая нулевой эпизод/пролог)
      if (num >= 0 && num < 10000) {
        return { number: num, type }
      }
    }
  }

  return null
}

/**
 * Извлекает только номер эпизода из имени файла (упрощённая версия)
 * @param filename - Имя файла (может быть с расширением)
 * @returns Номер эпизода или null
 */
export function parseEpisodeNumber(filename: string): number | null {
  const result = parseEpisodeInfo(filename)
  return result?.number ?? null
}
