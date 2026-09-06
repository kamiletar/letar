/**
 * Сопоставление распознанного имени папки с результатами поиска Shikimori
 */

import type { ShikimoriAnimePreview } from '@/types/electron'

/** Нормализует название для сравнения — регистр, пунктуация, пробелы */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Находит однозначное совпадение имени папки с одним из результатов поиска.
 * Возвращает аниме, только если РОВНО один результат точно совпал по названию (name или
 * russian) — при неоднозначности (0 или несколько совпадений) возвращает null, чтобы не
 * показать постер чужого аниме в папочном режиме без подтверждения пользователя.
 */
export function findConfidentAnimeMatch(
  animeName: string,
  results: ShikimoriAnimePreview[],
): ShikimoriAnimePreview | null {
  const target = normalizeTitle(animeName)
  if (!target) {
    return null
  }

  const matches = results.filter((anime) => {
    const candidates = [anime.name, anime.russian].filter((v): v is string => !!v)
    return candidates.some((candidate) => normalizeTitle(candidate) === target)
  })

  return matches.length === 1 ? matches[0] : null
}
