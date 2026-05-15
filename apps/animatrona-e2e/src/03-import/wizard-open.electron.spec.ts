/**
 * Import тесты: Открытие Import Wizard
 *
 * Проверяют:
 * - Кнопка "Импорт видео" открывает wizard
 * - Выбор папки показывает распознанное название
 * - Закрытие wizard работает корректно
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

// Контекст для тестов
let ctx: ElectronTestContext

test.describe('Import Wizard', () => {
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

  test('кнопка "Импорт видео" открывает wizard', async () => {
    // Находим кнопку "Импорт видео" (в пустом состоянии библиотеки)
    const importButton = ctx.page.getByRole('button', { name: 'Импорт видео' })
    await expect(importButton).toBeVisible({ timeout: 10000 })

    // Кликаем
    await importButton.click()

    // Wizard должен открыться (Dialog с заголовком "Импорт видео")
    const dialog = ctx.page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Проверяем заголовок
    const dialogTitle = dialog.getByText('Импорт видео', { exact: true })
    await expect(dialogTitle).toBeVisible()

    // Должны быть кнопки "Выбрать папку" и "Выбрать файл"
    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    const selectFileBtn = ctx.page.getByRole('button', { name: /выбрать файл/i })

    await expect(selectFolderBtn).toBeVisible()
    await expect(selectFileBtn).toBeVisible()
  })

  test('выбор папки показывает распознанное название', async () => {
    // Путь к тестовой папке с файлами аниме
    const animeFolderPath = getFixturesPath('anime-folder')

    // Stub диалог выбора папки
    await stubSelectFolderDialog(ctx.app, animeFolderPath)

    // Открываем wizard
    const importButton = ctx.page.getByRole('button', { name: 'Импорт видео' })
    await importButton.click()

    // Ждём появления wizard
    const dialog = ctx.page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Кликаем "Выбрать папку"
    const selectFolderBtn = ctx.page.getByRole('button', { name: /выбрать папку/i })
    await selectFolderBtn.click()

    // Ждём появления распознанного названия
    // parseFolderName парсит имя папки "anime-folder" → "anime folder"
    // (имена файлов [TestSub] Test Anime - 01.mkv используются для эпизодов)
    const recognizedName = ctx.page.getByText('anime folder')
    await expect(recognizedName).toBeVisible({ timeout: 10000 })

    // Должен появиться текст "Распознанное название:"
    const recognizedLabel = ctx.page.getByText(/распознанное название/i)
    await expect(recognizedLabel).toBeVisible()

    // Кнопка "Далее" должна стать активной
    const nextButton = ctx.page.getByRole('button', { name: /далее/i })
    await expect(nextButton).toBeEnabled()
  })

  test('закрытие wizard работает корректно', async () => {
    // Открываем wizard
    const importButton = ctx.page.getByRole('button', { name: 'Импорт видео' })
    await importButton.click()

    const dialog = ctx.page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Кликаем "Отмена"
    const cancelButton = ctx.page.getByRole('button', { name: 'Отмена' })
    await cancelButton.click()

    // Диалог должен закрыться
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    // Wizard можно открыть снова
    await importButton.click()
    await expect(dialog).toBeVisible({ timeout: 5000 })
  })
})
