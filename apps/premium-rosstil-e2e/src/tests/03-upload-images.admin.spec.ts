/**
 * Тест: Загрузка изображений к вариантам товаров
 *
 * Сценарий: Загрузка изображений к варианту товара
 *   Дано я залогинен как admin@test.local
 *   И есть товар с вариантом
 *   Когда я перехожу на страницу редактирования товара
 *   И разворачиваю вариант
 *   И нажимаю "Добавить изображения"
 *   И выбираю файлы изображений
 *   И нажимаю "Загрузить все"
 *   Тогда изображения загружаются
 *   И появляются в галерее варианта
 *   И создаются записи в БД
 *
 * ВАЖНО: Этот тест должен запускаться ПОСЛЕ 02-create-products.spec.ts,
 * так как он зависит от созданных товаров и вариантов.
 */
import { expect, test } from '@playwright/test'
import {
  deleteAllImages,
  disconnectDb,
  getImagesCount,
  getProductByName,
  getVariantByColor,
  getVariantImagesCount,
} from '../helpers/db.helpers'
import { AdminProductEditPage } from '../pages/admin'

// Тестовые данные для изображений (соответствуют товарам из 02-create-products.spec.ts)
const TEST_IMAGES = {
  'Платье "Элегант"': {
    variant: 'Черный',
    images: ['1_1.jpg', '1_2.jpg'],
  },
  'Блузка "Минимал"': {
    variant: 'Белый',
    images: ['2_1.jpg', '2_2.jpg'],
  },
  'Брюки "Классик"': {
    variant: 'Темно-синий',
    images: ['4_1.jpg'],
  },
}

test.describe.serial('02-admin: Загрузка изображений', () => {
  test.beforeAll(async () => {
    // Очищаем изображения перед тестами
    await deleteAllImages()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  test('изначально нет изображений в БД', async () => {
    const count = await getImagesCount()
    expect(count).toBe(0)
  })

  test('должна открываться секция загрузки изображений', async ({ page }) => {
    // Получаем первый товар
    const product = await getProductByName('Платье "Элегант"')
    expect(product).not.toBeNull()

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Разворачиваем вариант
    await editPage.expandVariant('Черный')

    // Проверяем наличие кнопки "Добавить изображения"
    const card = editPage.getVariantCard('Черный')
    const addImagesButton = card.locator('button', { hasText: 'Добавить изображения' })
    await expect(addImagesButton).toBeVisible()

    // Нажимаем и проверяем появление dropzone
    await addImagesButton.click()

    // Проверяем текст dropzone
    await expect(page.locator('text=Перетащите изображения сюда или нажмите для выбора')).toBeVisible()
  })

  test('должны загружаться изображения к товару "Платье Элегант"', async ({ page }) => {
    const productName = 'Платье "Элегант"'
    const testData = TEST_IMAGES[productName]

    // Получаем товар из БД
    const product = await getProductByName(productName)
    expect(product).not.toBeNull()

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Разворачиваем вариант
    await editPage.expandVariant(testData.variant)

    // Загружаем изображения
    await editPage.uploadImages(testData.variant, testData.images)

    // Проверяем в БД
    const variant = await getVariantByColor(product!.id, testData.variant)
    expect(variant).not.toBeNull()
    expect(variant!.images).toHaveLength(testData.images.length)
  })

  test('изображения должны отображаться в галерее варианта', async ({ page }) => {
    const productName = 'Платье "Элегант"'
    const testData = TEST_IMAGES[productName]

    const product = await getProductByName(productName)
    expect(product).not.toBeNull()

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Разворачиваем вариант
    await editPage.expandVariant(testData.variant)

    // Ждём загрузки содержимого варианта
    await page.waitForTimeout(500)

    // Проверяем количество изображений в UI
    const imagesCount = await editPage.getImagesCount(testData.variant)
    expect(imagesCount).toBe(testData.images.length)
  })

  test('должны загружаться изображения к товару "Блузка Минимал"', async ({ page }) => {
    const productName = 'Блузка "Минимал"'
    const testData = TEST_IMAGES[productName]

    const product = await getProductByName(productName)
    expect(product).not.toBeNull()

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Разворачиваем вариант
    await editPage.expandVariant(testData.variant)

    // Загружаем изображения
    await editPage.uploadImages(testData.variant, testData.images)

    // Проверяем в БД
    const variant = await getVariantByColor(product!.id, testData.variant)
    expect(variant).not.toBeNull()
    expect(variant!.images).toHaveLength(testData.images.length)
  })

  test('должно загружаться изображение к товару "Брюки Классик"', async ({ page }) => {
    const productName = 'Брюки "Классик"'
    const testData = TEST_IMAGES[productName]

    const product = await getProductByName(productName)
    expect(product).not.toBeNull()

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Разворачиваем вариант
    await editPage.expandVariant(testData.variant)

    // Загружаем изображения
    await editPage.uploadImages(testData.variant, testData.images)

    // Проверяем в БД
    const variant = await getVariantByColor(product!.id, testData.variant)
    expect(variant).not.toBeNull()
    expect(variant!.images).toHaveLength(testData.images.length)
  })

  test('итого должно быть 5 изображений в БД', async () => {
    const count = await getImagesCount()
    // 2 (Платье) + 2 (Блузка) + 1 (Брюки) = 5
    expect(count).toBe(5)
  })

  test('все варианты должны иметь правильное количество изображений', async () => {
    for (const [productName, testData] of Object.entries(TEST_IMAGES)) {
      const product = await getProductByName(productName)
      expect(product).not.toBeNull()

      const variant = await getVariantByColor(product!.id, testData.variant)
      expect(variant).not.toBeNull()

      const imagesCount = await getVariantImagesCount(variant!.id)
      expect(imagesCount).toBe(testData.images.length)
    }
  })
})
