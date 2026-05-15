/**
 * Import тесты: Добавление в очередь (полный flow)
 *
 * Проверяют:
 * - Полный flow: папка → Shikimori → файлы → донор → очередь
 * - Items появляются на странице /transcode
 *
 * ПРИМЕЧАНИЕ: Эти тесты требуют реального Shikimori API.
 * Для CI можно использовать mock сервер или пропустить.
 */

import { expect, test } from '@playwright/test'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  getFixturesPath,
  launchElectronApp,
  stubSelectFolderDialog,
  waitForMainWindow,
} from '../../helpers/electron.helpers'
import { MOCK_ANIME_DATA, setupDefaultShikimoriMock } from '../../helpers/shikimori.mock'

// Контекст для тестов
let ctx: ElectronTestContext

// SKIP: Эти тесты требуют реального Shikimori API или mock сервера.
// page.route() не работает для main process requests в Electron.
// TODO: Реализовать mock сервер на порту или использовать ENV переменную для API endpoint
test.describe.skip('Add to Queue', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
    // Подключаем mock для Shikimori API (не работает для main process!)
    await setupDefaultShikimoriMock(ctx.page)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('полный flow: папка → Shikimori → файлы → очередь', async () => {
    // Используем mock Shikimori API
    const animeFolderPath = getFixturesPath('anime-folder')

    // Stub диалог выбора папки
    await stubSelectFolderDialog(ctx.app, animeFolderPath)

    // Шаг 1: Открываем wizard и выбираем папку
    const importButton = ctx.page.getByRole('button', { name: 'Импорт видео' })
    await importButton.click()

    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    await selectFolderBtn.click()

    // Ждём распознавания папки
    await ctx.page.waitForTimeout(2000)

    // Шаг 1 → Шаг 2: Далее
    await ctx.page.getByRole('button', { name: /далее/i }).click()

    // Шаг 2: Поиск в Shikimori (mock API)
    await ctx.page.waitForTimeout(1000)
    const searchInput = ctx.page.getByRole('textbox').first()
    await searchInput.fill('Test')
    await searchInput.press('Enter')

    // Ждём результаты от mock
    await ctx.page.waitForTimeout(1500)

    // Выбираем результат (mock возвращает "Тестовое Аниме")
    const animeResult = ctx.page.getByText(MOCK_ANIME_DATA.testAnime.russian).first()
    if (await animeResult.isVisible().catch(() => false)) {
      await animeResult.click()
    } else {
      // Fallback на первый результат
      const firstResult = ctx.page.locator('[data-testid="anime-search-result"]').first()
      if (await firstResult.isVisible().catch(() => false)) {
        await firstResult.click()
      }
    }

    await ctx.page.waitForTimeout(500)

    // Шаг 2 → Шаг 3: Далее
    const nextBtn = ctx.page.getByRole('button', { name: /далее/i })
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
    }

    // Шаг 3: Файлы
    await ctx.page.waitForTimeout(1000)
    const table = ctx.page.getByRole('table')
    await expect(table).toBeVisible({ timeout: 10000 })

    // Шаг 3 → Шаг 4: Далее
    await ctx.page.getByRole('button', { name: /далее/i }).click()

    // Шаг 4: Донор (пропускаем если есть) → Шаг 5
    await ctx.page.waitForTimeout(500)
    const skipDonorBtn = ctx.page.getByRole('button', { name: /далее|пропустить/i })
    if (await skipDonorBtn.isVisible().catch(() => false)) {
      await skipDonorBtn.click()
    }

    // Шаг 5: Preview — ждём анализа файлов
    await ctx.page.waitForTimeout(5000)

    // Нажимаем "В очередь"
    const addToQueueBtn = ctx.page.getByRole('button', { name: /в очередь/i })
    await expect(addToQueueBtn).toBeEnabled({ timeout: 30000 })
    await addToQueueBtn.click()

    // Должен перенаправить на /transcode
    await expect(ctx.page).toHaveURL(/.*transcode.*/, { timeout: 10000 })

    // На странице должны появиться элементы очереди
    const queueItem = ctx.page.getByText(MOCK_ANIME_DATA.testAnime.russian)
    await expect(queueItem).toBeVisible({ timeout: 5000 })
  })

  test('items появляются на странице /transcode после импорта', async () => {
    // Используем mock Shikimori API
    const animeFolderPath = getFixturesPath('anime-folder')
    await stubSelectFolderDialog(ctx.app, animeFolderPath)

    // Полный flow импорта (как в первом тесте)
    const importButton = ctx.page.getByRole('button', { name: 'Импорт видео' })
    await importButton.click()

    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    await selectFolderBtn.click()
    await ctx.page.waitForTimeout(2000)

    await ctx.page.getByRole('button', { name: /далее/i }).click()

    // Shikimori поиск
    await ctx.page.waitForTimeout(1000)
    const searchInput = ctx.page.getByRole('textbox').first()
    await searchInput.fill('Test')
    await searchInput.press('Enter')
    await ctx.page.waitForTimeout(1500)

    const animeResult = ctx.page.getByText(MOCK_ANIME_DATA.testAnime.russian).first()
    if (await animeResult.isVisible().catch(() => false)) {
      await animeResult.click()
    }
    await ctx.page.waitForTimeout(500)

    // Шаги 2→3→4→5
    const nextBtn = ctx.page.getByRole('button', { name: /далее/i })
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
    }

    await ctx.page.waitForTimeout(1000)
    await ctx.page.getByRole('button', { name: /далее/i }).click()

    const skipDonorBtn = ctx.page.getByRole('button', { name: /далее|пропустить/i })
    if (await skipDonorBtn.isVisible().catch(() => false)) {
      await skipDonorBtn.click()
    }

    await ctx.page.waitForTimeout(5000)

    // Добавляем в очередь
    const addToQueueBtn = ctx.page.getByRole('button', { name: /в очередь/i })
    await expect(addToQueueBtn).toBeEnabled({ timeout: 30000 })
    await addToQueueBtn.click()

    // Проверяем редирект на /transcode
    await expect(ctx.page).toHaveURL(/.*transcode.*/, { timeout: 10000 })

    // Проверяем структуру страницы очереди
    const pageHeading = ctx.page.getByRole('heading')
    await expect(pageHeading).toBeVisible()

    // На странице должен быть добавленный item
    const queueContent = ctx.page.locator('main')
    await expect(queueContent).toBeVisible()
  })

  test('wizard закрывается после добавления в очередь', async () => {
    // Используем mock Shikimori API
    const animeFolderPath = getFixturesPath('anime-folder')
    await stubSelectFolderDialog(ctx.app, animeFolderPath)

    // Открываем wizard
    const importButton = ctx.page.getByRole('button', { name: 'Импорт видео' })
    await importButton.click()

    // Wizard должен быть виден
    const dialog = ctx.page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Проходим wizard
    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    await selectFolderBtn.click()
    await ctx.page.waitForTimeout(2000)

    await ctx.page.getByRole('button', { name: /далее/i }).click()

    // Shikimori поиск
    await ctx.page.waitForTimeout(1000)
    const searchInput = ctx.page.getByRole('textbox').first()
    await searchInput.fill('Test')
    await searchInput.press('Enter')
    await ctx.page.waitForTimeout(1500)

    const animeResult = ctx.page.getByText(MOCK_ANIME_DATA.testAnime.russian).first()
    if (await animeResult.isVisible().catch(() => false)) {
      await animeResult.click()
    }
    await ctx.page.waitForTimeout(500)

    // Шаги 2→3→4→5
    const nextBtn = ctx.page.getByRole('button', { name: /далее/i })
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
    }

    await ctx.page.waitForTimeout(1000)
    await ctx.page.getByRole('button', { name: /далее/i }).click()

    const skipDonorBtn = ctx.page.getByRole('button', { name: /далее|пропустить/i })
    if (await skipDonorBtn.isVisible().catch(() => false)) {
      await skipDonorBtn.click()
    }

    await ctx.page.waitForTimeout(5000)

    // Добавляем в очередь
    const addToQueueBtn = ctx.page.getByRole('button', { name: /в очередь/i })
    await expect(addToQueueBtn).toBeEnabled({ timeout: 30000 })
    await addToQueueBtn.click()

    // После добавления wizard должен закрыться
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
  })
})
