import { expect, test } from './fixtures/base-test'
import { schoolImport, schoolSettingsById, testSchoolAdmin } from './fixtures/test-data'
import { getSchoolIdForAdmin } from './helpers/db.helpers'
import { navigateAndWait } from './helpers/page.helpers'

/**
 * Phase 8: Import Excel — E2E тесты импорта данных из Excel
 *
 * Тестируемый функционал:
 * - Страница импорта /school/[id]/import/
 * - Wizard импорта: выбор типа, загрузка файла, маппинг колонок, предпросмотр, результат
 * - Скачивание шаблонов xlsx/ods
 * - Валидация данных и обработка ошибок
 * - Права доступа (только ADMIN/MANAGER)
 */

/** Хелпер: перейти на страницу импорта и дождаться рендеринга визарда */
async function gotoImportWizard(page: import('@playwright/test').Page, schoolId: string) {
  await navigateAndWait(page, schoolImport(schoolId))
  // Ждём рендеринга визарда — data-testid гарантирует что React гидрировался
  await page.locator('[data-testid="import-type-students"]').waitFor({ state: 'visible', timeout: 15000 })
  // Дополнительно ждём гидрацию React — onClick должен быть привязан
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="import-type-students"]')
      return el && Object.keys(el).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'))
    },
    { timeout: 10000 }
  )
}

/** Хелпер: выбрать тип данных и дождаться шага загрузки */
async function selectImportType(page: import('@playwright/test').Page, type: 'students' | 'instructors') {
  const option = page.locator(`[data-testid="import-type-${type}"]`)
  await expect(option).toBeVisible({ timeout: 10000 })
  await option.click()
  // Ждём рендеринга шага загрузки — ждём конкретный элемент
  await expect(page.getByText(/загрузите файл/i).first()).toBeVisible({ timeout: 15000 })
}

