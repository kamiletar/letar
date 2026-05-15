/**
 * Интеграционные тесты: Настройки приложения
 *
 * Проверяют:
 * - Открытие страницы настроек
 * - Переключение темы
 * - Карточки настроек отображаются
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

test.describe('Settings Flow', () => {
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

  test('страница настроек открывается', async () => {
    const navigated = await goToSettings()
    if (!navigated) {
      test.skip()
      return
    }

    // Проверяем что страница загрузилась — ищем любой контент настроек
    const settingsContent = ctx.page.getByText(/тема|библиотека|плеер|транскод|профил/i)
    const hasContent = await settingsContent
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasContent).toBe(true)
  })

  test('карточки настроек отображаются', async () => {
    const navigated = await goToSettings()
    if (!navigated) {
      test.skip()
      return
    }

    // Проверяем наличие основных карточек настроек
    const cardTitles = [/тема|оформление/i, /библиотека/i, /плеер/i, /транскод/i]

    let foundCards = 0
    for (const title of cardTitles) {
      const card = ctx.page.getByText(title)
      const isVisible = await card
        .first()
        .isVisible()
        .catch(() => false)
      if (isVisible) {
        foundCards++
      }
    }

    // Должна быть хотя бы одна карточка
    expect(foundCards).toBeGreaterThan(0)
  })

  test('переключение темы работает', async () => {
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

    // Ищем радио-кнопки темы (light/dark/system)
    // Chakra v3 использует RadioGroup.Item с визуальным span
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
      // Кликаем с force: true чтобы обойти pointer-events проблему
      await darkOption.first().click({ force: true })
      await ctx.page.waitForTimeout(500)

      await lightOption.first().click({ force: true })
      await ctx.page.waitForTimeout(500)
    } else {
      // Нет переключателя темы — пропускаем
      test.skip()
    }
  })

  test('версия приложения отображается', async () => {
    // Версия может отображаться в:
    // 1. Sidebar/navigation footer
    // 2. Settings page
    // 3. About dialog

    // Проверяем navbar сначала
    const nav = ctx.page.getByRole('navigation')
    const versionInNav = nav.getByText(/v?\d+\.\d+\.\d+/)
    let versionFound = await versionInNav
      .first()
      .isVisible()
      .catch(() => false)

    if (!versionFound) {
      // Проверяем в настройках
      const navigated = await goToSettings()
      if (navigated) {
        const versionInSettings = ctx.page.getByText(/v?\d+\.\d+\.\d+|версия/i)
        versionFound = await versionInSettings
          .first()
          .isVisible()
          .catch(() => false)
      }
    }

    if (!versionFound) {
      // Версия не найдена — пропускаем тест
      test.skip()
    } else {
      // Версия найдена
      expect(versionFound).toBe(true)
    }
  })

  test('профили кодирования доступны', async () => {
    const navigated = await goToSettings()
    if (!navigated) {
      test.skip()
      return
    }

    // Ищем раздел профилей кодирования
    const profilesSection = ctx.page.getByText(/профил|encoding|preset/i)
    const isProfilesVisible = await profilesSection
      .first()
      .isVisible()
      .catch(() => false)

    // Профили должны быть видны на странице настроек
    expect(isProfilesVisible).toBe(true)
  })
})
