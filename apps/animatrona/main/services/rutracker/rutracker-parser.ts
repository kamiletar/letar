/**
 * Парсер страниц раздач Рутрекера
 *
 * Извлекает метаданные аниме-раздачи из HTML: заголовок, поля поста,
 * MediaInfo, ссылки, магнет и постер.
 */

import * as cheerio from 'cheerio'
import type {
  RutrackerAudioTrack,
  RutrackerDubGroup,
  RutrackerExternalLinks,
  RutrackerMediaInfo,
  RutrackerTorrentInfo,
} from './types'

/**
 * Парсит HTML страницы раздачи Рутрекера
 *
 * @param html HTML-строка страницы
 * @param url URL страницы (для извлечения topicId)
 */
export function parseRutrackerPage(html: string, url: string): RutrackerTorrentInfo {
  const $ = cheerio.load(html)
  const topicId = extractTopicId(url, $)
  const titleText = $('h1.maintitle a#topic-title').text().trim()
  const postBody = $('div.post_body').first()

  const fields = parsePostFields($, postBody)
  const titleParsed = parseTitle(titleText)
  const externalLinks = parseExternalLinks($, postBody)
  const dubGroups = parseDubGroups(fields)
  const mediaInfo = parseMediaInfo($, postBody)
  const magnetLink = $('a.magnet-link').attr('href') ?? ''
  const posterUrl = extractPosterUrl($, postBody)
  const sizeText = extractSizeText($)
  const fileList = extractFileList($, postBody)

  return {
    url,
    topicId,

    nameRu: titleParsed.nameRu,
    nameOriginal: titleParsed.nameOriginal,
    type: titleParsed.type ?? fields['Тип'] ?? undefined,
    episodeInfo: titleParsed.episodeInfo ?? fields['Серии'] ?? undefined,
    episodeCount: titleParsed.episodeCount ?? parseEpisodeCount(fields['Серии']),
    languages: titleParsed.languages,
    year: titleParsed.year ?? parseYear(fields['Год']),
    genres: parseGenres(fields['Жанр']),
    sourceType: titleParsed.sourceType ?? fields['Тип рипа'] ?? undefined,
    resolution: titleParsed.resolution ?? undefined,

    country: fields['Страна'] ?? undefined,
    duration: fields['Продолжительность'] ?? undefined,
    director: fields['Режиссёр'] ?? fields['Режиссер'] ?? undefined,
    studio: fields['Студия'] ?? undefined,
    description: fields['Описание'] ?? undefined,
    quality: fields['Качество'] ?? fields['Качество видео'] ?? undefined,
    releaseGroup: fields['Релиз'] ?? fields['Релиз группа'] ?? undefined,
    releaseType: fields['Тип релиза'] ?? undefined,

    dubGroups,
    mediaInfo,
    externalLinks,

    magnetLink,
    posterUrl,
    sizeText,
    fileList,
  }
}

/** Извлекает topicId из URL или data-атрибутов */
function extractTopicId(url: string, $: cheerio.CheerioAPI): number {
  const match = url.match(/[?&]t=(\d+)/)
  if (match) {
    return Number(match[1])
  }

  // Фоллбэк: из data-topic_id магнет-ссылки
  const topicIdAttr = $('a.magnet-link').attr('data-topic_id')
  if (topicIdAttr) {
    return Number(topicIdAttr)
  }

  return 0
}

/**
 * Парсит заголовок аниме-раздачи
 *
 * Типичные форматы:
 * "Тетрадь Смерти / Death Note [TV] [37 из 37] [RUS(ext), JAP+Sub] [2006, психологический триллер, BDRip] [1080p]"
 * "Эрго Прокси / Ergo Proxy [TV] [23 из 23] [RUS, JAP+Sub] [2006, научная фантастика, BDRip] [1080p]"
 * "Название / Original Name (Season) [тип] [эпизоды] [языки] [год, жанры, источник] [разрешение]"
 */
