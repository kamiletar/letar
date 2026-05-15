/**
 * Парсинг имени папки и файлов для автоопределения аниме
 */

/** Результат парсинга имени папки */
export interface ParsedFolderInfo {
  /** Название аниме (очищенное) */
  animeName: string
  /** Номер сезона (если найден) */
  seasonNumber: number | null
  /** Субгруппа (если найдена) */
  subGroup: string | null
  /** Качество (если найдено) */
  quality: string | null
  /** Исходное имя папки */
  original: string
  /** Источник названия: folder или files */
  source: 'folder' | 'files'
  /** Источник — BDRemux/Bluray Remux (lossless) */
  isBdRemux: boolean
  /** URL раздачи на Rutracker (если импортировано оттуда) */
  rutrackerUrl?: string
}

/**
 * Регулярные выражения для парсинга
 */
const PATTERNS = {
  // Субгруппа: [SubGroup], (SubGroup)
  // eslint-disable-next-line no-useless-escape
  subGroup: /^[\[(]([^\])]+)[\])]\s*/,

  // Сезон и эпизод вместе: S02E01, s01e05
  seasonEpisode: /[Ss](\d{1,2})[Ee](\d{1,3})/,

  // Сезон: S01, Season 1, 2nd Season, Season 2, ТВ-3, TV-3
  season: /\b(?:s|season\s*)(\d{1,2})\b|(\d)(?:st|nd|rd|th)\s*season|(?:ТВ|TV)[\s-](\d{1,2})/i,

  // Качество: 1080p, 720p, 4K, HEVC, x264
  quality: /\b((?:1080|720|480|2160|4k)p?|hevc|x264|x265|av1|avc)\b/i,

  // Метаданные в квадратных/круглых скобках
  // eslint-disable-next-line no-useless-escape
  trailingMeta: /\s*[\[(][^\])]*[\])]\s*$/g,

  // Дополнительные метки: BD, BDRip, WEB-DL, etc.
  sourceType: /\b(bd|bdrip|bluray|web-?dl|webrip|dvdrip|hdtv)\b/i,

  // BDRemux/Bluray Remux — lossless исходник с BD
  bdRemux: /\b(?:bd\s*remux|bluray\s*remux|bdremux|blu-?ray\s*remux)\b/i,

  // Номер эпизода: - 01, E01, EP01, Episode 01, #01
  episodeNumber: /(?:[-–—]\s*|[Ee][Pp]?|Episode\s*|#)(\d{1,3})(?:\s|$|\.|\[)/,

  // Расширения видеофайлов
  videoExtension: /\.(mkv|mp4|avi|webm|mov|wmv|flv|m4v)$/i,
}

/**
 * Очищает строку от метаданных и извлекает название аниме
 */
function cleanAnimeName(input: string): {
  name: string
  subGroup: string | null
  season: number | null
  quality: string | null
  isBdRemux: boolean
} {
  let remaining = input
  let subGroup: string | null = null
  let seasonNumber: number | null = null
  let quality: string | null = null

  // 0. Проверяем на BDRemux
  const isBdRemux = PATTERNS.bdRemux.test(input)

  // 1. Извлекаем субгруппу из начала
  const subGroupMatch = remaining.match(PATTERNS.subGroup)
  if (subGroupMatch) {
    subGroup = subGroupMatch[1]
    remaining = remaining.replace(PATTERNS.subGroup, '')
  }

  // 2. Извлекаем качество
  const qualityMatch = remaining.match(PATTERNS.quality)
  if (qualityMatch) {
    quality = qualityMatch[1].toUpperCase()
  }

  // 3. Извлекаем номер сезона (сначала проверяем формат S02E01)
  const seasonEpisodeMatch = remaining.match(PATTERNS.seasonEpisode)
  if (seasonEpisodeMatch) {
    seasonNumber = parseInt(seasonEpisodeMatch[1], 10)
  } else {
    const seasonMatch = remaining.match(PATTERNS.season)
    if (seasonMatch) {
      seasonNumber = parseInt(seasonMatch[1] || seasonMatch[2] || seasonMatch[3], 10)
    }
  }

  // 4. Очищаем название от метаданных
  const name = remaining
    // Убираем метаданные в скобках
    .replace(PATTERNS.trailingMeta, '')
    // Убираем S02E01 формат
    .replace(PATTERNS.seasonEpisode, '')
    // Убираем номер эпизода
    .replace(PATTERNS.episodeNumber, '')
    // Убираем сезон (S01, Season 1, ТВ-3)
    .replace(PATTERNS.season, '')
    // Убираем качество
    .replace(PATTERNS.quality, '')
    // Убираем тип источника
    .replace(PATTERNS.sourceType, '')
    // Убираем BDRemux метку
    .replace(PATTERNS.bdRemux, '')
    // Убираем расширение файла
    .replace(PATTERNS.videoExtension, '')
    // Убираем лишние разделители
    .replace(/[-_]+/g, ' ')
    // Убираем множественные пробелы
    .replace(/\s+/g, ' ')
    // Убираем пробелы в начале/конце
    .trim()

  return { name, subGroup, season: seasonNumber, quality, isBdRemux }
}

