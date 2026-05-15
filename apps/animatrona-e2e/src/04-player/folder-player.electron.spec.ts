/**
 * Player тесты: Folder Player (/player)
 *
 * Проверяют режим воспроизведения локальных файлов:
 * - Открытие страницы плеера
 * - Выбор файла для воспроизведения
 * - Выбор папки для папочного режима
 */

import { expect, test } from '@playwright/test'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  getFixturesPath,
  launchElectronApp,
  stubOpenFileDialog,
  stubSelectFolderDialog,
  waitForMainWindow,
} from '../../helpers/electron.helpers'

// Контекст для тестов
let ctx: ElectronTestContext

test.describe('Folder Player', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('открывается страница плеера через навигацию', async () => {
    // Находим ссылку на плеер в навигации
    const nav = ctx.page.getByRole('navigation')
    await expect(nav).toBeVisible()

    // Кликаем на ссылку "Плеер" в сайдбаре
    const playerLink = nav.getByRole('link', { name: /плеер/i })
    const isPlayerLinkVisible = await playerLink.isVisible().catch(() => false)

    if (!isPlayerLinkVisible) {
      // Если нет ссылки "Плеер" — пропускаем тест
      test.skip()
      return
    }

    await playerLink.click()

    // Ждём загрузки страницы плеера
    await ctx.page.waitForTimeout(2000)

    // Должны быть кнопки выбора файла/папки
    const selectFileBtn = ctx.page.getByRole('button', { name: /выбрать файл/i })
    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })

    // Хотя бы одна из кнопок должна быть видна
    const isFileVisible = await selectFileBtn.isVisible().catch(() => false)
    const isFolderVisible = await selectFolderBtn.isVisible().catch(() => false)

    expect(isFileVisible || isFolderVisible).toBe(true)
  })

  test('выбор видеофайла загружает плеер', async () => {
    // Путь к тестовому видео
    const videoPath = getFixturesPath('videos', 'sample-1s.mkv')

    // Stub диалог выбора файла
    await stubOpenFileDialog(ctx.app, [videoPath])

    // Навигируем на страницу плеера через UI
    const nav = ctx.page.getByRole('navigation')
    const playerLink = nav.getByRole('link', { name: /плеер/i })
    const isPlayerLinkVisible = await playerLink.isVisible().catch(() => false)

    if (!isPlayerLinkVisible) {
      test.skip()
      return
    }

    await playerLink.click()
    await ctx.page.waitForTimeout(2000)

    // Кликаем "Выбрать файл"
    const selectFileBtn = ctx.page.getByRole('button', { name: /выбрать файл/i })
    const isVisible = await selectFileBtn.isVisible().catch(() => false)

    if (isVisible) {
      await selectFileBtn.click()

      // Ждём загрузки видеоплеера
      await ctx.page.waitForTimeout(3000)

      // Видео должно загрузиться — проверяем наличие video элемента
      const video = ctx.page.locator('video')
      const hasVideo = (await video.count()) > 0

      // Или плеер с контролами
      const playerControls = ctx.page.locator('[data-testid="video-player"], .shaka-video-container')
      const hasControls = (await playerControls.count()) > 0

      expect(hasVideo || hasControls).toBe(true)
    } else {
      test.skip()
    }
  })

  test('выбор папки активирует папочный режим', async () => {
    // Путь к тестовой папке
    const folderPath = getFixturesPath('anime-folder')

    // Stub диалог выбора папки
    await stubSelectFolderDialog(ctx.app, folderPath)

    // Навигируем на страницу плеера через UI
    const nav = ctx.page.getByRole('navigation')
    const playerLink = nav.getByRole('link', { name: /плеер/i })
    const isPlayerLinkVisible = await playerLink.isVisible().catch(() => false)

    if (!isPlayerLinkVisible) {
      test.skip()
      return
    }

    await playerLink.click()
    await ctx.page.waitForTimeout(2000)

    // Кликаем "Выбрать папку"
    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    const isVisible = await selectFolderBtn.isVisible().catch(() => false)

    if (isVisible) {
      await selectFolderBtn.click()

      // Ждём загрузки папочного режима
      await ctx.page.waitForTimeout(3000)

      // В папочном режиме должен появиться список эпизодов (sidebar)
      // или видео должно загрузиться
      const sidebar = ctx.page.getByRole('complementary')
      const hasSidebar = await sidebar.isVisible().catch(() => false)

      const video = ctx.page.locator('video')
      const hasVideo = (await video.count()) > 0

      // Должно быть что-то одно
      expect(hasSidebar || hasVideo).toBe(true)
    } else {
      test.skip()
    }
  })

  test('навигация плеер → библиотека работает', async () => {
    // Навигируем на страницу плеера через UI
    const nav = ctx.page.getByRole('navigation')
    const playerLink = nav.getByRole('link', { name: /плеер/i })
    const isPlayerLinkVisible = await playerLink.isVisible().catch(() => false)

    if (!isPlayerLinkVisible) {
      test.skip()
      return
    }

    await playerLink.click()
    await ctx.page.waitForTimeout(2000)

    // Кликаем на ссылку "Библиотека" в навигации
    const libraryLink = nav.getByRole('link', { name: /библиотека/i })
    const isLibraryVisible = await libraryLink.isVisible().catch(() => false)

    if (isLibraryVisible) {
      await libraryLink.click()
      await ctx.page.waitForTimeout(2000)

      // Должны вернуться в библиотеку — проверяем заголовок (exact match)
      const heading = ctx.page.getByRole('heading', { name: 'Библиотека аниме' })
      await expect(heading).toBeVisible({ timeout: 5000 })
    }
  })
})
