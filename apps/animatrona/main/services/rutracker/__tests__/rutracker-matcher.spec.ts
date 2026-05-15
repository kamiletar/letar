import { describe, expect, it } from 'vitest'
import type { ShikimoriAnimePreview } from '../../shikimori'
import {
  type CandidateScore,
  isAutoMatchConfident,
  matchFromDirectLink,
  matchFromMalLink,
  matchFromSearch,
  normalizeTitle,
  rankCandidates,
  titleSimilarity,
} from '../rutracker-matcher'
import type { RutrackerTorrentInfo } from '../types'

// Хелпер для создания минимального RutrackerTorrentInfo
function makeTorrent(overrides: Partial<RutrackerTorrentInfo> = {}): RutrackerTorrentInfo {
  return {
    url: 'https://rutracker.org/forum/viewtopic.php?t=123',
    topicId: 123,
    nameRu: 'Тетрадь Смерти',
    nameOriginal: 'Death Note',
    languages: [],
    genres: [],
    dubGroups: [],
    externalLinks: {},
    magnetLink: 'magnet:?xt=urn:btih:ABC',
    ...overrides,
  }
}

// Хелпер для создания минимального ShikimoriAnimePreview
function makeCandidate(overrides: Partial<ShikimoriAnimePreview> = {}): ShikimoriAnimePreview {
  return {
    id: '1535',
    name: 'Death Note',
    russian: 'Тетрадь смерти',
    description: null,
    descriptionHtml: null,
    score: 8.5,
    status: 'released',
    kind: 'tv',
    episodes: 37,
    episodesAired: 37,
    airedOn: { year: 2006, month: 10, day: 4 },
    releasedOn: null,
    poster: null,
    genres: [],
    ...overrides,
  }
}

describe('normalizeTitle', () => {
  it('приводит к нижнему регистру', () => {
    expect(normalizeTitle('Death Note')).toBe('death note')
  })

  it('убирает пунктуацию', () => {
    expect(normalizeTitle('Re:Zero - Starting Life')).toBe('re zero starting life')
  })

  it('убирает музыкальные символы', () => {
    expect(normalizeTitle('K-On!☆')).toBe('k on')
  })

  it('нормализует пробелы', () => {
    expect(normalizeTitle('  Death    Note  ')).toBe('death note')
  })

  it('сохраняет кириллицу', () => {
    expect(normalizeTitle('Тетрадь Смерти')).toBe('тетрадь смерти')
  })
})

describe('titleSimilarity', () => {
  it('возвращает 1.0 для идентичных строк', () => {
    expect(titleSimilarity('Death Note', 'Death Note')).toBe(1.0)
  })

  it('возвращает 1.0 для строк отличающихся регистром', () => {
    expect(titleSimilarity('death note', 'DEATH NOTE')).toBe(1.0)
  })

  it('высокий скор когда одна строка содержит другую', () => {
    const score = titleSimilarity('Death Note', 'Death Note: Rewrite')
    expect(score).toBeGreaterThan(0.7)
  })

  it('штрафует разные сезоны (trailing номер)', () => {
    // "Загадка Бога" vs "Загадка Бога 2" — разные сезоны
    const score = titleSimilarity('Фи Брейн: Загадка Бога', 'Фи Брейн: Загадка Бога 2')
    expect(score).toBeLessThanOrEqual(0.5)
  })

  it('штрафует разные сезоны (оригинальные названия)', () => {
    const score = titleSimilarity('Phi Brain: Kami no Puzzle', 'Phi Brain: Kami no Puzzle 2')
    expect(score).toBeLessThanOrEqual(0.5)
  })

  it('не штрафует когда разница не только цифра', () => {
    // "Rewrite" — не просто номер, не штрафуем
    const score = titleSimilarity('Death Note', 'Death Note Rewrite')
    expect(score).toBeGreaterThan(0.7)
  })

  it('умеренный скор для похожих строк', () => {
    const score = titleSimilarity('Fullmetal Alchemist', 'Full Metal Alchemist')
    expect(score).toBeGreaterThan(0.5)
  })

  it('низкий скор для разных строк', () => {
    const score = titleSimilarity('Death Note', 'Naruto')
    expect(score).toBeLessThan(0.3)
  })

  it('0 для пустых строк', () => {
    expect(titleSimilarity('', 'test')).toBe(0)
    expect(titleSimilarity('test', '')).toBe(0)
  })
})

