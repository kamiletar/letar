/**
 * Тест: Создание размеров в админ-панели
 *
 * Сценарий: Создание размерной сетки из пресетов
 *   Дано я залогинен как admin@test.local
 *   И я на странице /admin/sizes
 *   Когда я нажимаю "Создать из шаблона"
 *   И выбираю пресет "Женские размеры (стандарт)"
 *   И нажимаю "Создать"
 *   Тогда в таблице появляются женские размеры
 *   И каждый размер имеет корректные мерки
 */
import { expect, test } from '@playwright/test'
import { deleteAllSizes, disconnectDb, getSizesCount, getSizesCountByGender, sizeExists } from '../helpers/db.helpers'
import { AdminSizesPage } from '../pages/admin'

test.describe.serial('02-admin: Создание размеров', () => {
  // Флаг: размеры уже созданы другим браузером
  let sizesAlreadyExist = false

  test.beforeAll(async () => {
    // Проверяем есть ли уже размеры в БД (могут быть созданы другим браузером)
    const existingCount = await getSizesCount()
    if (existingCount > 0) {
      // Размеры уже созданы (вероятно, другим браузером), не удаляем их
      sizesAlreadyExist = true
    } else {
      // Размеров нет - очищаем на всякий случай
      await deleteAllSizes()
    }
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  test('должна открываться страница размеров для админа', async ({ page }) => {
    // Логинимся как админ

    // Переходим на страницу размеров
    const sizesPage = new AdminSizesPage(page)
    await sizesPage.goto()

    // Проверяем заголовок
    await expect(sizesPage.heading).toBeVisible()

    // Проверяем наличие кнопок создания
    await expect(sizesPage.createFromPresetButton).toBeVisible()
    await expect(sizesPage.createButton).toBeVisible()
  })

  test('должно открываться модальное окно создания из пресета', async ({ page }) => {
    const sizesPage = new AdminSizesPage(page)
    await sizesPage.goto()

    // Открываем модальное окно
    await sizesPage.openPresetModal()

    // Проверяем что модальное окно открылось
    await expect(sizesPage.presetModal).toBeVisible()
    await expect(sizesPage.presetModalTitle).toBeVisible()

    // Проверяем наличие всех пресетов
    await expect(page.locator('text=Женские размеры (стандарт)')).toBeVisible()
    await expect(page.locator('text=Мужские размеры (стандарт)')).toBeVisible()
    await expect(page.locator('text=Женские размеры (Plus Size)')).toBeVisible()
    await expect(page.locator('text=Мужские размеры (Plus Size)')).toBeVisible()
    await expect(page.locator('text=Женские размеры (Petite)')).toBeVisible()
    await expect(page.locator('text=Женские размеры (Tall)')).toBeVisible()
  })

  test('должны создаваться женские стандартные размеры из пресета', async ({ page }) => {
    // Проверяем есть ли уже женские размеры
    const femaleCount = await getSizesCountByGender('FEMALE')
    if (femaleCount >= 8) {
      // Размеры уже созданы - проверяем их наличие
      expect(await sizeExists('40', 'FEMALE')).toBe(true) // XXS
      expect(await sizeExists('42', 'FEMALE')).toBe(true) // XS
      expect(await sizeExists('44', 'FEMALE')).toBe(true) // S
      expect(await sizeExists('46', 'FEMALE')).toBe(true) // M
      expect(await sizeExists('48', 'FEMALE')).toBe(true) // L
      expect(await sizeExists('50', 'FEMALE')).toBe(true) // XL
      expect(await sizeExists('52', 'FEMALE')).toBe(true) // XXL
      expect(await sizeExists('54', 'FEMALE')).toBe(true) // XXXL
      test.skip(sizesAlreadyExist, 'Размеры уже созданы другим браузером')
      return
    }

    const sizesPage = new AdminSizesPage(page)
    await sizesPage.goto()

    // Запоминаем начальное количество размеров
    const initialCount = await getSizesCount()

    // Открываем модальное окно
    await sizesPage.openPresetModal()

    // Создаём размеры из пресета "Женские размеры (стандарт)"
    const result = await sizesPage.createFromPreset('female-standard')

    // Проверяем что создано 8 размеров (XXS-XXXL)
    expect(result.created).toBe(8)
    expect(result.skipped).toBe(0)

    // Ждём закрытия модального окна (автоматическое через 3 сек)

    await page.waitForTimeout(4000)

    // Проверяем что размеры появились в БД
    const newCount = await getSizesCount()
    expect(newCount).toBe(initialCount + 8)

    // Проверяем конкретные размеры
    expect(await sizeExists('40', 'FEMALE')).toBe(true) // XXS
    expect(await sizeExists('42', 'FEMALE')).toBe(true) // XS
    expect(await sizeExists('44', 'FEMALE')).toBe(true) // S
    expect(await sizeExists('46', 'FEMALE')).toBe(true) // M
    expect(await sizeExists('48', 'FEMALE')).toBe(true) // L
    expect(await sizeExists('50', 'FEMALE')).toBe(true) // XL
    expect(await sizeExists('52', 'FEMALE')).toBe(true) // XXL
    expect(await sizeExists('54', 'FEMALE')).toBe(true) // XXXL
  })

  test('должны пропускаться уже существующие размеры при повторном создании', async ({ page }) => {
    const sizesPage = new AdminSizesPage(page)
    await sizesPage.goto()

    // Запоминаем количество размеров
    const countBefore = await getSizesCount()

    // Открываем модальное окно
    await sizesPage.openPresetModal()

    // Пытаемся создать размеры снова
    const result = await sizesPage.createFromPreset('female-standard')

    // Все 8 размеров должны быть пропущены
    expect(result.created).toBe(0)
    expect(result.skipped).toBe(8)

    // Количество размеров не должно измениться

    await page.waitForTimeout(4000)
    const countAfter = await getSizesCount()
    expect(countAfter).toBe(countBefore)
  })

  test('должны создаваться мужские стандартные размеры', async ({ page }) => {
    // Проверяем есть ли уже мужские размеры
    const maleCount = await getSizesCountByGender('MALE')
    if (maleCount >= 8) {
      // Размеры уже созданы - проверяем их наличие
      expect(await sizeExists('44', 'MALE')).toBe(true) // XS
      expect(await sizeExists('46', 'MALE')).toBe(true) // S
      expect(await sizeExists('48', 'MALE')).toBe(true) // M
      expect(await sizeExists('50', 'MALE')).toBe(true) // L
      expect(await sizeExists('52', 'MALE')).toBe(true) // XL
      expect(await sizeExists('54', 'MALE')).toBe(true) // XXL
      expect(await sizeExists('56', 'MALE')).toBe(true) // XXXL
      expect(await sizeExists('58', 'MALE')).toBe(true) // 4XL
      test.skip(sizesAlreadyExist, 'Размеры уже созданы другим браузером')
      return
    }

    const sizesPage = new AdminSizesPage(page)
    await sizesPage.goto()

    // Открываем модальное окно
    await sizesPage.openPresetModal()

    // Создаём мужские размеры
    const result = await sizesPage.createFromPreset('male-standard')

    // Должно создаться 8 размеров (XS-4XL)
    expect(result.created).toBe(8)
    expect(result.skipped).toBe(0)

    // Ждём закрытия модального окна

    await page.waitForTimeout(4000)

    // Проверяем мужские размеры в БД
    expect(await sizeExists('44', 'MALE')).toBe(true) // XS
    expect(await sizeExists('46', 'MALE')).toBe(true) // S
    expect(await sizeExists('48', 'MALE')).toBe(true) // M
    expect(await sizeExists('50', 'MALE')).toBe(true) // L
    expect(await sizeExists('52', 'MALE')).toBe(true) // XL
    expect(await sizeExists('54', 'MALE')).toBe(true) // XXL
    expect(await sizeExists('56', 'MALE')).toBe(true) // XXXL
    expect(await sizeExists('58', 'MALE')).toBe(true) // 4XL
  })

  test('размеры должны отображаться в таблице', async ({ page }) => {
    const sizesPage = new AdminSizesPage(page)
    await sizesPage.goto()

    // Проверяем что таблица видна
    await expect(sizesPage.sizesTable).toBeVisible()

    // Проверяем наличие групп по полу
    await expect(page.locator('text=ЖЕНСКИЙ').first()).toBeVisible()
    await expect(page.locator('text=МУЖСКОЙ').first()).toBeVisible()

    // Проверяем наличие конкретных размеров в таблице
    // Женские
    await expect(page.locator('td', { hasText: '40' }).first()).toBeVisible()
    await expect(page.locator('td', { hasText: '54' }).first()).toBeVisible()

    // Мужские
    await expect(page.locator('td', { hasText: '58' }).first()).toBeVisible()
  })

  test('должны отображаться все колонки в таблице размеров', async ({ page }) => {
    const sizesPage = new AdminSizesPage(page)
    await sizesPage.goto()

    // Проверяем заголовки колонок (используем getByRole для точного совпадения)
    await expect(page.getByRole('columnheader', { name: 'Пол', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'RU', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'INT', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'DE', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'IT', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'FR', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'UK', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'US', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Джинсы', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Грудь (см)', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Талия (см)', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Бедра (см)', exact: true })).toBeVisible()
  })

  test('итого должно быть 16 размеров (8 женских + 8 мужских)', async () => {
    const totalCount = await getSizesCount()
    expect(totalCount).toBe(16)

    const femaleCount = await getSizesCountByGender('FEMALE')
    expect(femaleCount).toBe(8)

    const maleCount = await getSizesCountByGender('MALE')
    expect(maleCount).toBe(8)
  })
})