export function parseTitle(title: string): {
  nameRu: string
  nameOriginal: string
  type?: string
  episodeInfo?: string
  episodeCount?: number
  languages: string[]
  year?: number
  genres: string[]
  sourceType?: string
  resolution?: string
} {
  // Убираем <wbr> если остались
  const cleaned = title.replace(/<wbr\s*\/?>/gi, '')

  // Пытаемся разобрать стандартный формат аниме
  // Название / Original [Тип] [Эпизоды] [Языки] [Год, жанры, источник] [Разрешение]
  const bracketGroups = extractBracketGroups(cleaned)
  const namesPart = cleaned.split('[')[0].trim()

  // Парсим названия (разделены " / ")
  const names = namesPart
    .split(/\s*\/\s*/)
    .map((n) => n.trim())
    .filter(Boolean)
  const nameRu = names[0] ?? title
  const nameOriginal = names[1] ?? names[0] ?? title

  // Парсим группы в скобках
  let type: string | undefined
  let episodeInfo: string | undefined
  let episodeCount: number | undefined
  let languages: string[] = []
  let year: number | undefined
  const genres: string[] = []
  let sourceType: string | undefined
  let resolution: string | undefined

  for (const group of bracketGroups) {
    const trimmed = group.trim()

    // Разрешение: "1080p", "720p", "2160p"
    if (/^\d{3,4}p$/i.test(trimmed)) {
      resolution = trimmed
      continue
    }

    // Тип: "TV", "TV+Special", "Movie", "OVA", "ONA", "Special"
    if (/^(TV|Movie|OVA|ONA|Special|Спешл|TV\+\w+)$/i.test(trimmed)) {
      type = trimmed
      continue
    }

    // Эпизоды: "37 из 37", "13+1 из 13+1", "01-12 из 12"
    if (/\d+.*из.*\d+/i.test(trimmed) || /\d+\s*эп/i.test(trimmed)) {
      episodeInfo = trimmed
      episodeCount = parseEpisodeCount(trimmed)
      continue
    }

    // Языки: содержит RUS, JAP, ENG, Sub
    if (/\b(RUS|JAP|ENG|Sub|MULTi|Dub)\b/i.test(trimmed) && !trimmed.includes(',')) {
      languages = trimmed
        .split(/[,+]/)
        .map((l) => l.trim())
        .filter(Boolean)
      continue
    }
    if (/^[A-Z]{2,3}(\([^)]*\))?(\s*[,+]\s*[A-Z]{2,3}(\([^)]*\))?\s*(\+\s*Sub)?)*$/i.test(trimmed)) {
      languages = trimmed
        .split(/[,]/)
        .map((l) => l.trim())
        .filter(Boolean)
      continue
    }

    // Год + жанры + источник: "2006, психологический триллер, мистика, BDRip"
    if (/\b(19|20)\d{2}\b/.test(trimmed)) {
      const parts = trimmed.split(/,\s*/)
      for (const part of parts) {
        const yearMatch = part.match(/^((?:19|20)\d{2})$/)
        if (yearMatch) {
          year = Number(yearMatch[1])
        } else if (/Rip|DL|HDTV|BDRemux|WEB/i.test(part)) {
          sourceType = part.trim()
        } else {
          genres.push(part.trim())
        }
      }
      continue
    }
  }

  return {
    nameRu,
    nameOriginal,
    type,
    episodeInfo,
    episodeCount,
    languages,
    year,
    genres,
    sourceType,
    resolution,
  }
}

/** Извлекает содержимое квадратных скобок из строки */
function extractBracketGroups(text: string): string[] {
  const groups: string[] = []
  const regex = /\[([^\]]+)\]/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    groups.push(match[1])
  }
  return groups
}

/**
 * Парсит поля из тела поста
 * Формат: <span class="post-b">Label</span>: Value<br>
 */
export function parsePostFields(
  $: cheerio.CheerioAPI,
  postBody: cheerio.Cheerio<cheerio.Element>
): Record<string, string> {
  const fields: Record<string, string> = {}

  postBody.find('span.post-b').each((_i, el) => {
    const label = $(el).text().trim().replace(/:$/, '')
    if (!label) {
      return
    }

    // Извлекаем значение — весь текст после span.post-b до следующего <br> или span.post-b
    const nextNodes: string[] = []
    let node = el.nextSibling
    while (node) {
      if (node.type === 'tag') {
        const tagName = (node as cheerio.Element).tagName?.toLowerCase()
        // Остановка на <br> или следующем span.post-b
        if (tagName === 'br') {
          break
        }
        if (tagName === 'span' && $(node).hasClass('post-b')) {
          break
        }
        if (tagName === 'span' && $(node).hasClass('post-br')) {
          break
        }
        // Для ссылок и курсива — берём текст
        nextNodes.push($(node).text().trim())
      } else if (node.type === 'text') {
        const text = (node as unknown as { data: string }).data?.trim()
        if (text) {
          // Убираем начальные ": " или " — "
          nextNodes.push(text.replace(/^[:\s—–-]+/, '').trim())
        }
      }
      node = node.nextSibling
    }

    const value = nextNodes.filter(Boolean).join(' ').trim()
    if (value) {
      fields[label] = value
    }
  })

  return fields
}