/**
 * Парсит имя файла для полнометражного фильма и возвращает ParsedFolderInfo
 */
export function parseFileNameForMovie(fileName: string): ParsedFolderInfo {
  const result = cleanAnimeName(fileName)

  return {
    animeName: result.name || fileName.replace(/\.[^.]+$/, ''),
    seasonNumber: 1, // Фильм — всегда "сезон 1"
    subGroup: result.subGroup,
    quality: result.quality,
    original: fileName,
    source: 'files',
    isBdRemux: result.isBdRemux,
  }
}

/**
 * Парсит имя файла и извлекает название аниме (до номера эпизода)
 */
function parseFileName(fileName: string): string {
  // Убираем расширение
  let name = fileName.replace(PATTERNS.videoExtension, '')

  // Убираем субгруппу в начале
  name = name.replace(PATTERNS.subGroup, '')

  // Убираем все метаданные в скобках
  // eslint-disable-next-line no-useless-escape
  name = name.replace(/[\[(][^\])]*[\])]/g, '')

  // Находим S02E01 формат и обрезаем до него
  const seasonEpisodeMatch = name.match(PATTERNS.seasonEpisode)
  if (seasonEpisodeMatch) {
    const idx = name.indexOf(seasonEpisodeMatch[0])
    if (idx > 0) {
      name = name.substring(0, idx)
    }
  } else {
    // Fallback: находим и убираем номер эпизода и всё после него
    const episodeMatch = name.match(PATTERNS.episodeNumber)
    if (episodeMatch) {
      const idx = name.indexOf(episodeMatch[0])
      if (idx > 0) {
        name = name.substring(0, idx)
      }
    }
  }

  // Очищаем
  return name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Извлекает номер сезона из списка имён файлов
 */
