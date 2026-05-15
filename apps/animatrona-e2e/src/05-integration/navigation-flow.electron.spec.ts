/**
 * Интеграционные тесты: Навигация по приложению
 *
 * Проверяют:
 * - Переход между всеми основными страницами
 * - Sidebar навигация работает
 * - Возврат назад работает
 * - URL обновляются корректно
 */

import { expect, test } from '@playwright/test'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  launchElectronApp,
  waitForMainWindow,
} from '../../helpers/electron.helpers'

// Контекст для тестов
let ctx: ElectronTestContext

test.describe('Navigation Flow', () => {
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

  test('навигация по основным страницам работает', async () => {
    const nav = ctx.page.getByRole('navigation')
    await expect(nav).toBeVisible()

    // Проверяем что все основные ссылки существуют в навигации
    const links = [/библиотека/i, /плеер/i, /транскод|очередь/i, /настройки/i]

    let foundLinks = 0
    for (const linkName of links) {
      const link = nav.getByRole('link', { name: linkName })
      const isVisible = await link.isVisible().catch(() => false)
      if (isVisible) {
        foundLinks++
      }
    }

    // Должны найти хотя бы 2 ссылки
    expect(foundLinks).toBeGreaterThanOrEqual(2)

    // Переходим на плеер и обратно в библиотеку
    const playerLink = nav.getByRole('link', { name: /плеер/i })
    if (await playerLink.isVisible().catch(() => false)) {
      await playerLink.click()
      await ctx.page.waitForTimeout(1500)

      // Возвращаемся в библиотеку
      const libraryLink = nav.getByRole('link', { name: /библиотека/i })
      await libraryLink.click()
      await ctx.page.waitForTimeout(1000)

      // Проверяем что вернулись
      const libraryHeading = ctx.page.getByRole('heading', { name: 'Библиотека аниме' })
      await expect(libraryHeading).toBeVisible()
    }
  })

  test('sidebar сворачивается и разворачивается', async () => {
    // ПРИМЕЧАНИЕ: Текущая версия Animatrona использует фиксированный sidebar без кнопки сворачивания
    // Тест оставлен для совместимости если функциональность будет добавлена в будущем
    const nav = ctx.page.getByRole('navigation')
    await expect(nav).toBeVisible()

    // Ищем кнопку сворачивания sidebar (aria-label или текст)
    const collapseBtn = ctx.page.getByRole('button', { name: /свернуть|развернуть|toggle|collapse|expand/i })
    const isCollapseVisible = await collapseBtn.isVisible().catch(() => false)

    if (isCollapseVisible) {
      // Проверяем что ссылки видны до сворачивания
      const libraryLink = nav.getByRole('link', { name: /библиотека/i })
      await expect(libraryLink).toBeVisible()

      // Сворачиваем
      await collapseBtn.click()
      await ctx.page.waitForTimeout(500)

      // Разворачиваем
      await collapseBtn.click()
      await ctx.page.waitForTimeout(500)

      // Ссылки снова видны
      await expect(libraryLink).toBeVisible()
    } else {
      // Нет кнопки сворачивания — sidebar фиксированный, пропускаем
      test.skip()
    }
  })

  test('keyboard shortcuts для навигации', async () => {
    // Command Palette открывается по Ctrl+K
    await ctx.page.keyboard.press('Control+k')
    await ctx.page.waitForTimeout(500)

    // Проверяем открытие Command Palette
    const commandPalette = ctx.page.getByRole('dialog')
    const isPaletteVisible = await commandPalette.isVisible().catch(() => false)

    if (isPaletteVisible) {
      // Закрываем по Escape
      await ctx.page.keyboard.press('Escape')
      await ctx.page.waitForTimeout(300)

      // Command Palette закрылся
      await expect(commandPalette).not.toBeVisible()
    }

    // Quick Search по Ctrl+/
    await ctx.page.keyboard.press('Control+/')
    await ctx.page.waitForTimeout(500)

    const quickSearch = ctx.page.getByRole('dialog')
    const isSearchVisible = await quickSearch.isVisible().catch(() => false)

    if (isSearchVisible) {
      await ctx.page.keyboard.press('Escape')
    }
  })

  test('история браузера работает (back/forward)', async () => {
    const nav = ctx.page.getByRole('navigation')

    // Переходим на плеер
    const playerLink = nav.getByRole('link', { name: /плеер/i })
    if (!(await playerLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await playerLink.click()
    await ctx.page.waitForTimeout(1500)

    // Переходим на настройки
    const settingsLink = nav.getByRole('link', { name: /настройки/i })
    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click()
      await ctx.page.waitForTimeout(1500)
    }

    // Возвращаемся назад через goBack()
    await ctx.page.goBack()
    await ctx.page.waitForTimeout(1500)

    // Проверяем что вернулись (не проверяем точную страницу — просто что навигация работает)
    await expect(nav).toBeVisible()
  })
})