describe('rankCandidates', () => {
  it('ставит точное совпадение на первое место', () => {
    const torrent = makeTorrent({
      nameOriginal: 'Death Note',
      nameRu: 'Тетрадь Смерти',
      year: 2006,
      type: 'TV',
      episodeCount: 37,
    })

    const candidates = [
      makeCandidate({
        id: '999',
        name: 'Death Parade',
        russian: 'Смертельный парад',
        airedOn: { year: 2015, month: 1, day: 1 },
        episodes: 12,
      }),
      makeCandidate({
        id: '1535',
        name: 'Death Note',
        russian: 'Тетрадь смерти',
        airedOn: { year: 2006, month: 10, day: 4 },
        episodes: 37,
      }),
    ]

    const scores = rankCandidates(candidates, torrent)

    expect(scores[0].shikimoriId).toBe(1535)
    expect(scores[0].score).toBeGreaterThan(0.9)
    expect(scores[0].score).toBeGreaterThan(scores[1].score)
  })

  it('учитывает год выпуска', () => {
    const torrent = makeTorrent({ nameOriginal: 'Hunter x Hunter', year: 2011 })

    const candidates = [
      makeCandidate({
        id: '1',
        name: 'Hunter x Hunter',
        airedOn: { year: 1999, month: 1, day: 1 },
      }),
      makeCandidate({
        id: '2',
        name: 'Hunter x Hunter (2011)',
        airedOn: { year: 2011, month: 10, day: 1 },
      }),
    ]

    const scores = rankCandidates(candidates, torrent)

    // Версия 2011 должна быть выше
    const score2011 = scores.find((s) => s.shikimoriId === 2)!
    const score1999 = scores.find((s) => s.shikimoriId === 1)!
    expect(score2011.breakdown.yearScore).toBeGreaterThan(score1999.breakdown.yearScore)
  })

  it('учитывает тип (TV vs Movie)', () => {
    const torrent = makeTorrent({ nameOriginal: 'Steins;Gate', type: 'Movie' })

    const candidates = [
      makeCandidate({ id: '1', name: 'Steins;Gate', kind: 'tv' }),
      makeCandidate({ id: '2', name: 'Steins;Gate: Fuka Ryouiki no Déjà vu', kind: 'movie' }),
    ]

    const scores = rankCandidates(candidates, torrent)

    const movieScore = scores.find((s) => s.shikimoriId === 2)!
    const tvScore = scores.find((s) => s.shikimoriId === 1)!
    expect(movieScore.breakdown.typeScore).toBeGreaterThan(tvScore.breakdown.typeScore)
  })

  it('учитывает количество эпизодов', () => {
    const torrent = makeTorrent({ nameOriginal: 'Naruto', episodeCount: 220 })

    const candidates = [
      makeCandidate({ id: '1', name: 'Naruto', episodes: 220 }),
      makeCandidate({ id: '2', name: 'Naruto', episodes: 500 }),
    ]

    const scores = rankCandidates(candidates, torrent)

    const exact = scores.find((s) => s.shikimoriId === 1)!
    const wrong = scores.find((s) => s.shikimoriId === 2)!
    expect(exact.breakdown.episodeScore).toBeGreaterThan(wrong.breakdown.episodeScore)
  })

  it('выбирает правильный сезон (S2 вместо S1)', () => {
    const torrent = makeTorrent({
      nameRu: 'Фи Брейн: Загадка Бога 2',
      nameOriginal: 'Phi Brain: Kami no Puzzle',
      year: 2012,
      type: 'TV',
      episodeCount: 25,
    })

    const candidates = [
      makeCandidate({
        id: '9981',
        name: 'Phi Brain: Kami no Puzzle',
        russian: 'Фи Брейн: Загадка Бога',
        airedOn: { year: 2011, month: 10, day: 1 },
        episodes: 25,
        kind: 'tv',
      }),
      makeCandidate({
        id: '13377',
        name: 'Phi Brain: Kami no Puzzle 2',
        russian: 'Фи Брейн: Загадка Бога 2',
        airedOn: { year: 2012, month: 4, day: 1 },
        episodes: 25,
        kind: 'tv',
      }),
    ]

    const scores = rankCandidates(candidates, torrent)

    // S2 должен быть на первом месте
    expect(scores[0].shikimoriId).toBe(13377)
    expect(scores[0].score).toBeGreaterThan(scores[1].score)
  })

  it('сортирует по убыванию скора', () => {
    const torrent = makeTorrent({ nameOriginal: 'Attack on Titan' })

    const candidates = [
      makeCandidate({ id: '1', name: 'Something Else', score: 9 }),
      makeCandidate({ id: '2', name: 'Attack on Titan', score: 8 }),
      makeCandidate({ id: '3', name: 'Attack on Titan Season 2', score: 7 }),
    ]

    const scores = rankCandidates(candidates, torrent)

    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i].score).toBeGreaterThanOrEqual(scores[i + 1].score)
    }
  })
})

