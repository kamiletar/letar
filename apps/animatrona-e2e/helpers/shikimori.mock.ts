/**
 * Mock для Shikimori API.
 *
 * Использует route interception Playwright для перехвата GraphQL запросов.
 * Позволяет тестировать import flow без реальных запросов к API.
 */

import type { Page, Route } from 'playwright'

const SHIKIMORI_GRAPHQL_URL = 'https://shikimori.one/api/graphql'

/**
 * Тестовые данные аниме для mock
 */
export interface MockAnimeData {
  id: string
  name: string
  russian: string
  japanese: string | null
  kind: string
  score: string
  status: string
  episodes: number
  episodesAired: number
  airedOn?: { year: number; month: number; day: number }
  releasedOn?: { year: number; month: number; day: number }
  rating: string
  poster?: {
    originalUrl: string
    mainUrl: string
  }
  genres?: Array<{ id: string; name: string; russian: string }>
  studios?: Array<{ id: string; name: string }>
  description?: string
}

/**
 * Стандартные mock данные для тестов
 */
export const MOCK_ANIME_DATA: Record<string, MockAnimeData> = {
  // Test Anime (совпадает с fixtures/anime-folder)
  testAnime: {
    id: '12345',
    name: 'Test Anime',
    russian: 'Тестовое Аниме',
    japanese: 'テストアニメ',
    kind: 'tv',
    score: '8.5',
    status: 'released',
    episodes: 12,
    episodesAired: 12,
    airedOn: { year: 2024, month: 1, day: 1 },
    releasedOn: { year: 2024, month: 3, day: 25 },
    rating: 'pg_13',
    poster: {
      originalUrl: 'https://shikimori.one/system/animes/original/12345.jpg',
      mainUrl: 'https://shikimori.one/system/animes/preview/12345.jpg',
    },
    genres: [
      { id: '1', name: 'Action', russian: 'Экшен' },
      { id: '2', name: 'Adventure', russian: 'Приключения' },
    ],
    studios: [{ id: '1', name: 'Test Studio' }],
    description: 'Тестовое описание аниме для E2E тестов.',
  },

  // Steins;Gate (популярное аниме)
  steinsGate: {
    id: '9253',
    name: 'Steins;Gate',
    russian: 'Врата Штейна',
    japanese: 'シュタインズ・ゲート',
    kind: 'tv',
    score: '9.09',
    status: 'released',
    episodes: 24,
    episodesAired: 24,
    airedOn: { year: 2011, month: 4, day: 6 },
    releasedOn: { year: 2011, month: 9, day: 14 },
    rating: 'pg_13',
    poster: {
      originalUrl: 'https://shikimori.one/system/animes/original/9253.jpg',
      mainUrl: 'https://shikimori.one/system/animes/preview/9253.jpg',
    },
    genres: [
      { id: '24', name: 'Sci-Fi', russian: 'Фантастика' },
      { id: '41', name: 'Thriller', russian: 'Триллер' },
    ],
    studios: [{ id: '314', name: 'White Fox' }],
    description: 'Группа друзей случайно обнаруживает, что микроволновая печь...',
  },
}

/**
 * Создать GraphQL response для поиска аниме
 */
function createSearchResponse(results: MockAnimeData[]): object {
  return {
    data: {
      animes: results.map((anime) => ({
        id: anime.id,
        name: anime.name,
        russian: anime.russian,
        japanese: anime.japanese,
        kind: anime.kind,
        score: anime.score,
        status: anime.status,
        episodes: anime.episodes,
        episodesAired: anime.episodesAired,
        poster: anime.poster,
      })),
    },
  }
}

/**
 * Создать GraphQL response для деталей аниме
 */
function createDetailsResponse(anime: MockAnimeData | null): object {
  if (!anime) {
    return { data: { animes: [] } }
  }

  return {
    data: {
      animes: [
        {
          ...anime,
          airedOn: anime.airedOn,
          releasedOn: anime.releasedOn,
        },
      ],
    },
  }
}

/**
 * Настроить mock для Shikimori API
 *
 * @param page - Playwright Page
 * @param options - Опции mock
 *
 * @example
 * ```ts
 * await setupShikimoriMock(ctx.page, {
 *   searchResults: [MOCK_ANIME_DATA.testAnime],
 *   detailsById: { '12345': MOCK_ANIME_DATA.testAnime },
 * })
 * ```
 */
export async function setupShikimoriMock(
  page: Page,
  options: {
    /** Результаты поиска */
    searchResults?: MockAnimeData[]
    /** Детали по ID */
    detailsById?: Record<string, MockAnimeData>
    /** Задержка ответа (мс) */
    delay?: number
    /** Имитировать ошибку */
    simulateError?: boolean
  } = {}
): Promise<void> {
  const { searchResults = [], detailsById = {}, delay = 100, simulateError = false } = options

  await page.route(SHIKIMORI_GRAPHQL_URL, async (route: Route) => {
    // Имитация задержки сети
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // Имитация ошибки
    if (simulateError) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Internal Server Error' }] }),
      })
      return
    }

    // Получаем тело запроса
    const request = route.request()
    const postData = request.postDataJSON() as { query: string; variables?: Record<string, unknown> }

    // Определяем тип запроса по содержимому query
    const query = postData.query || ''

    // Поиск аниме
    if (query.includes('$search')) {
      const searchTerm = (postData.variables?.search as string) || ''

      // Фильтруем результаты по поисковому запросу
      const filteredResults = searchResults.filter(
        (anime) =>
          anime.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          anime.russian.toLowerCase().includes(searchTerm.toLowerCase())
      )

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createSearchResponse(filteredResults.length > 0 ? filteredResults : searchResults)),
      })
      return
    }

    // Получение деталей по ID
    if (query.includes('$ids')) {
      const ids = (postData.variables?.ids as string) || ''
      const anime = detailsById[ids] || null

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createDetailsResponse(anime)),
      })
      return
    }

    // Неизвестный запрос — пропускаем
    await route.continue()
  })
}

/**
 * Удалить mock для Shikimori API
 */
export async function clearShikimoriMock(page: Page): Promise<void> {
  await page.unroute(SHIKIMORI_GRAPHQL_URL)
}

/**
 * Быстрый mock с тестовым аниме
 */
export async function setupDefaultShikimoriMock(page: Page): Promise<void> {
  await setupShikimoriMock(page, {
    searchResults: [MOCK_ANIME_DATA.testAnime, MOCK_ANIME_DATA.steinsGate],
    detailsById: {
      [MOCK_ANIME_DATA.testAnime.id]: MOCK_ANIME_DATA.testAnime,
      [MOCK_ANIME_DATA.steinsGate.id]: MOCK_ANIME_DATA.steinsGate,
    },
  })
}
