import { describe, expect, it } from 'vitest'

import { buildAniListEpisodeNameMap, parseAniListEpisodeTitle } from '../episode-names'

describe('parseAniListEpisodeTitle', () => {
  it('разбирает стандартный формат "Episode N - Title"', () => {
    expect(parseAniListEpisodeTitle('Episode 12 - The Beginning')).toEqual({ number: 12, name: 'The Beginning' })
  })

  it('разбирает сокращение "Ep. N: Title"', () => {
    expect(parseAniListEpisodeTitle('Ep. 3: Into the Void')).toEqual({ number: 3, name: 'Into the Void' })
  })

  it('разбирает голый "N - Title" без слова Episode', () => {
    expect(parseAniListEpisodeTitle('7 - Title')).toEqual({ number: 7, name: 'Title' })
  })

  it('разбирает тире em-dash', () => {
    expect(parseAniListEpisodeTitle('Episode 1 — Title')).toEqual({ number: 1, name: 'Title' })
  })

  it('возвращает null без разделителя (просто номер)', () => {
    expect(parseAniListEpisodeTitle('Episode 5')).toBeNull()
  })

  it('возвращает null для пустой строки', () => {
    expect(parseAniListEpisodeTitle('')).toBeNull()
  })

  it('возвращает null для null', () => {
    expect(parseAniListEpisodeTitle(null)).toBeNull()
  })

  it('возвращает null если после разделителя пусто', () => {
    expect(parseAniListEpisodeTitle('Episode 5 - ')).toBeNull()
  })
})

describe('buildAniListEpisodeNameMap', () => {
  it('строит карту номер → название', () => {
    const map = buildAniListEpisodeNameMap([
      { title: 'Episode 1 - First' },
      { title: 'Episode 2 - Second' },
    ])
    expect(map.get(1)).toBe('First')
    expect(map.get(2)).toBe('Second')
    expect(map.size).toBe(2)
  })

  it('пропускает нераспарсенные заголовки, не роняя остальные', () => {
    const map = buildAniListEpisodeNameMap([
      { title: 'Episode 1' },
      { title: 'Episode 2 - Second' },
      { title: null },
    ])
    expect(map.size).toBe(1)
    expect(map.get(2)).toBe('Second')
  })

  it('при дубле номера с разных площадок оставляет первое название', () => {
    const map = buildAniListEpisodeNameMap([
      { title: 'Episode 1 - Crunchyroll Title' },
      { title: 'Episode 1 - HIDIVE Title' },
    ])
    expect(map.get(1)).toBe('Crunchyroll Title')
  })

  it('возвращает пустую карту для null/undefined', () => {
    expect(buildAniListEpisodeNameMap(null).size).toBe(0)
    expect(buildAniListEpisodeNameMap(undefined).size).toBe(0)
  })

  it('возвращает пустую карту для пустого списка', () => {
    expect(buildAniListEpisodeNameMap([]).size).toBe(0)
  })
})