/** Парсит внешние ссылки (Shikimori, MAL, AniDB и т.д.) */
function parseExternalLinks($: cheerio.CheerioAPI, postBody: cheerio.Cheerio<cheerio.Element>): RutrackerExternalLinks {
  const links: RutrackerExternalLinks = {}

  postBody.find('a.postLink, a.p-ext-link, a[href]').each((_i, el) => {
    const href = $(el).attr('href') ?? ''

    if (href.includes('shikimori.one') || href.includes('shikimori.me')) {
      links.shikimoriUrl = href
      const idMatch = href.match(/\/animes\/(?:z)?(\d+)/)
      if (idMatch) {
        links.shikimoriId = Number(idMatch[1])
      }
    } else if (href.includes('myanimelist.net')) {
      links.malUrl = href
      const idMatch = href.match(/\/anime\/(\d+)/)
      if (idMatch) {
        links.malId = Number(idMatch[1])
      }
    } else if (href.includes('anidb.net')) {
      links.anidbUrl = href
    } else if (href.includes('world-art.ru') || href.includes('worldart.ru')) {
      links.worldArtUrl = href
    }
  })

  return links
}

/** Парсит группы озвучки из полей поста */
function parseDubGroups(fields: Record<string, string>): RutrackerDubGroup[] {
  const groups: RutrackerDubGroup[] = []

  // Ищем поля "Озвучивание", "Озвучка", "Дублирование"
  const dubField = fields['Озвучивание'] ?? fields['Озвучка'] ?? fields['Озвучение'] ?? fields['Дубляж']
  if (dubField) {
    const items = dubField
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const item of items) {
      groups.push(parseSingleDubGroup(item, 'dub'))
    }
  }

  // Субтитры
  const subField = fields['Субтитры'] ?? fields['Субтитры (внешние)']
  if (subField) {
    const items = subField
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const item of items) {
      groups.push(parseSingleDubGroup(item, 'sub'))
    }
  }

  return groups
}

/** Парсит отдельную группу озвучки/субтитров */
function parseSingleDubGroup(raw: string, defaultType: 'dub' | 'sub'): RutrackerDubGroup {
  const isExternal = /\b(ext|внеш)\b/i.test(raw)
  const detailsMatch = raw.match(/\[([^\]]+)\]/)
  const name = raw.replace(/\s*\[[^\]]*\]\s*/g, '').trim()

  // Определяем язык
  let language = 'RUS'
  if (/\b(JAP|JPN|JP)\b/i.test(raw)) {
    language = 'JAP'
  } else if (/\b(ENG|EN)\b/i.test(raw)) {
    language = 'ENG'
  }

  return {
    name,
    type: defaultType,
    language,
    isExternal,
    details: detailsMatch?.[1],
  }
}

/** Парсит MediaInfo из спойлера */
export function parseMediaInfo(
  $: cheerio.CheerioAPI,
  postBody: cheerio.Cheerio<cheerio.Element>
): RutrackerMediaInfo | undefined {
  // Ищем спойлер с заголовком "MediaInfo" или "Mediainfo"
  let mediaInfoText = ''

  postBody.find('div.sp-wrap').each((_i, el) => {
    const header = $(el).find('div.sp-head span').text().trim()
    if (/mediainf/i.test(header)) {
      mediaInfoText = $(el).find('div.sp-body pre').text().trim()
      if (!mediaInfoText) {
        mediaInfoText = $(el).find('div.sp-body').text().trim()
      }
    }
  })

  // Фоллбэк: ищем <pre class="post-pre"> с MediaInfo-подобным содержимым
  if (!mediaInfoText) {
    postBody.find('pre.post-pre').each((_i, el) => {
      const text = $(el).text()
      if (/\bFormat\b.*\bCodec\b|\bVideo\b.*\bWidth\b|\bGeneral\b/i.test(text)) {
        mediaInfoText = text.trim()
      }
    })
  }

  if (!mediaInfoText) {
    return undefined
  }

  return parseMediaInfoText(mediaInfoText)
}