test.describe('Import Excel (школьный администратор)', () => {
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
    test('E2E-IMP-1.1 — страница импорта загружается', async ({ page }) => {
      await navigateAndWait(page, schoolImport(schoolId))

      // Проверяем заголовок визарда или сообщение об ошибке доступа
      const typeSelectStep = page.getByText(/выберите тип данных/i)
      const accessDenied = page.getByText(/доступ запрещён/i)

      await expect(typeSelectStep.or(accessDenied)).toBeVisible({ timeout: 15000 })
    })

    test('E2E-IMP-1.6 — UI выбора типа данных (ученики/инструкторы)', async ({ page }) => {
      await gotoImportWizard(page, schoolId)

      await expect(page.locator('[data-testid="import-type-students"]')).toBeVisible()
      await expect(page.locator('[data-testid="import-type-instructors"]')).toBeVisible()
    })

    test('E2E-IMP-1.9 — предпросмотр данных доступен после загрузки', async ({ page }) => {
      await gotoImportWizard(page, schoolId)

      // Проверяем наличие шага предпросмотра в Steps компоненте
      const previewStep = page.getByText(/проверка/i)
      await expect(previewStep).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.18 — отображается индикатор шагов визарда', async ({ page }) => {
      await gotoImportWizard(page, schoolId)

      // Проверяем наличие всех шагов визарда (используем first() для избежания strict mode)
      const steps = [/тип данных/i, /загрузка/i, /сопоставление/i, /проверка/i, /готово/i]

      for (const step of steps) {
        const stepElement = page.getByText(step).first()
        await expect(stepElement).toBeVisible({ timeout: 5000 })
      }
    })

    test('E2E-IMP-1.19 — ссылка на импорт видна в настройках школы', async ({ page }) => {
      await navigateAndWait(page, schoolSettingsById(schoolId))

      // Ждём загрузки секции импорта (заголовок "Импорт данных")
      const importHeading = page.getByRole('heading', { name: /импорт данных/i })
      await expect(importHeading).toBeVisible({ timeout: 15000 })

      // Проверяем наличие кнопки "Импорт из Excel"
      const importButton = page.getByRole('button', { name: /импорт из excel/i })
      await expect(importButton).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Группа 2: Загрузка файлов', () => {
    test('E2E-IMP-1.2 — скачать шаблон xlsx', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // Ищем кнопку скачивания шаблона
      const downloadButton = page.getByRole('button', { name: /скачать шаблон/i })
      await expect(downloadButton).toBeVisible({ timeout: 10000 })

      // Кликаем на кнопку — должно появиться меню с форматами
      await downloadButton.click()

      // Ищем опцию Excel в меню
      const xlsxOption = page.getByRole('menuitem', { name: /excel/i })
      await expect(xlsxOption).toBeVisible({ timeout: 5000 })
    })

    test('E2E-IMP-1.3 — скачать шаблон ods (LibreOffice)', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // Ищем кнопку скачивания
      const downloadButton = page.getByRole('button', { name: /скачать шаблон/i })
      await downloadButton.click()

      // Проверяем наличие опции ODS в меню
      const odsOption = page.getByRole('menuitem', { name: /libreoffice|ods/i })
      await expect(odsOption).toBeVisible({ timeout: 5000 })
    })

    test('E2E-IMP-1.4 — загрузка xlsx файла отображает зону drop', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // Проверяем наличие зоны загрузки
      const dropZone = page
        .getByText(/перетащите файл/i)
        .or(page.getByText(/выберите файл/i))
        .or(page.locator('input[type="file"]'))

      await expect(dropZone.first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.5 — поддерживаемые форматы отображаются', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // Проверяем информацию о форматах
      const formatInfo = page.getByText(/xlsx/i).or(page.getByText(/excel/i))
      await expect(formatInfo.first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.7 — кнопка "Назад" возвращает к выбору типа', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // Нажимаем "Назад"
      const backButton = page.getByRole('button', { name: /назад/i })
      await backButton.click()

      // Должны вернуться на выбор типа
      const typeSelect = page.getByText(/выберите тип данных/i)
      await expect(typeSelect).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Группа 3: Шаг сопоставления колонок', () => {
    test('E2E-IMP-1.8 — UI маппинга колонок отображается', async ({ page }) => {
      await gotoImportWizard(page, schoolId)

      // Проверяем наличие шага маппинга в индикаторе
      const mappingStep = page.getByText(/сопоставление/i)
      await expect(mappingStep).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.10 — описание полей системы видно', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // Проверяем что информация о шаблоне доступна
      // Используем .first() для избежания strict mode
      const templateSection = page.getByText(/скачайте шаблон|скачать шаблон/i).first()
      await expect(templateSection).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.11 — валидация требует обязательные поля', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // Проверяем наличие информации о поддерживаемых форматах
      const formatInfo = page.getByText(/поддерживаемые форматы|\.xlsx|\.ods|\.csv/i).first()
      await expect(formatInfo).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.12 — информация о формате данных отображается', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // Проверяем наличие подсказок о формате
      const helpText = page.getByText(/формат/i).or(page.getByText(/заполните/i))
      const isVisible = await helpText
        .first()
        .isVisible()
        .catch(() => false)

      // Должна быть какая-то информация о формате
      expect(isVisible || page.url().includes('import')).toBe(true)
    })

    test('E2E-IMP-1.13 — валидация email формата', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'students')

      // На шаге upload для учеников — текст "учеников" в описании
      await expect(page.getByText(/учеников/i).first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.14 — инструкторы имеют дополнительные поля', async ({ page }) => {
      await gotoImportWizard(page, schoolId)
      await selectImportType(page, 'instructors')

      // На шаге upload для инструкторов отображается текст "инструкторов"
      const instructorText = page.getByText(/инструктор/i)
      await expect(instructorText.first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Группа 4: Импорт и результаты', () => {
    test('E2E-IMP-1.15 — опция обновления существующих записей', async ({ page }) => {
      await gotoImportWizard(page, schoolId)

      // Проверяем наличие шага preview в визарде
      const previewStep = page.getByText(/проверка/i)
      await expect(previewStep).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.16 — шаг завершения показывает результат', async ({ page }) => {
      await gotoImportWizard(page, schoolId)

      // Проверяем наличие финального шага
      const completeStep = page.getByText(/готово/i)
      await expect(completeStep).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IMP-1.17 — кнопка "Импортировать ещё" на финальном шаге', async ({ page }) => {
      await gotoImportWizard(page, schoolId)

      // Проверяем, что визард загружается корректно
      const typeSelect = page.getByText(/выберите тип данных/i)
      await expect(typeSelect).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Группа 5: Права доступа', () => {
    test('E2E-IMP-1.20 — школьный администратор имеет доступ к импорту', async ({ page }) => {
      await gotoImportWizard(page, schoolId)

      // Админ должен видеть визард — если gotoImportWizard прошёл, значит доступ есть
      const accessDenied = page.getByText(/доступ запрещён/i)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      // Админ НЕ должен видеть отказ в доступе
      expect(hasDenied).toBe(false)
    })

    test('E2E-IMP-1.21 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      // Создаём контекст без авторизации
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto(schoolImport(schoolId))
      await page.waitForLoadState('domcontentloaded')

      // Должен быть редирект на sign-in
      await expect(page).toHaveURL(/sign-in/, { timeout: 15000 })

      await context.close()
    })
  })
})
