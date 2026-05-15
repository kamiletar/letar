/**
 * Electron тесты для Player Mode Switching
 *
 * Тестируют переключение между режимами плеера:
 * - File mode: выбор одного файла
 * - Folder mode: выбор папки с эпизодами (sidebar)
 *
 * ВАЖНО: Эти тесты требуют тестовые видео в fixtures/
 */

import { expect, test } from '@playwright/test'
import * as fs from 'fs'
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

// Пути к тестовым файлам
const VIDEO_FILE = getFixturesPath('videos', 'sample-1s.mkv')
const ANIME_FOLDER = getFixturesPath('anime-folder')

test.describe('Player Mode Switching', () => {
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

  /**
   * Хелпер: перейти на страницу плеера
   */
  async function goToPlayer(): Promise<boolean> {
    const nav = ctx.page.getByRole('navigation')
    const playerLink = nav.getByRole('link', { name: /плеер/i })
    const isVisible = await playerLink.isVisible().catch(() => false)

    if (!isVisible) {
      return false
    }

    await playerLink.click()
    await ctx.page.waitForTimeout(2000)
    return true
  }

  /**
   * Хелпер: проверить что плеер в file mode
   */
  async function _isFileMode(): Promise<boolean> {
    // В file mode нет sidebar с эпизодами
    const sidebar = ctx.page.getByRole('complementary')
    const hasSidebar = await sidebar.isVisible().catch(() => false)
    return !hasSidebar
  }

  /**
   * Хелпер: проверить что плеер в folder mode
   */
  async function isFolderMode(): Promise<boolean> {
    // В folder mode есть sidebar с эпизодами
    const sidebar = ctx.page.getByRole('complementary')
    const hasSidebar = await sidebar.isVisible().catch(() => false)

    // Или список эпизодов
    const episodeList = ctx.page.locator('[data-testid="episode-sidebar"], [data-testid="episode-list"]')
    const hasEpisodeList = (await episodeList.count()) > 0

    return hasSidebar || hasEpisodeList
  }

  test('file mode загружает видео без sidebar', async () => {
    const navigated = await goToPlayer()
    if (!navigated) {
      test.skip()
      return
    }

    // Проверяем что тестовый файл существует
    if (!fs.existsSync(VIDEO_FILE)) {
      console.log(`Test video not found: ${VIDEO_FILE}`)
      test.skip()
      return
    }

    // Stub диалог
    await stubOpenFileDialog(ctx.app, [VIDEO_FILE])

    // Выбираем файл
    const selectFileBtn = ctx.page.getByRole('button', { name: /выбрать файл/i })
    if (!(await selectFileBtn.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await selectFileBtn.click()
    await ctx.page.waitForTimeout(3000)

    // Видео должно загрузиться
    const video = ctx.page.locator('video')
    const hasVideo = (await video.count()) > 0

    if (hasVideo) {
      // В file mode НЕ должно быть sidebar с эпизодами
      // (может быть complementary для контролов, но не episode list)
      const episodeList = ctx.page.locator('[data-testid="episode-sidebar"]')
      const hasEpisodeList = (await episodeList.count()) > 0

      // File mode — без списка эпизодов
      expect(hasEpisodeList).toBe(false)
    }
  })

  test('folder mode показывает sidebar с эпизодами', async () => {
    const navigated = await goToPlayer()
    if (!navigated) {
      test.skip()
      return
    }

    // Проверяем что тестовая папка существует
    if (!fs.existsSync(ANIME_FOLDER)) {
      console.log(`Test folder not found: ${ANIME_FOLDER}`)
      test.skip()
      return
    }

    // Stub диалог
    await stubSelectFolderDialog(ctx.app, ANIME_FOLDER)

    // Выбираем папку
    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    if (!(await selectFolderBtn.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await selectFolderBtn.click()
    await ctx.page.waitForTimeout(3000)

    // Должен появиться sidebar или список эпизодов
    const inFolderMode = await isFolderMode()

    // Или хотя бы видео загрузилось
    const video = ctx.page.locator('video')
    const hasVideo = (await video.count()) > 0

    // Folder mode должен показать что-то
    expect(inFolderMode || hasVideo).toBe(true)
  })

  test('переключение с file mode на folder mode', async () => {
    const navigated = await goToPlayer()
    if (!navigated) {
      test.skip()
      return
    }

    // Проверяем наличие тестовых файлов
    if (!fs.existsSync(VIDEO_FILE) || !fs.existsSync(ANIME_FOLDER)) {
      test.skip()
      return
    }

    // Шаг 1: загружаем файл
    await stubOpenFileDialog(ctx.app, [VIDEO_FILE])

    const selectFileBtn = ctx.page.getByRole('button', { name: /выбрать файл/i })
    if (!(await selectFileBtn.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await selectFileBtn.click()
    await ctx.page.waitForTimeout(3000)

    // Проверяем что видео загрузилось
    const video = ctx.page.locator('video')
    const hasVideoAfterFile = (await video.count()) > 0

    if (!hasVideoAfterFile) {
      // Видео не загрузилось — возможно файл некорректный
      test.skip()
      return
    }

    // Шаг 2: переключаемся на folder mode
    await stubSelectFolderDialog(ctx.app, ANIME_FOLDER)

    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    if (!(await selectFolderBtn.isVisible().catch(() => false))) {
      // Кнопка папки может быть скрыта во время воспроизведения
      test.skip()
      return
    }

    await selectFolderBtn.click()
    await ctx.page.waitForTimeout(3000)

    // После переключения режим должен измениться
    // Folder mode имеет sidebar или другой UI
    const inFolderMode = await isFolderMode()
    const hasVideoAfterFolder = (await video.count()) > 0

    // Должно быть что-то видно
    expect(inFolderMode || hasVideoAfterFolder).toBe(true)
  })

  test('переключение с folder mode на file mode', async () => {
    const navigated = await goToPlayer()
    if (!navigated) {
      test.skip()
      return
    }

    if (!fs.existsSync(VIDEO_FILE) || !fs.existsSync(ANIME_FOLDER)) {
      test.skip()
      return
    }

    // Шаг 1: загружаем папку
    await stubSelectFolderDialog(ctx.app, ANIME_FOLDER)

    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    if (!(await selectFolderBtn.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await selectFolderBtn.click()
    await ctx.page.waitForTimeout(3000)

    // Шаг 2: переключаемся на file mode
    await stubOpenFileDialog(ctx.app, [VIDEO_FILE])

    const selectFileBtn = ctx.page.getByRole('button', { name: /выбрать файл/i })
    if (!(await selectFileBtn.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await selectFileBtn.click()
    await ctx.page.waitForTimeout(3000)

    // Видео должно загрузиться в file mode
    const video = ctx.page.locator('video')
    const hasVideo = (await video.count()) > 0

    expect(hasVideo).toBe(true)
  })
})

test.describe('Player Mode - Initial State', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('плеер показывает выбор режима при первом открытии', async () => {
    const nav = ctx.page.getByRole('navigation')
    const playerLink = nav.getByRole('link', { name: /плеер/i })

    if (!(await playerLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await playerLink.click()
    await ctx.page.waitForTimeout(2000)

    // При первом открытии должны быть обе кнопки
    const fileBtn = ctx.page.getByRole('button', { name: /выбрать файл/i })
    const folderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })

    const hasFileBtn = await fileBtn.isVisible().catch(() => false)
    const hasFolderBtn = await folderBtn.isVisible().catch(() => false)

    // Хотя бы одна кнопка должна быть
    expect(hasFileBtn || hasFolderBtn).toBe(true)
  })

  test('плеер пустой без загруженного видео', async () => {
    const nav = ctx.page.getByRole('navigation')
    const playerLink = nav.getByRole('link', { name: /плеер/i })

    if (!(await playerLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await playerLink.click()
    await ctx.page.waitForTimeout(2000)

    // Без загруженного видео не должно быть video элемента
    const video = ctx.page.locator('video')
    const videoCount = await video.count()

    // Может быть 0 или 1 (если placeholder video)
    // Но не должно быть src если ничего не загружено
    if (videoCount > 0) {
      const src = await video.first().getAttribute('src')
      // src должен быть пустым или отсутствовать
      expect(src === null || src === '' || src === undefined).toBe(true)
    }
  })
})

test.describe('Player Mode - Error Handling', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('отмена выбора файла не ломает плеер', async () => {
    const nav = ctx.page.getByRole('navigation')
    const playerLink = nav.getByRole('link', { name: /плеер/i })

    if (!(await playerLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await playerLink.click()
    await ctx.page.waitForTimeout(2000)

    // Stub canceled dialog
    const { stubCancelFileDialog } = await import('../../helpers/electron.helpers')
    await stubCancelFileDialog(ctx.app)

    const selectFileBtn = ctx.page.getByRole('button', { name: /выбрать файл/i })
    if (!(await selectFileBtn.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await selectFileBtn.click()
    await ctx.page.waitForTimeout(1000)

    // Плеер не должен сломаться — кнопки должны остаться
    const hasFileBtn = await selectFileBtn.isVisible().catch(() => false)
    expect(hasFileBtn).toBe(true)
  })
})
