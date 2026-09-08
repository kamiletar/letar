import { describe, expect, it } from 'vitest'
import {
  extractGroupNameFromSubsDir,
  fuzzyMatchToVideo,
  isFontFolder,
  isSubtitleFolder,
  matchFontsToFiles,
  normalizeLanguageCode,
} from './external-subtitle-scanner'

// === fuzzyMatchToVideo ===

describe('fuzzyMatchToVideo', () => {
  const videoFiles = [
    { path: '[Yousei-raws] Haiyore! Nyaruko-san 01 [BDrip 1920x1080 x264 FLAC].mkv', episodeNumber: 1 },
    { path: '[Yousei-raws] Haiyore! Nyaruko-san 02 [BDrip 1920x1080 x264 FLAC].mkv', episodeNumber: 2 },
    { path: '[Yousei-raws] Haiyore! Nyaruko-san 12 [BDrip 1920x1080 x264 FLAC].mkv', episodeNumber: 12 },
  ]

  it('точный матч по basename', () => {
    const result = fuzzyMatchToVideo(
      '[Yousei-raws] Haiyore! Nyaruko-san 01 [BDrip 1920x1080 x264 FLAC].ass',
      videoFiles,
    )
    expect(result).toEqual({ episodeNumber: 1 })
  })

  it('матч по startsWith когда имя субтитра длиннее имени видео', () => {
    const result = fuzzyMatchToVideo(
      '[Yousei-raws] Haiyore! Nyaruko-san 02 [BDrip 1920x1080 x264 FLAC].extra.ass',
      videoFiles,
    )
    expect(result).toEqual({ episodeNumber: 2 })
  })

  it('матч по startsWith когда имя видео длиннее имени субтитра', () => {
    const shortVideos = [{ path: 'ep01', episodeNumber: 1 }]
    const result = fuzzyMatchToVideo('ep01.jp.ass', shortVideos)
    expect(result).toEqual({ episodeNumber: 1 })
  })

  it('единственный видеофайл (фильм) — всё матчится к нему', () => {
    const movieFiles = [{ path: 'Movie Title [BDRemux].mkv', episodeNumber: 1 }]
    const result = fuzzyMatchToVideo('Some Unrelated Subtitle Name.ass', movieFiles)
    expect(result).toEqual({ episodeNumber: 1, suffix: undefined })
  })

  it('единственный видеофайл — разбирает суффикс .lang_group из имени субтитра', () => {
    const movieFiles = [{ path: 'Movie Title [BDRemux].mkv', episodeNumber: 1 }]
    const result = fuzzyMatchToVideo('Movie Title.jp_netflix.ass', movieFiles)
    expect(result).toEqual({
      episodeNumber: 1,
      suffix: { lang: 'jp', group: 'netflix' },
    })
  })

  it('многоэпизодная папка — разбирает суффикс .lang_group, а не только startsWith', () => {
    // Регрессия: раньше шаг 1 (точный + bidirectional startsWith) матчил раньше, чем код
    // успевал дойти до стрипа суффикса — язык/группа из ".jp_netflix" терялись для любой
    // папки с несколькими сериями (работало только в спецкейсе одного видео-файла выше).
    // Порядок шагов исправлен по образцу external-audio-scanner.ts: точный матч → стрип
    // суффикса → общий prefix-матч.
    const result = fuzzyMatchToVideo(
      '[Yousei-raws] Haiyore! Nyaruko-san 12 [BDrip 1920x1080 x264 FLAC].jp_netflix.ass',
      videoFiles,
    )
    expect(result).toEqual({
      episodeNumber: 12,
      suffix: { lang: 'jp', group: 'netflix' },
    })
  })

  it('fallback по номеру эпизода при разных тегах в скобках — однозначный кандидат', () => {
    const taggedVideos = [
      { path: 'ep01 [BDRip][1080p]', episodeNumber: 1 },
      { path: 'ep02 [BDRip][1080p]', episodeNumber: 2 },
    ]
    const result = fuzzyMatchToVideo('ep01 [Audio].ass', taggedVideos)
    expect(result).toEqual({ episodeNumber: 1 })
  })

  it('неоднозначность по номеру эпизода (два видео с одним номером) → null', () => {
    const ambiguousVideos = [
      { path: 'ep01 [BDRip][1080p]', episodeNumber: 1 },
      { path: 'ep01 [WEBRip][720p]', episodeNumber: 1 },
    ]
    const result = fuzzyMatchToVideo('ep01 [Audio].ass', ambiguousVideos)
    expect(result).toBeNull()
  })

  it('полное отсутствие матча → null', () => {
    const result = fuzzyMatchToVideo('totally_unrelated_file.ass', videoFiles)
    expect(result).toBeNull()
  })
})

// === normalizeLanguageCode ===