describe('isAutoMatchConfident', () => {
  it('false для пустого массива', () => {
    expect(isAutoMatchConfident([])).toBe(false)
  })

  it('false для низкого скора', () => {
    const scores: CandidateScore[] = [
      { shikimoriId: 1, score: 0.5, breakdown: { titleScore: 0.5, yearScore: 0.5, typeScore: 0.5, episodeScore: 0.5 } },
    ]
    expect(isAutoMatchConfident(scores)).toBe(false)
  })

  it('true для одного кандидата с высоким скором', () => {
    const scores: CandidateScore[] = [
      { shikimoriId: 1, score: 0.95, breakdown: { titleScore: 1, yearScore: 1, typeScore: 0.8, episodeScore: 0.8 } },
    ]
    expect(isAutoMatchConfident(scores)).toBe(true)
  })

  it('true при большом отрыве от второго', () => {
    const scores: CandidateScore[] = [
      { shikimoriId: 1, score: 0.9, breakdown: { titleScore: 1, yearScore: 1, typeScore: 0.5, episodeScore: 0.5 } },
      { shikimoriId: 2, score: 0.5, breakdown: { titleScore: 0.5, yearScore: 0.5, typeScore: 0.5, episodeScore: 0.5 } },
    ]
    expect(isAutoMatchConfident(scores)).toBe(true)
  })

  it('false при малом отрыве', () => {
    const scores: CandidateScore[] = [
      {
        shikimoriId: 1,
        score: 0.85,
        breakdown: { titleScore: 0.9, yearScore: 0.8, typeScore: 0.8, episodeScore: 0.8 },
      },
      {
        shikimoriId: 2,
        score: 0.8,
        breakdown: { titleScore: 0.85, yearScore: 0.8, typeScore: 0.8, episodeScore: 0.8 },
      },
    ]
    expect(isAutoMatchConfident(scores)).toBe(false)
  })
})

describe('matchFromDirectLink', () => {
  it('возвращает MatchResult с confidence 1.0 при наличии shikimoriId', () => {
    const torrent = makeTorrent({
      externalLinks: {
        shikimoriId: 1535,
        shikimoriUrl: 'https://shikimori.one/animes/z1535-death-note',
      },
    })

    const result = matchFromDirectLink(torrent)!

    expect(result).toBeDefined()
    expect(result.shikimoriId).toBe(1535)
    expect(result.confidence).toBe(1.0)
    expect(result.method).toBe('direct-link')
  })

  it('возвращает null без shikimoriId', () => {
    const torrent = makeTorrent({ externalLinks: {} })
    expect(matchFromDirectLink(torrent)).toBeNull()
  })
})

describe('matchFromMalLink', () => {
  it('возвращает MatchResult с confidence 0.9 при наличии malId', () => {
    const torrent = makeTorrent({
      externalLinks: {
        malId: 1535,
        malUrl: 'https://myanimelist.net/anime/1535',
      },
    })

    const result = matchFromMalLink(torrent)!

    expect(result).toBeDefined()
    expect(result.shikimoriId).toBe(1535)
    expect(result.confidence).toBe(0.9)
    expect(result.method).toBe('mal-link')
  })

  it('возвращает null без malId', () => {
    const torrent = makeTorrent({ externalLinks: {} })
    expect(matchFromMalLink(torrent)).toBeNull()
  })
})

describe('matchFromSearch', () => {
  it('возвращает лучший результат', () => {
    const scores: CandidateScore[] = [
      { shikimoriId: 1535, score: 0.95, breakdown: { titleScore: 1, yearScore: 1, typeScore: 0.8, episodeScore: 0.8 } },
      {
        shikimoriId: 999,
        score: 0.3,
        breakdown: { titleScore: 0.3, yearScore: 0.5, typeScore: 0.5, episodeScore: 0.1 },
      },
    ]

    const result = matchFromSearch(scores)!

    expect(result.shikimoriId).toBe(1535)
    expect(result.confidence).toBe(0.95)
    expect(result.method).toBe('search-title')
  })

  it('возвращает null для пустого массива', () => {
    expect(matchFromSearch([])).toBeNull()
  })
})
