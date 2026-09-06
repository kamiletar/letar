/**
 * Извлечение англоязычных названий серий из `Media.streamingEpisodes` AniList.
 *
 * Shikimori вообще не хранит потитульные названия серий (PLAN.md, аудит directoryCid, Блокер 3).
 * AniList — не канонический источник для этого: `streamingEpisodes` — список эпизодов со
 * стриминговых площадок (Crunchyroll/HIDIVE/...), формат заголовка задаёт площадка, не AniList,
 * и не гарантирован. Best-effort: не распарсилось — просто не заполняем название серии,
 * ничего не ломаем.
 */

import type { AniListStreamingEpisode } from './types'

/**
 * `"Episode 12 - Some Title"`, `"Ep. 3: Title"`, `"12 - Title"` → номер + название.
 * Заголовок без явного разделителя и текста после него (просто `"Episode 12"`) не даёт названия.
 */
const EPISODE_TITLE_PATTERN = /^(?:episode|ep\.?)?\s*(\d{1,4})\s*[-:–—]\s*(.+)$/i

/** Разобрать один заголовок `streamingEpisodes[].title` в номер серии + название */
export function parseAniListEpisodeTitle(title: string | null): { number: number; name: string } | null {
  if (!title) {
    return null
  }
  const match = title.trim().match(EPISODE_TITLE_PATTERN)
  if (!match) {
    return null
  }
  const number = parseInt(match[1], 10)
  const name = match[2].trim()
  if (!name) {
    return null
  }
  return { number, name }
}

/**
 * Строит карту «номер серии → английское название» из `streamingEpisodes`.
 *
 * Разные площадки в списке дублируют номера серий — при коллизии оставляем первое найденное
 * название (порядок AniList обычно от основной площадки к второстепенным).
 */
export function buildAniListEpisodeNameMap(
  streamingEpisodes: AniListStreamingEpisode[] | null | undefined,
): Map<number, string> {
  const result = new Map<number, string>()
  if (!streamingEpisodes) {
    return result
  }
  for (const episode of streamingEpisodes) {
    const parsed = parseAniListEpisodeTitle(episode.title)
    if (parsed && !result.has(parsed.number)) {
      result.set(parsed.number, parsed.name)
    }
  }
  return result
}
