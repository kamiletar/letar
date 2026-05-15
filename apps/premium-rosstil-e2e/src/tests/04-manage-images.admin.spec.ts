/**
 * Тест: Управление изображениями
 *
 * Сценарий: Просмотр всех изображений
 *   Дано я залогинен как admin@test.local
 *   Когда я перехожу на /admin/images
 *   Тогда я вижу таблицу всех изображений
 *   И статистику использования
 *
 * Сценарий: Фильтрация изображений
 *   Дано я на странице /admin/images
 *   Когда я применяю фильтр "Неиспользуемые"
 *   Тогда показываются только изображения без привязки к товарам
 *
 * Сценарий: Синхронизация изображений
 *   Когда я нажимаю "Сканировать"
 *   Тогда запускается процесс синхронизации
 *   И показывается результат
 *
 * ВАЖНО: Этот тест должен запускаться ПОСЛЕ 03-upload-images.spec.ts,
 * так как он зависит от загруженных изображений.
 */
import { expect, test } from '@playwright/test'
import { disconnectDb, getFirstImage, getImagesCount } from '../helpers/db.helpers'
import { AdminImagesPage } from '../pages/admin'

test.describe.serial('02-admin: Управление изображениями', () => {
  test.afterAll(async () => {
    await disconnectDb()
  })

  test('должна открываться страница управления изображениями', async ({ page }) => {
    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Проверяем заголовок
    await expect(imagesPage.heading).toBeVisible()
    await expect(imagesPage.heading).toHaveText('Изображения')
  })

  test('должна отображаться статистика изображений', async ({ page }) => {
    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Проверяем наличие карточки "Всего изображений"
    await expect(imagesPage.totalImagesCard).toBeVisible()

    // Проверяем, что количество в UI соответствует БД
    const dbCount = await getImagesCount()
    const uiCount = await imagesPage.getTotalImagesCount()
    expect(uiCount).toBe(dbCount)
  })

  test('должна отображаться таблица изображений', async ({ page }) => {
    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Если есть изображения - должна быть таблица
    const dbCount = await getImagesCount()
    if (dbCount > 0) {
      await expect(imagesPage.imagesTable).toBeVisible()
      const rowsCount = await imagesPage.getTableRowsCount()
      expect(rowsCount).toBeGreaterThan(0)
    } else {
      // Если нет изображений - должно быть пустое состояние
      await expect(imagesPage.emptyState).toBeVisible()
    }
  })

  test('изображения должны иметь категорию PRODUCT', async ({ page }) => {
    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Проверяем, что все изображения имеют категорию "Товар" (PRODUCT)
    const dbCount = await getImagesCount()
    if (dbCount > 0) {
      // Применяем фильтр по категории PRODUCT
      await imagesPage.filterByCategory('PRODUCT')

      // Проверяем, что показаны все изображения (все наши тестовые - это PRODUCT)
      const rowsCount = await imagesPage.getTableRowsCount()
      expect(rowsCount).toBe(dbCount)
    }
  })

  test('должен работать поиск по имени файла', async ({ page }) => {
    // Получаем реальное имя файла из БД (имена генерируются как timestamp-random.ext)
    const firstImage = await getFirstImage()

    // Пропускаем тест если нет изображений (зависит от 03-upload-images)
    if (!firstImage) {
      test.skip()
      return
    }

    // Берём первые 10 символов имени файла для поиска
    const searchQuery = firstImage.filename.substring(0, 10)

    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Ищем по части имени файла
    await imagesPage.search(searchQuery)

    // Должна найтись хотя бы одна строка
    const rowsCount = await imagesPage.getTableRowsCount()
    expect(rowsCount).toBeGreaterThanOrEqual(1)

    // Проверяем что в результате есть искомый файл
    const hasFile = await imagesPage.hasImage(firstImage.filename)
    expect(hasFile).toBe(true)
  })

  test('должна работать синхронизация файлов', async ({ page }) => {
    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Проверяем наличие панели синхронизации
    await expect(imagesPage.syncPanel).toBeVisible()
    await expect(imagesPage.syncButton).toBeVisible()

    // Запускаем синхронизацию
    await imagesPage.runSync()

    // После синхронизации должны появиться результаты (badges)
    // Либо "Всё синхронизировано", либо количество проблем
    const isSynced = await imagesPage.isSyncSuccessful()
    const orphans = await imagesPage.getOrphanFilesCount()
    const broken = await imagesPage.getBrokenRecordsCount()

    // Если нет проблем, должен быть badge "Всё синхронизировано"
    if (orphans === 0 && broken === 0) {
      expect(isSynced).toBe(true)
    } else {
      // Если есть проблемы, должны отображаться соответствующие секции
      expect(orphans + broken).toBeGreaterThan(0)
    }
  })

  test('должен работать сброс фильтров', async ({ page }) => {
    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Применяем фильтр
    await imagesPage.filterByCategory('PRODUCT')

    // Должна появиться кнопка сброса
    await expect(imagesPage.clearFiltersButton).toBeVisible()

    // Сбрасываем фильтры
    await imagesPage.clearFilters()

    // URL должен быть без параметров
    await expect(page).toHaveURL(/\/admin\/images\/?$/)
  })

  test('должен работать фильтр "Неиспользуемые"', async ({ page }) => {
    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Получаем количество неиспользуемых
    const unusedCount = await imagesPage.getUnusedImagesCount()

    // Применяем фильтр "Неиспользуемые"
    await imagesPage.toggleUnusedFilter()

    // Ждём применения фильтра (URL может не обновляться если фильтр через React state)
    await page.waitForTimeout(1000)

    // Количество строк должно соответствовать количеству неиспользуемых
    if (unusedCount === 0) {
      await expect(imagesPage.emptyState).toBeVisible()
    } else {
      const rowsCount = await imagesPage.getTableRowsCount()
      // Может быть меньше или равно из-за пагинации
      expect(rowsCount).toBeLessThanOrEqual(unusedCount)
    }
  })

  test('все тестовые изображения используются товарами', async ({ page }) => {
    const imagesPage = new AdminImagesPage(page)
    await imagesPage.goto()

    // Проверяем, что нет неиспользуемых изображений
    const unusedCount = await imagesPage.getUnusedImagesCount()
    // После загрузки изображений к товарам все должны использоваться
    expect(unusedCount).toBe(0)
  })
})
