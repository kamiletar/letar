import { describe, expect, it } from 'vitest'

import { detectSubtitleType, isDispositionFlagSet, isPartialSubtitleType } from './subtitle-type'

describe('detectSubtitleType — по названию дорожки (встроенные в контейнер)', () => {
  it('распознаёт русские надписи', () => {
    expect(detectSubtitleType({ title: 'Надписи' })).toBe('signs')
  })

  it('распознаёт Signs & Songs как надписи (signs проверяется первым)', () => {
    expect(detectSubtitleType({ title: 'Signs & Songs' })).toBe('signs')
  })

  it('распознаёт дорожку с названием Forced', () => {
    expect(detectSubtitleType({ title: 'Forced [RU]' })).toBe('signs')
  })

  it('распознаёт песни', () => {
    expect(detectSubtitleType({ title: 'Караоке' })).toBe('songs')
    expect(detectSubtitleType({ title: 'Songs only' })).toBe('songs')
  })

  it('полные субтитры не считает частичными', () => {
    expect(detectSubtitleType({ title: 'Русские субтитры [Anilibria]' })).toBe('full')
  })

  it('пустое название не ломает классификацию', () => {
    expect(detectSubtitleType({ title: '' })).toBe('full')
    expect(detectSubtitleType({ title: null })).toBe('full')
    expect(detectSubtitleType({})).toBe('full')
  })
})

describe('detectSubtitleType — по имени внешнего файла', () => {
  it('распознаёт суффикс имени файла', () => {
    expect(detectSubtitleType({ filePath: 'D:/Anime/ep01.надписи.ass' })).toBe('signs')
    expect(detectSubtitleType({ filePath: 'D:/Anime/ep01.signs.ass' })).toBe('signs')
    expect(detectSubtitleType({ filePath: 'D:/Anime/ep01.songs.ass' })).toBe('songs')
  })

  it('распознаёт имя папки', () => {
    expect(detectSubtitleType({ filePath: 'D:/Anime/RUS Subs/надписи/ep01.ass' })).toBe('signs')
    expect(detectSubtitleType({ filePath: 'D:/Anime/Subs/Karaoke/ep01.ass' })).toBe('songs')
  })

  it('работает с обратными слэшами Windows', () => {
    expect(detectSubtitleType({ filePath: 'D:\\Anime\\Signs\\ep01.ass' })).toBe('signs')
  })

  it('обычные субтитры остаются full', () => {
    expect(detectSubtitleType({ filePath: 'D:/Anime/RUS Subs [Yakusub]/ep01.ru_yakusub.ass' })).toBe('full')
  })
})

describe('detectSubtitleType — приоритеты источников', () => {
  it('название дорожки важнее forced-флага', () => {
    expect(
      detectSubtitleType({
        title: 'Полные субтитры',
        disposition: { forced: 1 },
      })
    ).toBe('full')
  })

  it('название дорожки важнее имени файла', () => {
    expect(
      detectSubtitleType({
        title: 'Песни',
        filePath: 'D:/Anime/надписи/ep01.ass',
      })
    ).toBe('songs')
  })

  it('forced решает только для безымянной дорожки', () => {
    expect(detectSubtitleType({ disposition: { forced: true } })).toBe('signs')
    expect(detectSubtitleType({ title: '', disposition: { forced: 1 } })).toBe('signs')
  })

  it('названная дорожка без слов про надписи считается полной даже с forced', () => {
    // В рипах полные субтитры иногда помечают forced, чтобы плеер включал их сам —
    // название важнее флага, а сам forced остаётся отдельным полем isForced у дорожки
    expect(detectSubtitleType({ title: 'Русские', disposition: { forced: 1 } })).toBe('full')
  })

  it('forced: 0 не влияет на результат', () => {
    expect(detectSubtitleType({ title: 'Русские', disposition: { forced: 0 } })).toBe('full')
    expect(detectSubtitleType({ disposition: { forced: 0 } })).toBe('full')
  })
})

describe('isDispositionFlagSet', () => {
  it('принимает числа ffprobe и boolean', () => {
    expect(isDispositionFlagSet(1)).toBe(true)
    expect(isDispositionFlagSet(true)).toBe(true)
    expect(isDispositionFlagSet(0)).toBe(false)
    expect(isDispositionFlagSet(false)).toBe(false)
    expect(isDispositionFlagSet(undefined)).toBe(false)
  })
})

describe('isPartialSubtitleType', () => {
  it('надписи и песни — частичные, полные — нет', () => {
    expect(isPartialSubtitleType('signs')).toBe(true)
    expect(isPartialSubtitleType('songs')).toBe(true)
    expect(isPartialSubtitleType('full')).toBe(false)
  })
})
