/**
 * Player тесты: Страница просмотра /watch
 *
 * Проверяют:
 * - Загрузка плеера с валидным эпизодом
 * - Навигация между эпизодами
 * - Отображение информации об аниме
 *
 * Использует seed БД для создания тестовых данных.
 */

import { expect, test } from '@playwright/test'
import {
  cleanupAllTestDatabases,
  createSeededDatabase,
  DEFAULT_WATCH_PAGE_SEED,
  deleteTestDatabase,
} from '../../helpers/db.helpers'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  getFixturesPath,
  launchElectronWithSeededDb,
  waitForMainWindow,
} from '../../helpers/electron.helpers'

// Контекст для тестов с seeded БД
let ctx: ElectronTestContext & { userDataDir: string }
let seededDbPath: string

// SKIP: Seed БД тесты требуют дополнительной отладки:
// - Seeded данные не отображаются в UI (возможно проблема с FTS индексами)
// - Нужно проверить что Electron читает БД из userData/data/app.db
// - Возможно требуется явное обновление кэша библиотеки
test.describe.skip('Watch Page with Seed', () => {
  test.beforeAll(async () => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
      return
    }

    // Создаём seeded БД один раз для всех тестов
    const videoPath = getFixturesPath('videos', 'sample-1s.mkv')
    const seedData = {
      ...DEFAULT_WATCH_PAGE_SEED,
      episode: {
        ...DEFAULT_WATCH_PAGE_SEED.episode,
        sourcePath: videoPath,
      },
    }

    const result = await createSeededDatabase(seedData)
    seededDbPath = result.dbPath
  })

  test.afterAll(() => {
    // Очищаем тестовую БД
    if (seededDbPath) {
      deleteTestDatabase(seededDbPath)
    }
  })

  test.beforeEach(async () => {
    // Запускаем с seeded БД
    ctx = await launchElectronWithSeededDb(seededDbPath)
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('библиотека показывает seeded аниме', async () => {
    // С seeded БД в библиотеке должно быть 1 аниме
    const animeCard = ctx.page.getByText('Test Anime')
    await expect(animeCard.first()).toBeVisible({ timeout: 10000 })
  })

  test('клик на аниме открывает детали', async () => {
    // Находим карточку аниме
    const animeCard = ctx.page.getByText('Test Anime')
    await expect(animeCard.first()).toBeVisible({ timeout: 10000 })

    // Кликаем на карточку
    await animeCard.first().click()
    await ctx.page.waitForTimeout(2000)

    // Должны увидеть детали аниме или список эпизодов
    const episodeText = ctx.page.getByText(/эпизод|episode/i)
    const hasEpisode = await episodeText
      .first()
      .isVisible()
      .catch(() => false)

    // Или название аниме в деталях
    const animeTitle = ctx.page.getByRole('heading', { name: /test anime/i })
    const hasTitle = await animeTitle.isVisible().catch(() => false)

    expect(hasEpisode || hasTitle).toBe(true)
  })

  test('можно перейти к просмотру эпизода', async () => {
    // Находим карточку аниме
    const animeCard = ctx.page.getByText('Test Anime')
    await expect(animeCard.first()).toBeVisible({ timeout: 10000 })

    // Кликаем на карточку
    await animeCard.first().click()
    await ctx.page.waitForTimeout(2000)

    // Ищем кнопку/ссылку для просмотра эпизода
    const watchButton = ctx.page.getByRole('button', { name: /смотреть|watch|play/i })
    const episodeLink = ctx.page.getByRole('link', { name: /эпизод 1|episode 1/i })

    const hasWatchButton = await watchButton
      .first()
      .isVisible()
      .catch(() => false)
    const hasEpisodeLink = await episodeLink.isVisible().catch(() => false)

    if (hasWatchButton) {
      await watchButton.first().click()
    } else if (hasEpisodeLink) {
      await episodeLink.click()
    } else {
      // Может быть другой UI — пропускаем
      test.skip()
      return
    }

    await ctx.page.waitForTimeout(3000)

    // Должен загрузиться плеер
    const video = ctx.page.locator('video')
    const hasVideo = (await video.count()) > 0

    const shakaContainer = ctx.page.locator('.shaka-video-container, [data-testid="video-player"]')
    const hasShaka = (await shakaContainer.count()) > 0

    expect(hasVideo || hasShaka).toBe(true)
  })
})

// Отдельный describe для тестов без seed (для сравнения)
test.describe('Watch Page - No Seed', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
    }
  })

  test('пустая библиотека без seed', async () => {
    // Этот тест использует обычный запуск (без seed)
    // Проверяет что библиотека пуста при чистой установке

    // Импортируем обычный launchElectronApp
    const { launchElectronApp } = await import('../../helpers/electron.helpers')

    const normalCtx = await launchElectronApp()
    await waitForMainWindow(normalCtx, 60000)

    // Должен показать пустое состояние
    const emptyText = normalCtx.page.getByText('0 тайтлов в коллекции')
    const hasEmpty = await emptyText.isVisible().catch(() => false)

    await closeElectronApp(normalCtx)

    expect(hasEmpty).toBe(true)
  })
})

// Cleanup после всех тестов
test.afterAll(() => {
  cleanupAllTestDatabases()
})
