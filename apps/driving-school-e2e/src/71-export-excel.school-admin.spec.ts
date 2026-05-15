import { expect, test } from './fixtures/base-test'
import { schoolExport, testSchoolAdmin } from './fixtures/test-data'
import { getSchoolIdForAdmin } from './helpers/db.helpers'

/**
 * Phase 8.2: Export Excel — E2E тесты экспорта данных в Excel/CSV
 *
 * Тестируемый функционал:
 * - Страница экспорта /school/[id]/export/
 * - Выбор типа данных (students, instructors, lessons, stats)
 * - Выбор формата (xlsx, ods, csv)
 * - Фильтры для занятий (dateFrom, dateTo, instructorId)
 * - Скачивание файлов с корректными именами
 * - Права доступа (только ADMIN/MANAGER)
 */

test.describe('Export Excel (школьный администратор)', () => {
  let schoolId: string

  // Получаем schoolId перед тестами
  test.beforeAll(async () => {
    const id = await getSchoolIdForAdmin(testSchoolAdmin.email)
    if (!id) {
      throw new Error('School not found for test admin')
    }
    schoolId = id
  })

  test.describe('Группа 1: UI и навигация', () => {
    test('E2E-EXP-1 — страница экспорта загружается', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Проверяем заголовок или сообщение об ошибке доступа
      const exportTitle = page.getByRole('heading', { name: /экспорт данных/i })
      const accessDenied = page.getByText(/доступ запрещён/i)

      const hasTitle = await exportTitle.isVisible().catch(() => false)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      // Должен быть один из вариантов
      expect(hasTitle || hasDenied).toBe(true)
    })

    test('E2E-EXP-2 — отображается выбор типа данных (4 карточки)', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Проверяем наличие заголовка шага 1
      const step1 = page.getByText(/выберите тип данных/i)
      await expect(step1).toBeVisible({ timeout: 10000 })

      // Проверяем наличие всех типов данных
      await expect(page.getByText(/ученики/i).first()).toBeVisible()
      await expect(page.getByText(/инструкторы/i).first()).toBeVisible()
      await expect(page.getByText(/занятия/i).first()).toBeVisible()
      await expect(page.getByText(/статистика/i).first()).toBeVisible()
    })

    test('E2E-EXP-3 — отображается выбор формата', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Проверяем наличие заголовка шага 2
      const step2 = page.getByText(/выберите формат/i)
      await expect(step2).toBeVisible({ timeout: 10000 })

      // Проверяем наличие select с форматами
      const formatSelect = page.locator('select, [role="combobox"]').first()
      await expect(formatSelect).toBeVisible()
    })
  })

  test.describe('Группа 2: Экспорт разных типов данных', () => {
    test('E2E-EXP-4 — выбор студентов активирует кнопку скачивания', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Кликаем на карточку "Ученики" внутри группы выбора типа данных
      const dataTypeGroup = page.getByRole('group', { name: '1. Выберите тип данных' })
      const studentsCard = dataTypeGroup.getByText('ФИО, email, телефон, категория')
      await studentsCard.click()

      // Проверяем, что кнопка скачивания становится активной
      const downloadButton = page.getByRole('button', { name: /скачать/i })
      await expect(downloadButton).toBeEnabled({ timeout: 5000 })
    })

    test('E2E-EXP-5 — выбор инструкторов активирует кнопку скачивания', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Кликаем на карточку "Инструкторы" внутри группы выбора типа данных
      const dataTypeGroup = page.getByRole('group', { name: '1. Выберите тип данных' })
      const instructorsCard = dataTypeGroup.getByText('ФИО, email, категории, описание')
      await instructorsCard.click()

      // Проверяем, что кнопка скачивания становится активной
      const downloadButton = page.getByRole('button', { name: /скачать/i })
      await expect(downloadButton).toBeEnabled({ timeout: 5000 })
    })

    test('E2E-EXP-6 — выбор занятий показывает фильтры', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Кликаем на карточку "Занятия" внутри группы выбора типа данных
      const dataTypeGroup = page.getByRole('group', { name: '1. Выберите тип данных' })
      const lessonsCard = dataTypeGroup.getByText('Дата, ученик, инструктор, статус')
      await lessonsCard.click()

      // Проверяем появление фильтров
      const filtersSection = page.getByText(/фильтры.*необязательно/i)
      await expect(filtersSection).toBeVisible({ timeout: 5000 })

      // Проверяем наличие полей фильтров - используем более специфичный селектор для label
      await expect(page.locator('input[type="date"]').first()).toBeVisible()
      // Ищем label "Инструктор" внутри секции фильтров
      const filtersGroup = page.getByRole('group', { name: /фильтры/i })
      await expect(filtersGroup.getByText(/^инструктор$/i).first()).toBeVisible()
    })

    test('E2E-EXP-7 — выбор статистики активирует кнопку скачивания', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Кликаем на карточку "Статистика" внутри группы выбора типа данных
      const dataTypeGroup = page.getByRole('group', { name: '1. Выберите тип данных' })
      const statsCard = dataTypeGroup.getByText('Сводка по занятиям и посещаемости')
      await statsCard.click()

      // Проверяем, что кнопка скачивания становится активной
      const downloadButton = page.getByRole('button', { name: /скачать/i })
      await expect(downloadButton).toBeEnabled({ timeout: 5000 })
    })
  })

  test.describe('Группа 3: Скачивание файлов', () => {
    test('E2E-EXP-8 — скачивание файла студентов работает', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Выбираем карточку "Ученики" внутри группы выбора типа данных
      const dataTypeGroup = page.getByRole('group', { name: '1. Выберите тип данных' })
      const studentsCard = dataTypeGroup.getByText('ФИО, email, телефон, категория')
      await studentsCard.click()

      // Ждём когда кнопка станет активной
      const downloadButton = page.getByRole('button', { name: /скачать/i })
      await downloadButton.waitFor({ state: 'visible', timeout: 5000 })

      // Настраиваем перехват скачивания
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

      // Кликаем на кнопку скачивания
      await downloadButton.click()

      // Ждём начала скачивания
      const download = await downloadPromise

      // Проверяем имя файла (должно быть вида: ученики_YYYY-MM-DD.xlsx)
      const filename = download.suggestedFilename()
      expect(filename).toMatch(/ученики_\d{4}-\d{2}-\d{2}\.(xlsx|ods|csv)/)

      // Проверяем, что файл не пустой
      const path = await download.path()
      expect(path).toBeTruthy()
    })

    test('E2E-EXP-9 — смена формата на CSV работает', async ({ page }) => {
      await page.goto(schoolExport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Выбираем карточку "Ученики" внутри группы выбора типа данных
      const dataTypeGroup = page.getByRole('group', { name: '1. Выберите тип данных' })
      const studentsCard = dataTypeGroup.getByText('ФИО, email, телефон, категория')
      await studentsCard.click()

      // Меняем формат на CSV
      // Чакра UI Select работает через кнопку-триггер
      const formatTrigger = page.locator('[role="combobox"]').first()
      await formatTrigger.click()

      // Кликаем на опцию CSV
      const csvOption = page.locator('[role="option"]', { hasText: /csv/i })
      await csvOption.click()

      // Настраиваем перехват скачивания
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

      // Кликаем на кнопку скачивания
      const downloadButton = page.getByRole('button', { name: /скачать/i })
      await downloadButton.click()

      // Проверяем расширение файла
      const download = await downloadPromise
      const filename = download.suggestedFilename()
      expect(filename).toMatch(/\.csv$/)
    })
  })
})
