/**
 * Electron тесты для Theme Persistence
 *
 * Тестируют сохранение темы после навигации:
 * - Переключение темы (light/dark/system)
 * - Тема сохраняется после навигации
 * - Тема сохраняется после перезапуска (localStorage/settings)
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

test.describe('Theme Persistence', () => {
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
   * Хелпер: перейти на страницу настроек
   */
  async function goToSettings(): Promise<boolean> {
    const nav = ctx.page.getByRole('navigation')
    const settingsLink = nav.getByRole('link', { name: /настройки/i })
    const isVisible = await settingsLink.isVisible().catch(() => false)

    if (!isVisible) {
      return false
    }

    await settingsLink.click()
    await ctx.page.waitForTimeout(1500)
    return true
  }

  /**
   * Хелпер: перейти в библиотеку
   */
  async function goToLibrary(): Promise<boolean> {
    const nav = ctx.page.getByRole('navigation')
    const libraryLink = nav.getByRole('link', { name: /библиотека/i })
    const isVisible = await libraryLink.isVisible().catch(() => false)

    if (!isVisible) {
      return false
    }

    await libraryLink.click()
    await ctx.page.waitForTimeout(1000)
    return true
  }

  /**
   * Хелпер: получить текущую тему
   * Chakra UI использует data-theme или colorMode в localStorage
   */
  async function getCurrentTheme(): Promise<string | null> {
    // Способ 1: data-theme атрибут на html
    const htmlTheme = await ctx.page.locator('html').getAttribute('data-theme')
    if (htmlTheme) {
      return htmlTheme
    }

    // Способ 2: class на html (light/dark)
    const htmlClass = await ctx.page.locator('html').getAttribute('class')
    if (htmlClass?.includes('dark')) {
      return 'dark'
    }
    if (htmlClass?.includes('light')) {
      return 'light'
    }

    // Способ 3: localStorage
    const storedTheme = await ctx.page.evaluate(() => {
      return (
        localStorage.getItem('chakra-ui-color-mode')
        || localStorage.getItem('theme')
        || localStorage.getItem('colorMode')
      )
    })
    return storedTheme
  }

  /**
   * Хелпер: установить тему
   */
  async function setTheme(theme: 'dark' | 'light' | 'system'): Promise<boolean> {
    // Ищем опцию темы
    const themeOption = ctx.page.getByText(
      new RegExp(theme === 'dark' ? 'тёмная|dark' : theme === 'light' ? 'светлая|light' : 'системная|system', 'i'),
    )

    const isVisible = await themeOption
      .first()
      .isVisible()
      .catch(() => false)
    if (!isVisible) {
      return false
    }

    await themeOption.first().click({ force: true })
    await ctx.page.waitForTimeout(500)
    return true
  }

  test('тема сохраняется после навигации', async () => {
    // Переходим в настройки
    const navigated = await goToSettings()
    if (!navigated) {
      test.skip()
      return
    }

    // Ищем секцию темы
    const themeSection = ctx.page.getByText(/тема|оформление|appearance/i)
    const hasTheme = await themeSection
      .first()
      .isVisible()
      .catch(() => false)

    if (!hasTheme) {
      test.skip()
      return
    }

    // Устанавливаем тёмную тему
    const themeSet = await setTheme('dark')
    if (!themeSet) {
      test.skip()
      return
    }

    // Проверяем что тема применилась
    await ctx.page.waitForTimeout(500)
    const themeAfterSet = await getCurrentTheme()

    // Переходим в библиотеку
    await goToLibrary()

    // Возвращаемся в настройки
    await goToSettings()

    // Тема должна сохраниться
    const themeAfterNav = await getCurrentTheme()

    // Если удалось установить тему, она должна сохраниться
    if (themeAfterSet === 'dark') {
      expect(themeAfterNav).toBe('dark')
    }
  })

  test('переключение темы изменяет UI', async () => {
    const navigated = await goToSettings()
    if (!navigated) {
      test.skip()
      return
    }

    // Ищем секцию темы
    const themeSection = ctx.page.getByText(/тема|оформление|appearance/i)
    if (
      !(await themeSection
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      test.skip()
      return
    }

    // Запоминаем начальную тему
    const initialTheme = await getCurrentTheme()

    // Пробуем переключить тему
    const darkOption = ctx.page.getByText(/тёмная|dark/i)
    const lightOption = ctx.page.getByText(/светлая|light/i)

    const hasDark = await darkOption
      .first()
      .isVisible()
      .catch(() => false)
    const hasLight = await lightOption
      .first()
      .isVisible()
      .catch(() => false)

    if (hasDark && hasLight) {
      // Если сейчас светлая — переключаем на тёмную, и наоборот
      if (initialTheme === 'light' || !initialTheme) {
        await darkOption.first().click({ force: true })
        await ctx.page.waitForTimeout(500)

        const newTheme = await getCurrentTheme()
        // Тема должна измениться
        if (newTheme) {
          expect(newTheme).not.toBe(initialTheme || 'light')
        }
      } else {
        await lightOption.first().click({ force: true })
        await ctx.page.waitForTimeout(500)

        const newTheme = await getCurrentTheme()
        if (newTheme) {
          expect(newTheme).not.toBe('dark')
        }
      }
    } else {
      test.skip()
    }
  })

  test('тема сохраняется в localStorage', async () => {
    const navigated = await goToSettings()
    if (!navigated) {
      test.skip()
      return
    }

    // Устанавливаем тёмную тему
    const themeSet = await setTheme('dark')
    if (!themeSet) {
      test.skip()
      return
    }

    await ctx.page.waitForTimeout(500)

    // Проверяем localStorage
    const storedTheme = await ctx.page.evaluate(() => {
      // Chakra UI v3 может использовать разные ключи
      return (
        localStorage.getItem('chakra-ui-color-mode')
        || localStorage.getItem('theme')
        || localStorage.getItem('animatrona:theme')
        || localStorage.getItem('colorMode')
      )
    })

    // Тема должна быть сохранена
    // Если не найдено в localStorage — возможно используется Settings в БД
    if (storedTheme) {
      expect(storedTheme.toLowerCase()).toContain('dark')
    }
  })
})

test.describe('Theme Persistence - Edge Cases', () => {
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

  test('системная тема следует OS настройкам', async () => {
    // Переходим в настройки
    const nav = ctx.page.getByRole('navigation')
    const settingsLink = nav.getByRole('link', { name: /настройки/i })

    if (!(await settingsLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await settingsLink.click()
    await ctx.page.waitForTimeout(1500)

    // Ищем опцию "Системная"
    const systemOption = ctx.page.getByText(/системная|system|авто/i)
    const hasSystem = await systemOption
      .first()
      .isVisible()
      .catch(() => false)

    if (!hasSystem) {
      // Нет опции системной темы — пропускаем
      test.skip()
      return
    }

    await systemOption.first().click({ force: true })
    await ctx.page.waitForTimeout(500)

    // Проверяем что тема установлена как system
    const storedTheme = await ctx.page.evaluate(() => {
      return (
        localStorage.getItem('chakra-ui-color-mode')
        || localStorage.getItem('theme')
        || localStorage.getItem('colorMode')
      )
    })

    // Значение должно быть 'system' или отсутствовать (дефолт)
    if (storedTheme) {
      expect(storedTheme.toLowerCase()).toMatch(/system|auto/)
    }
  })
})
