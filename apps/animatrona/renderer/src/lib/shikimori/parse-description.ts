/**
 * Парсер описаний аниме с Shikimori
 *
 * Форматы тегов:
 * - [character=178715 дзимпати-эго] → текст персонажа
 * - [anime=12345 Name] → ссылка на аниме
 * - [manga=12345 Name] → текст манги
 * - [person=12345 Name] → текст человека
 * - [spoiler] ... [/spoiler] → скрытый текст
 * - [b]...[/b] → жирный текст
 * - [i]...[/i] → курсив
 * - [url=http://...]текст[/url] → ссылка
 */

/** Тип сегмента описания */
export type DescriptionSegment =
  | { type: 'text'; content: string }
  | { type: 'character'; id: number; name: string }
  | { type: 'anime'; id: number; name: string }
  | { type: 'manga'; id: number; name: string }
  | { type: 'person'; id: number; name: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'spoiler'; content: string }
  | { type: 'link'; url: string; text: string }

/** Регулярные выражения для тегов */
const TAG_PATTERNS = {
  // [character=178715 дзимпати-эго] — старый формат
  character: /\[character=(\d+)\s+([^\]]+)\]/g,
  // [character=181418]Аканэ[/character] — новый формат с закрывающим тегом
  characterWithClosingTag: /\[character=(\d+)\]([^[]+)\[\/character\]/g,
  // [anime=12345 Name]
  anime: /\[anime=(\d+)\s+([^\]]+)\]/g,
  // [anime=12345]Name[/anime] — с закрывающим тегом
  animeWithClosingTag: /\[anime=(\d+)\]([^[]+)\[\/anime\]/g,
  // [manga=12345 Name]
  manga: /\[manga=(\d+)\s+([^\]]+)\]/g,
  // [manga=12345]Name[/manga] — с закрывающим тегом
  mangaWithClosingTag: /\[manga=(\d+)\]([^[]+)\[\/manga\]/g,
  // [person=12345 Name]
  person: /\[person=(\d+)\s+([^\]]+)\]/g,
  // [person=12345]Name[/person] — с закрывающим тегом
  personWithClosingTag: /\[person=(\d+)\]([^[]+)\[\/person\]/g,
  // [b]...[/b]
  bold: /\[b\]([^[]*)\[\/b\]/g,
  // [i]...[/i]
  italic: /\[i\]([^[]*)\[\/i\]/g,
  // [spoiler]...[/spoiler]
  spoiler: /\[spoiler\]([^[]*)\[\/spoiler\]/gi,
  // [url=http://...]текст[/url]
  link: /\[url=([^\]]+)\]([^[]*)\[\/url\]/g,
}

/**
 * Парсит описание аниме и возвращает массив сегментов
 */
export function parseDescription(text: string): DescriptionSegment[] {
  if (!text) {
    return []
  }

  const segments: DescriptionSegment[] = []

  // Собираем все совпадения с их позициями
  interface Match {
    index: number
    length: number
    segment: DescriptionSegment
  }

  const matches: Match[] = []

  // Ищем все типы тегов
  for (const [type, pattern] of Object.entries(TAG_PATTERNS)) {
    let match
    const regex = new RegExp(pattern.source, pattern.flags)

    while ((match = regex.exec(text)) !== null) {
      let segment: DescriptionSegment

      switch (type) {
        case 'character':
        case 'characterWithClosingTag':
          segment = { type: 'character', id: parseInt(match[1], 10), name: match[2] }
          break
        case 'anime':
        case 'animeWithClosingTag':
          segment = { type: 'anime', id: parseInt(match[1], 10), name: match[2] }
          break
        case 'manga':
        case 'mangaWithClosingTag':
          segment = { type: 'manga', id: parseInt(match[1], 10), name: match[2] }
          break
        case 'person':
        case 'personWithClosingTag':
          segment = { type: 'person', id: parseInt(match[1], 10), name: match[2] }
          break
        case 'bold':
          segment = { type: 'bold', content: match[1] }
          break
        case 'italic':
          segment = { type: 'italic', content: match[1] }
          break
        case 'spoiler':
          segment = { type: 'spoiler', content: match[1] }
          break
        case 'link':
          segment = { type: 'link', url: match[1], text: match[2] }
          break
        default:
          continue
      }

      matches.push({
        index: match.index,
        length: match[0].length,
        segment,
      })
    }
  }

  // Сортируем по позиции
  matches.sort((a, b) => a.index - b.index)

  // Собираем сегменты, вставляя текст между тегами
  let lastIndex = 0

  for (const match of matches) {
    // Добавляем текст перед тегом
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index)
      if (textContent) {
        segments.push({ type: 'text', content: textContent })
      }
    }

    // Добавляем сегмент тега
    segments.push(match.segment)
    lastIndex = match.index + match.length
  }

  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex)
    if (textContent) {
      segments.push({ type: 'text', content: textContent })
    }
  }

  // Если тегов не было, возвращаем весь текст как один сегмент
  if (segments.length === 0 && text) {
    segments.push({ type: 'text', content: text })
  }

  return segments
}

/**
 * Извлекает все Shikimori anime IDs из описания
 * Используется для проверки локальной библиотеки перед рендерингом
 */
export function extractAnimeIdsFromDescription(text: string): number[] {
  if (!text) {
    return []
  }

  const ids = new Set<number>()

  // Старый формат: [anime=12345 Name]
  const regex1 = new RegExp(TAG_PATTERNS.anime.source, TAG_PATTERNS.anime.flags)
  let match
  while ((match = regex1.exec(text)) !== null) {
    ids.add(parseInt(match[1], 10))
  }

  // Новый формат: [anime=12345]Name[/anime]
  const regex2 = new RegExp(TAG_PATTERNS.animeWithClosingTag.source, TAG_PATTERNS.animeWithClosingTag.flags)
  while ((match = regex2.exec(text)) !== null) {
    ids.add(parseInt(match[1], 10))
  }

  return Array.from(ids)
}

/**
 * Конвертирует описание в простой текст (без тегов)
 */
export function descriptionToPlainText(text: string): string {
  if (!text) {
    return ''
  }

  let result = text

  // Заменяем теги на их текстовое содержимое
  // Оба формата: [tag=ID name] и [tag=ID]name[/tag]
  result = result.replace(TAG_PATTERNS.character, '$2')
  result = result.replace(TAG_PATTERNS.characterWithClosingTag, '$2')
  result = result.replace(TAG_PATTERNS.anime, '$2')
  result = result.replace(TAG_PATTERNS.animeWithClosingTag, '$2')
  result = result.replace(TAG_PATTERNS.manga, '$2')
  result = result.replace(TAG_PATTERNS.mangaWithClosingTag, '$2')
  result = result.replace(TAG_PATTERNS.person, '$2')
  result = result.replace(TAG_PATTERNS.personWithClosingTag, '$2')
  result = result.replace(TAG_PATTERNS.bold, '$1')
  result = result.replace(TAG_PATTERNS.italic, '$1')
  result = result.replace(TAG_PATTERNS.spoiler, '[спойлер]')
  result = result.replace(TAG_PATTERNS.link, '$2')

  return result
}