describe('normalizeLanguageCode', () => {
  it('нормализует "ru"/"rus" → "ru"', () => {
    expect(normalizeLanguageCode('ru')).toBe('ru')
    expect(normalizeLanguageCode('rus')).toBe('ru')
  })

  it('нормализует "en"/"eng" → "en"', () => {
    expect(normalizeLanguageCode('en')).toBe('en')
    expect(normalizeLanguageCode('eng')).toBe('en')
  })

  it('нормализует "ja"/"jp"/"jpn" → "ja"', () => {
    expect(normalizeLanguageCode('ja')).toBe('ja')
    expect(normalizeLanguageCode('jp')).toBe('ja')
    expect(normalizeLanguageCode('jpn')).toBe('ja')
  })

  it('произвольный код → первые 2 символа', () => {
    expect(normalizeLanguageCode('kor')).toBe('ko')
    expect(normalizeLanguageCode('FRA')).toBe('fr')
  })
})

// === extractGroupNameFromSubsDir ===

describe('extractGroupNameFromSubsDir', () => {
  it('извлекает группу из квадратных скобок в конце пути', () => {
    expect(extractGroupNameFromSubsDir('D:/Anime/RUS Subs [Yakusub Studio]')).toBe('Yakusub Studio')
  })

  it('извлекает группу с кириллицей и пробелами', () => {
    expect(extractGroupNameFromSubsDir('/path/RUS Subs [Мирра & JeFerson]')).toBe('Мирра & JeFerson')
  })

  it('без скобок → undefined', () => {
    expect(extractGroupNameFromSubsDir('/path/RUS Subs')).toBeUndefined()
  })

  it('вложенный путь с несколькими [...] — берётся последний (ближе к концу)', () => {
    expect(extractGroupNameFromSubsDir('/Anime [BDRip]/RUS Subs [Yakusub Studio]')).toBe('Yakusub Studio')
  })

  it('обрезает пробелы в имени группы', () => {
    expect(extractGroupNameFromSubsDir('/path/Subs [ spaced ]')).toBe('spaced')
  })
})

// === isSubtitleFolder ===

describe('isSubtitleFolder', () => {
  it('распознаёт "Rus Sub"', () => {
    expect(isSubtitleFolder('Rus Sub')).toBe(true)
  })

  it('распознаёт "Субтитры"', () => {
    expect(isSubtitleFolder('Субтитры')).toBe(true)
  })

  it('распознаёт "Надписи"', () => {
    expect(isSubtitleFolder('Надписи')).toBe(true)
  })

  it('распознаёт "Subs"', () => {
    expect(isSubtitleFolder('Subs')).toBe(true)
  })

  it('не распознаёт обычную папку', () => {
    expect(isSubtitleFolder('Video')).toBe(false)
    expect(isSubtitleFolder('Extras')).toBe(false)
  })
})

// === isFontFolder ===

describe('isFontFolder', () => {
  it('распознаёт "Fonts"', () => {
    expect(isFontFolder('Fonts')).toBe(true)
  })

  it('распознаёт "Шрифты"', () => {
    expect(isFontFolder('Шрифты')).toBe(true)
  })

  it('распознаёт "Font"', () => {
    expect(isFontFolder('Font')).toBe(true)
  })

  it('не распознаёт обычную папку', () => {
    expect(isFontFolder('Video')).toBe(false)
    expect(isFontFolder('RUS Sub')).toBe(false)
  })
})

// === matchFontsToFiles ===

describe('matchFontsToFiles', () => {
  it('точный матч по имени (case-insensitive)', () => {
    const availableFonts = new Map([['comic sans', 'C:/fonts/Comic Sans.ttf']])
    const result = matchFontsToFiles(['Comic Sans'], availableFonts)
    expect(result).toEqual([{ name: 'Comic Sans', path: 'C:/fonts/Comic Sans.ttf' }])
  })

  it('частичный матч — имя шрифта содержится в имени файла', () => {
    const availableFonts = new Map([['comic sans bold', 'C:/fonts/Comic Sans Bold.ttf']])
    const result = matchFontsToFiles(['Comic Sans'], availableFonts)
    expect(result).toEqual([{ name: 'Comic Sans', path: 'C:/fonts/Comic Sans Bold.ttf' }])
  })

  it('частичный матч — имя файла содержится в имени шрифта', () => {
    const availableFonts = new Map([['arial', 'C:/fonts/Arial.ttf']])
    const result = matchFontsToFiles(['Arial Custom Style'], availableFonts)
    expect(result).toEqual([{ name: 'Arial Custom Style', path: 'C:/fonts/Arial.ttf' }])
  })

  it('полное отсутствие совпадения → не попадает в результат', () => {
    const availableFonts = new Map([['arial', 'C:/fonts/Arial.ttf']])
    const result = matchFontsToFiles(['Wingdings'], availableFonts)
    expect(result).toEqual([])
  })
})