/** Парсит текст MediaInfo в структуру */
export function parseMediaInfoText(text: string): RutrackerMediaInfo | undefined {
  // Разбиваем на секции (Video, Audio #1, Audio #2, ...)
  const sections = text.split(/\n(?=(?:Video|Audio|General|Text|Menu)\b)/i)

  let videoCodec = ''
  let bitDepth = 8
  let width = 0
  let height = 0
  let fps = 0
  let videoBitrate = 0
  const audioTracks: RutrackerAudioTrack[] = []

  for (const section of sections) {
    const lines = section
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const sectionType = lines[0]
      ?.replace(/[:#\s]*\d*$/, '')
      .trim()
      .toLowerCase()

    if (sectionType === 'video') {
      for (const line of lines) {
        const [key, ...vals] = line.split(':')
        const value = vals.join(':').trim()

        if (/^Format$/i.test(key.trim())) {
          videoCodec = normalizeVideoCodec(value)
        } else if (/Bit depth/i.test(key)) {
          const m = value.match(/(\d+)\s*bit/i)
          if (m) {
            bitDepth = Number(m[1])
          } else {
            const n = Number.parseInt(value)
            if (n > 0) {
              bitDepth = n
            }
          }
        } else if (/^Width$/i.test(key.trim())) {
          width = parseMediaInfoNumber(value)
        } else if (/^Height$/i.test(key.trim())) {
          height = parseMediaInfoNumber(value)
        } else if (/Frame rate$/i.test(key.trim()) && !key.includes('mode')) {
          const m = value.match(/([\d.]+)\s*(?:fps|FPS)/)
          if (m) {
            fps = Number.parseFloat(m[1])
          }
        } else if (/Bit rate$/i.test(key.trim()) && !key.includes('mode')) {
          videoBitrate = parseBitrate(value)
        }
      }
    } else if (sectionType?.startsWith('audio')) {
      const track = parseAudioSection(lines)
      if (track) {
        audioTracks.push(track)
      }
    }
  }

  if (!width && !height && !videoCodec) {
    return undefined
  }

  return { videoCodec, bitDepth, width, height, fps, videoBitrate, audioTracks }
}

/** Парсит секцию Audio из MediaInfo */
function parseAudioSection(lines: string[]): RutrackerAudioTrack | null {
  let codec = ''
  let channels = ''
  let language = ''
  let bitrate = 0

  for (const line of lines) {
    const [key, ...vals] = line.split(':')
    const value = vals.join(':').trim()

    if (/^Format$/i.test(key.trim())) {
      codec = normalizeAudioCodec(value)
    } else if (/Channel/i.test(key)) {
      channels = normalizeChannels(value)
    } else if (/Language/i.test(key)) {
      language = value.trim()
    } else if (/Bit rate$/i.test(key.trim()) && !key.includes('mode')) {
      bitrate = parseBitrate(value)
    }
  }

  if (!codec) {
    return null
  }
  return { codec, channels, language, bitrate }
}

/** Нормализует название видеокодека */
function normalizeVideoCodec(raw: string): string {
  const lower = raw.toLowerCase().trim()
  if (lower.includes('avc') || lower.includes('h.264') || lower.includes('x264')) {
    return 'x264'
  }
  if (lower.includes('hevc') || lower.includes('h.265') || lower.includes('x265')) {
    return 'HEVC'
  }
  if (lower.includes('av1') || lower.includes('av01')) {
    return 'AV1'
  }
  if (lower.includes('vp9')) {
    return 'VP9'
  }
  return raw.trim()
}

/** Нормализует название аудиокодека */
function normalizeAudioCodec(raw: string): string {
  const lower = raw.toLowerCase().trim()
  if (lower.includes('flac')) {
    return 'FLAC'
  }
  if (lower.includes('aac')) {
    return 'AAC'
  }
  if (lower.includes('opus')) {
    return 'Opus'
  }
  if (lower.includes('ac-3') || lower.includes('ac3') || lower.includes('a_ac3')) {
    return 'AC3'
  }
  if (lower.includes('dts')) {
    return 'DTS'
  }
  if (lower.includes('vorbis')) {
    return 'Vorbis'
  }
  if (lower.includes('pcm') || lower.includes('lpcm')) {
    return 'PCM'
  }
  if (lower.includes('mp3') || lower.includes('mpeg audio')) {
    return 'MP3'
  }
  return raw.trim()
}

/** Нормализует каналы ("6 channels" → "5.1", "2 channels" → "2.0") */
function normalizeChannels(raw: string): string {
  const match = raw.match(/(\d+)\s*channel/i)
  if (match) {
    const ch = Number(match[1])
    if (ch === 1) {
      return '1.0'
    }
    if (ch === 2) {
      return '2.0'
    }
    if (ch === 6) {
      return '5.1'
    }
    if (ch === 8) {
      return '7.1'
    }
    return `${ch}.0`
  }
  // Уже в формате X.Y
  const dotMatch = raw.match(/(\d+\.\d+)/)
  if (dotMatch) {
    return dotMatch[1]
  }
  return raw.trim()
}

/** Парсит числа из MediaInfo (убирает пробелы между цифрами: "1 920" → 1920) */
function parseMediaInfoNumber(value: string): number {
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/pixels/i, '')
    .replace(/,/g, '')
  return Number.parseInt(cleaned) || 0
}

/** Парсит битрейт из MediaInfo ("6 500 kb/s" → 6500, "1.5 Mb/s" → 1500) */
function parseBitrate(value: string): number {
  const mbMatch = value.match(/([\d\s,.]+)\s*Mb\/s/i)
  if (mbMatch) {
    const num = Number.parseFloat(mbMatch[1].replace(/\s/g, '').replace(',', '.'))
    return Math.round(num * 1000)
  }
  const kbMatch = value.match(/([\d\s,.]+)\s*kb\/s/i)
  if (kbMatch) {
    return Number.parseInt(kbMatch[1].replace(/\s/g, '').replace(',', '')) || 0
  }
  return 0
}

/** Извлекает URL постера */
function extractPosterUrl($: cheerio.CheerioAPI, postBody: cheerio.Cheerio<cheerio.Element>): string | undefined {
  // Вариант 1: <img class="postImg">
  const img = postBody.find('img.postImg').first()
  if (img.length) {
    return img.attr('src')
  }

  // Вариант 2: <var class="postImg" title="URL">
  const varImg = postBody.find('var.postImg').first()
  if (varImg.length) {
    return varImg.attr('title')
  }

  return undefined
}

/** Извлекает текст размера раздачи */
function extractSizeText($: cheerio.CheerioAPI): string | undefined {
  const items = $('fieldset.attach ul.inlined li')
  const last = items.last()
  if (last.length) {
    const text = last.text().replace(/·/g, '').trim()
    if (/\d+.*[KMGT]?B/i.test(text)) {
      return text
    }
  }
  return undefined
}

/** Извлекает список файлов из спойлера */
function extractFileList($: cheerio.CheerioAPI, postBody: cheerio.Cheerio<cheerio.Element>): string[] | undefined {
  let fileListText = ''

  postBody.find('div.sp-wrap').each((_i, el) => {
    const header = $(el).find('div.sp-head span').text().trim()
    if (/файл|file list|содержимое/i.test(header)) {
      fileListText = $(el).find('div.sp-body').text().trim()
    }
  })

  if (!fileListText) {
    return undefined
  }

  const files = fileListText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && /\.\w{2,4}$/.test(l))

  return files.length > 0 ? files : undefined
}

/** Парсит количество эпизодов из строки */
function parseEpisodeCount(text?: string): number | undefined {
  if (!text) {
    return undefined
  }
  // "13+1 из 13+1" → 14 (сначала проверяем сложный формат)
  const plusMatch = text.match(/(\d+)\+(\d+)\s*из\s*(\d+)\+(\d+)/i)
  if (plusMatch) {
    return Number(plusMatch[3]) + Number(plusMatch[4])
  }
  // "37 из 37" → 37 (второе число)
  const match = text.match(/(\d+)\s*из\s*(\d+)/i)
  if (match) {
    return Number(match[2])
  }
  // Просто число
  const num = Number.parseInt(text)
  return num > 0 ? num : undefined
}

/** Парсит год из строки */
function parseYear(text?: string): number | undefined {
  if (!text) {
    return undefined
  }
  const match = text.match(/((?:19|20)\d{2})/)
  return match ? Number(match[1]) : undefined
}

/** Парсит жанры из строки */
function parseGenres(text?: string): string[] {
  if (!text) {
    return []
  }
  return text
    .split(/[,;]/)
    .map((g) => g.trim())
    .filter(Boolean)
}
