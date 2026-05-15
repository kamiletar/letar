/**
 * E2E тесты для системы автообновлений Animatrona
 *
 * Проверяют:
 * - Отображение UpdateBadge при доступном обновлении
 * - Открытие UpdateDrawer с changelog
 * - Прогресс загрузки
 * - Настройки обновлений в Settings
 * - Управление пропущенными версиями
 */

import { expect, test } from '@playwright/test'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  launchElectronApp,
  waitForMainWindow,
} from '../../helpers/electron.helpers'

let ctx: ElectronTestContext

test.describe('Система автообновлений', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
      console.log('Run "bun nx build:win animatrona" first')
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('UpdateBadge отображается при доступном обновлении', async () => {
    // Ждём полной загрузки страницы
    await ctx.page.waitForLoadState('networkidle')

    // Симулируем доступное обновление через Zustand setState
    await ctx.page.evaluate(() => {
      const updateInfo = {
        version: '1.5.0',
        releaseDate: new Date().toISOString(),
        releaseNotes: 'Тестовые изменения для E2E',
      }

      // Используем setState() вместо getState().setStatus()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: доступ к store через window в browser context
      const updateStore = (window as any).useUpdateStore
      if (updateStore) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: Zustand setState в browser context
        updateStore.setState((state: any) => ({
          status: {
            ...state.status,
            status: 'available',
            updateInfo,
            downloadProgress: 0,
            error: null,
            downloadSpeed: 0,
            downloadEta: 0,
          },
        }))
      }
    })

    // Ждём React ререндер (увеличенный таймаут)
    await ctx.page.waitForTimeout(1000)

    // Проверяем, что badge появился в Header (увеличенный таймаут)
    const badge = ctx.page.locator('button[aria-label="Проверить обновление"]')
    await expect(badge).toBeVisible({ timeout: 10000 })

    // Проверяем наличие анимации pulse (фиолетовая точка)
    const badgeDot = badge.locator('span').first()
    await expect(badgeDot).toBeVisible()
  })

  test('UpdateDrawer открывается при клике на badge', async () => {
    // Ждём полной загрузки страницы
    await ctx.page.waitForLoadState('networkidle')

    // Симулируем доступное обновление
    await ctx.page.evaluate(() => {
      const updateInfo = {
        version: '1.5.0',
        releaseDate: new Date().toISOString(),
        releaseNotes: 'Новые функции и исправления',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: доступ к store через window в browser context
      const updateStore = (window as any).useUpdateStore
      if (updateStore) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: Zustand setState в browser context
        updateStore.setState((state: any) => ({
          status: {
            ...state.status,
            status: 'available',
            updateInfo,
            downloadProgress: 0,
            error: null,
            downloadSpeed: 0,
            downloadEta: 0,
          },
        }))
      }
    })

    await ctx.page.waitForTimeout(1000)

    // Кликаем на badge
    const badge = ctx.page.locator('button[aria-label="Проверить обновление"]')
    await expect(badge).toBeVisible({ timeout: 10000 })
    await badge.click()

    // Проверяем, что drawer открылся
    const drawer = ctx.page.getByRole('dialog')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    // Проверяем заголовок
    const drawerTitle = drawer.getByText('Обновление приложения')
    await expect(drawerTitle).toBeVisible()

    // Проверяем версию в drawer
    const versionText = drawer.getByText(/Animatrona v1\.5\.0/i)
    await expect(versionText).toBeVisible()

    // Проверяем наличие кнопки "Скачать"
    const downloadButton = drawer.getByRole('button', { name: /скачать/i })
    await expect(downloadButton).toBeVisible()
  })

  test('Прогресс загрузки отображается корректно', async () => {
    // Ждём полной загрузки страницы
    await ctx.page.waitForLoadState('networkidle')

    // Симулируем статус загрузки
    await ctx.page.evaluate(() => {
      const updateInfo = {
        version: '1.5.0',
        releaseDate: new Date().toISOString(),
        releaseNotes: 'Тестовое обновление',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: доступ к store через window в browser context
      const updateStore = (window as any).useUpdateStore
      if (updateStore) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: Zustand setState в browser context
        updateStore.setState((state: any) => ({
          status: {
            ...state.status,
            status: 'downloading',
            updateInfo,
            downloadProgress: 45.5,
            error: null,
            downloadSpeed: 2097152, // 2 МБ/с
            downloadEta: 15,
          },
        }))
      }
    })

    await ctx.page.waitForTimeout(1000)

    // Проверяем наличие глобального прогресс-индикатора
    const progressBar = ctx.page.locator('[role="progressbar"]').first()
    await expect(progressBar).toBeVisible({ timeout: 10000 })

    // Открываем drawer чтобы увидеть детальный прогресс
    const badge = ctx.page.locator('button[aria-label="Проверить обновление"]')
    await expect(badge).toBeVisible({ timeout: 10000 })
    await badge.click()

    const drawer = ctx.page.getByRole('dialog')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    // Проверяем текст "Загрузка..." (точное совпадение, чтобы не матчить Badge)
    const loadingText = drawer.getByText('Загрузка...')
    await expect(loadingText).toBeVisible()

    // Проверяем процент
    const percentText = drawer.getByText(/45/)
    await expect(percentText).toBeVisible()

    // Проверяем скорость загрузки
    const speedText = drawer.getByText(/2\.0 МБ\/с/i)
    await expect(speedText).toBeVisible()
  })

  test('Статус "Готово к установке" отображается', async () => {
    // Ждём полной загрузки страницы
    await ctx.page.waitForLoadState('networkidle')

    // Симулируем загруженное обновление
    await ctx.page.evaluate(() => {
      const updateInfo = {
        version: '1.5.0',
        releaseDate: new Date().toISOString(),
        releaseNotes: 'Обновление загружено',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: доступ к store через window в browser context
      const updateStore = (window as any).useUpdateStore
      if (updateStore) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: Zustand setState в browser context
        updateStore.setState((state: any) => ({
          status: {
            ...state.status,
            status: 'downloaded',
            updateInfo,
            downloadProgress: 100,
            error: null,
            downloadSpeed: 0,
            downloadEta: 0,
          },
        }))
      }
    })

    await ctx.page.waitForTimeout(1000)

    // Badge должен быть зелёным (downloaded)
    const badge = ctx.page.locator('button[aria-label="Проверить обновление"]')
    await expect(badge).toBeVisible({ timeout: 10000 })

    // Открываем drawer
    await badge.click()

    const drawer = ctx.page.getByRole('dialog')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    // Проверяем текст "Готово к установке"
    const readyText = drawer.getByText(/готово к установке/i)
    await expect(readyText).toBeVisible()

    // Проверяем кнопку "Установить сейчас"
    const installButton = drawer.getByRole('button', { name: /установить сейчас/i })
    await expect(installButton).toBeVisible()
  })

  test('Настройки обновлений в Settings работают', async () => {
    // Переходим в настройки
    const settingsLink = ctx.page.getByRole('link', { name: /настройки/i })
    await settingsLink.click()

    await expect(ctx.page).toHaveURL(/.*settings.*/)

    // Ищем таб "Приложение"
    const appTab = ctx.page.getByRole('tab', { name: /приложение/i })
    await expect(appTab).toBeVisible({ timeout: 10000 })

    // Переключаемся на таб приложения
    await appTab.click()

    // Ждём загрузки контента таба
    await ctx.page.waitForTimeout(500)

    // Проверяем наличие карточки обновлений
    const updatesHeading = ctx.page.getByRole('heading', { name: 'Обновления' })
    await expect(updatesHeading).toBeVisible()

    // Проверяем наличие текущей версии
    const versionBadge = ctx.page.getByText(/^v\d+\.\d+\.\d+/)
    await expect(versionBadge).toBeVisible()

    // Проверяем наличие настроек (ищем по заголовку "Настройки" внутри карточки)
    const settingsHeading = ctx.page.getByRole('heading', { name: 'Настройки' })
    await expect(settingsHeading).toBeVisible()

    // Проверяем наличие текстов настроек
    const autoCheckText = ctx.page.getByText('Автоматически проверять')
    const autoDownloadText = ctx.page.getByText('Автоматически скачивать')
    const notificationsText = ctx.page.getByText('Показывать уведомления')

    await expect(autoCheckText).toBeVisible()
    await expect(autoDownloadText).toBeVisible()
    await expect(notificationsText).toBeVisible()

    // Находим checkboxes на основе aria-labelledby (Chakra UI v3 привязывает checkbox к label)
    // Каждый Switch.Root содержит label и checkbox с уникальными id
    const allCheckboxes = ctx.page.locator('input[type="checkbox"]')
    const visibleCheckboxes = await allCheckboxes.count()

    // Проверяем что есть минимум 3 checkbox (может быть больше если есть другие настройки)
    expect(visibleCheckboxes).toBeGreaterThanOrEqual(3)

    // Проверяем кнопку "Проверить обновления"
    const checkButton = ctx.page.getByRole('button', { name: /проверить обновления/i })
    await expect(checkButton).toBeVisible()
  })

  test('Переключение настроек обновлений сохраняется', async () => {
    // Переходим в настройки
    const settingsLink = ctx.page.getByRole('link', { name: /настройки/i })
    await settingsLink.click()

    const appTab = ctx.page.getByRole('tab', { name: /приложение/i })
    await appTab.click()

    // Ждём загрузки контента таба
    await ctx.page.waitForTimeout(500)

    // Находим секцию настроек по заголовку "Настройки"
    const settingsSection = ctx.page
      .locator('div')
      .filter({ has: ctx.page.getByRole('heading', { name: 'Настройки' }) })
      .first()

    // Находим родительский HStack, который содержит текст "Показывать уведомления"
    const notificationsRow = settingsSection.locator('div').filter({
      has: ctx.page.locator('text="Показывать уведомления"'),
    })

    // Находим checkbox внутри этого HStack
    const notificationsCheckbox = notificationsRow.locator('input[type="checkbox"]').first()

    // Ждём появления checkbox
    await expect(notificationsCheckbox).toBeVisible({ timeout: 10000 })

    // Получаем текущее состояние checkbox
    const initialState = await notificationsCheckbox.isChecked()

    // Кликаем на Switch.Control (видимый элемент переключателя)
    // Используем data-scope="switch" и data-part="control" от Chakra UI
    const switchControl = notificationsRow.locator('[data-scope="switch"][data-part="control"]').first()
    await switchControl.click({ force: true })
    await ctx.page.waitForTimeout(300)

    // Проверяем, что состояние изменилось
    const newState = await notificationsCheckbox.isChecked()
    expect(newState).not.toBe(initialState)

    // Переключаем обратно
    await switchControl.click({ force: true })
    await ctx.page.waitForTimeout(300)

    // Проверяем, что вернулось к начальному состоянию
    const finalState = await notificationsCheckbox.isChecked()
    expect(finalState).toBe(initialState)
  })

  test('Кнопка "Пропустить версию" работает', async () => {
    // Ждём полной загрузки страницы
    await ctx.page.waitForLoadState('networkidle')

    // Симулируем доступное обновление
    await ctx.page.evaluate(() => {
      const updateInfo = {
        version: '1.5.0',
        releaseDate: new Date().toISOString(),
        releaseNotes: 'Тестовое обновление',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: доступ к store через window в browser context
      const updateStore = (window as any).useUpdateStore
      if (updateStore) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E: Zustand setState в browser context
        updateStore.setState((state: any) => ({
          status: {
            ...state.status,
            status: 'available',
            updateInfo,
            downloadProgress: 0,
            error: null,
            downloadSpeed: 0,
            downloadEta: 0,
          },
        }))
      }
    })

    await ctx.page.waitForTimeout(1000)

    // Открываем drawer
    const badge = ctx.page.locator('button[aria-label="Проверить обновление"]')
    await expect(badge).toBeVisible({ timeout: 10000 })
    await badge.click()

    const drawer = ctx.page.getByRole('dialog')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    // Кликаем "Пропустить версию"
    const skipButton = drawer.getByRole('button', { name: /пропустить версию/i })
    await expect(skipButton).toBeVisible()
    await skipButton.click()

    // Drawer должен закрыться
    await expect(drawer).not.toBeVisible({ timeout: 2000 })

    // Badge больше не должен быть виден (версия пропущена)
    await ctx.page.waitForTimeout(500)
    await expect(badge).not.toBeVisible()
  })
})
