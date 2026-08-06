// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { buildExternalLinks } from './external-links'

describe('buildExternalLinks', () => {
  it('возвращает пустой массив, если ids не переданы', () => {
    expect(buildExternalLinks()).toEqual([])
  })

  it('возвращает пустой массив, если ids === null', () => {
    expect(buildExternalLinks(null)).toEqual([])
  })

  it('строит ссылку Shikimori из ids.shikimori', () => {
    const links = buildExternalLinks({ shikimori: 123 })
    expect(links).toEqual([
      { name: 'Shikimori', url: 'https://shikimori.one/animes/123', colorPalette: 'green' },
    ])
  })

  it('использует dbShikimoriId как fallback, если в ids его нет', () => {
    const links = buildExternalLinks(undefined, 456)
    expect(links).toEqual([
      { name: 'Shikimori', url: 'https://shikimori.one/animes/456', colorPalette: 'green' },
    ])
  })

  it('ids.shikimori имеет приоритет над dbShikimoriId', () => {
    const links = buildExternalLinks({ shikimori: 111 }, 999)
    expect(links).toHaveLength(1)
    expect(links[0]?.url).toBe('https://shikimori.one/animes/111')
  })

  it('строит ссылки для всех известных сервисов в фиксированном порядке', () => {
    const links = buildExternalLinks({
      shikimori: 1,
      mal: 2,
      anilist: 3,
      anidb: 4,
      kinopoisk: 5,
      worldArt: 6,
    })

    expect(links.map((l) => l.name)).toEqual([
      'Shikimori',
      'MyAnimeList',
      'AniList',
      'AniDB',
      'Кинопоиск',
      'World-Art',
    ])
    expect(links.map((l) => l.url)).toEqual([
      'https://shikimori.one/animes/1',
      'https://myanimelist.net/anime/2',
      'https://anilist.co/anime/3',
      'https://anidb.net/anime/4',
      'https://www.kinopoisk.ru/film/5',
      'http://www.world-art.ru/animation/animation.php?id=6',
    ])
  })

  it('пропускает сервисы без id', () => {
    const links = buildExternalLinks({ mal: 42 })
    expect(links).toEqual([
      { name: 'MyAnimeList', url: 'https://myanimelist.net/anime/42', colorPalette: 'blue' },
    ])
  })

  it('не добавляет Shikimori, если и ids.shikimori, и dbShikimoriId отсутствуют', () => {
    const links = buildExternalLinks({ mal: 1 }, null)
    expect(links.find((l) => l.name === 'Shikimori')).toBeUndefined()
  })

  it('не добавляет Shikimori при shikimori === 0 (falsy) даже с dbShikimoriId fallback на 0', () => {
    const links = buildExternalLinks({ shikimori: 0 }, 0)
    expect(links.find((l) => l.name === 'Shikimori')).toBeUndefined()
  })
})