function extractSeasonFromFiles(fileNames: string[]): number | null {
  for (const fileName of fileNames) {
    const match = fileName.match(PATTERNS.seasonEpisode)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  return null
}

/**
 * Находит общее название из списка имён файлов
 */
function extractCommonName(fileNames: string[]): string | null {
  if (fileNames.length === 0) {
    return null
  }

  // Парсим каждый файл
  const parsedNames = fileNames.map(parseFileName).filter((n) => n.length > 2)

  if (parsedNames.length === 0) {
    return null
  }

  // Если только один файл — возвращаем его название
  if (parsedNames.length === 1) {
    return parsedNames[0]
  }

  // Находим самую частую подстроку (общий префикс)
  // Сортируем по длине и берём самый короткий как базу
  const sorted = [...parsedNames].sort((a, b) => a.length - b.length)
  const base = sorted[0]

  // Ищем общий префикс
  let commonPrefix = base
  for (const name of parsedNames) {
    while (commonPrefix.length > 0 && !name.startsWith(commonPrefix)) {
      // Убираем по слову с конца
      const words = commonPrefix.split(' ')
      words.pop()
      commonPrefix = words.join(' ')
    }
  }

  // Если нашли общий префикс длиной > 3 символов
  if (commonPrefix.length > 3) {
    return commonPrefix.trim()
  }

  // Fallback: самое частое название
  const counts = new Map<string, number>()
  for (const name of parsedNames) {
    counts.set(name, (counts.get(name) || 0) + 1)
  }

  let mostCommon = parsedNames[0]
  let maxCount = 0
  for (const [name, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = name
    }
  }

  return mostCommon
}

/**
 * Проверяет наличие BDRemux метки в списке имён файлов
 */
function checkBdRemuxInFiles(fileNames: string[]): boolean {
  return fileNames.some((name) => PATTERNS.bdRemux.test(name))
}

/**
 * Парсит имя папки и извлекает информацию об аниме
 */
export function parseFolderName(folderPath: string, fileNames?: string[]): ParsedFolderInfo {
  // Извлекаем имя папки из пути
  const folderName = folderPath.split(/[/\\]/).pop() || folderPath

  // Сначала пробуем из имени папки
  const folderResult = cleanAnimeName(folderName)

  // Проверяем BDRemux в именах файлов (fallback если папка не содержит метку)
  const bdRemuxInFiles = fileNames ? checkBdRemuxInFiles(fileNames) : false
  const isBdRemux = folderResult.isBdRemux || bdRemuxInFiles

  // Если имя папки информативное (не просто цифры или короткое) — используем его
  const isFolderNameGood =
    folderResult.name.length > 3 && !/^\d+$/.test(folderResult.name) && !/^(season|s)\s*\d+$/i.test(folderResult.name)

  if (isFolderNameGood) {
    return {
      animeName: folderResult.name,
      seasonNumber: folderResult.season,
      subGroup: folderResult.subGroup,
      quality: folderResult.quality,
      original: folderName,
      source: 'folder',
      isBdRemux,
    }
  }

  // Если переданы имена файлов — пробуем извлечь из них
  if (fileNames && fileNames.length > 0) {
    const commonName = extractCommonName(fileNames)
    if (commonName && commonName.length > 3) {
      // Дополнительно очищаем и извлекаем метаданные
      const fileResult = cleanAnimeName(commonName)
      // Извлекаем сезон из S02E01 формата в именах файлов
      const seasonFromFiles = extractSeasonFromFiles(fileNames)
      return {
        animeName: fileResult.name || commonName,
        seasonNumber: seasonFromFiles ?? fileResult.season ?? folderResult.season,
        subGroup: fileResult.subGroup ?? folderResult.subGroup,
        quality: fileResult.quality ?? folderResult.quality,
        original: folderName,
        source: 'files',
        isBdRemux: fileResult.isBdRemux || isBdRemux,
      }
    }
  }

  // Fallback: возвращаем результат из папки
  return {
    animeName: folderResult.name || folderName,
    seasonNumber: folderResult.season,
    subGroup: folderResult.subGroup,
    quality: folderResult.quality,
    original: folderName,
    source: 'folder',
    isBdRemux,
  }
}

/**
 * Генерирует варианты поисковых запросов из распознанного названия
 */
export function generateSearchQueries(info: ParsedFolderInfo): string[] {
  const queries: string[] = []

  // Если есть сезон > 1, сезонные запросы идут первыми (более точный матч)
  if (info.animeName && info.seasonNumber && info.seasonNumber > 1) {
    queries.push(`${info.animeName} ${info.seasonNumber}`)
    queries.push(`${info.animeName} Season ${info.seasonNumber}`)
  }

  // Базовый запрос — очищенное название
  if (info.animeName) {
    queries.push(info.animeName)
  }

  // Исходное имя (без субгруппы) как fallback
  const withoutSubGroup = info.original.replace(PATTERNS.subGroup, '').trim()
  if (withoutSubGroup !== info.animeName && withoutSubGroup.length > 3) {
    queries.push(withoutSubGroup)
  }

  return [...new Set(queries)] // Убираем дубликаты
}
