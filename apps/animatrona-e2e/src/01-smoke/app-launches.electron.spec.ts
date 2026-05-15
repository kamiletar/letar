/**
 * Smoke тесты: запуск Electron приложения Animatrona.
 *
 * Проверяют базовую работоспособность:
 * - Приложение запускается без ошибок
 * - Главное окно отображается
 * - Базовая навигация работает
 */

import { expect, test } from '@playwright/test'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  getAppVersion,
  launchElectronApp,
  waitForMainWindow,
} from '../../helpers/electron.helpers'

// Контекст для тестов
let ctx: ElectronTestContext

test.describe('Запуск приложения', () => {
  // Проверяем наличие production build перед всеми тестами
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
      console.log('Run "bun nx build:win animatrona" first')
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('приложение запускается без ошибок', async () => {
    // Проверяем что page существует
    expect(ctx.page).toBeDefined()

    // Проверяем версию приложения
    const version = await getAppVersion(ctx.app)
    expect(version).toMatch(/^\d+\.\d+\.\d+/)
    console.log(`App version: ${version}`)
  })

  test('главное окно загружается после splash screen', async () => {
    // Ждём загрузки main window
    await waitForMainWindow(ctx, 60000)

    // Проверяем наличие sidebar (признак загруженного UI)
    const sidebar = ctx.page.getByRole('navigation')
    await expect(sidebar).toBeVisible()
  })

  test('отображается пустое состояние библиотеки', async () => {
    await waitForMainWindow(ctx, 60000)

    // На чистой установке библиотека пуста
    // Кнопка "Импорт видео" должна быть видна
    const importButton = ctx.page.getByRole('button', { name: 'Импорт видео' })
    await expect(importButton).toBeVisible({ timeout: 10000 })

    // Также должен быть текст "0 тайтлов в коллекции"
    const emptyText = ctx.page.getByText('0 тайтлов в коллекции')
    await expect(emptyText).toBeVisible()
  })

  test('навигация в настройки работает', async () => {
    await waitForMainWindow(ctx, 60000)

    // Ищем ссылку на настройки в sidebar
    const settingsLink = ctx.page.getByRole('link', { name: /настройки/i })
    await expect(settingsLink).toBeVisible()

    // Переходим в настройки
    await settingsLink.click()

    // Проверяем что страница настроек загрузилась
    await expect(ctx.page).toHaveURL(/.*settings.*/)

    // Должны быть табы настроек
    const tabList = ctx.page.getByRole('tablist')
    await expect(tabList).toBeVisible({ timeout: 10000 })

    // Первый таб "Библиотека" должен быть выбран
    const libraryTab = ctx.page.getByRole('tab', { name: /библиотека/i })
    await expect(libraryTab).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Окно приложения', () => {
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

  test('кнопки управления окном работают', async () => {
    // Frameless окно имеет кастомные кнопки (ищем по тексту/роли)
    const minimizeBtn = ctx.page.getByRole('button', { name: /свернуть/i })
    const maximizeBtn = ctx.page.getByRole('button', { name: /развернуть/i })
    const closeBtn = ctx.page.getByRole('button', { name: /закрыть/i })

    // Проверяем видимость кнопок
    await expect(minimizeBtn).toBeVisible()
    await expect(maximizeBtn).toBeVisible()
    await expect(closeBtn).toBeVisible()
  })
})
