/**
 * Тест: Управление категориями в админ-панели
 *
 * Сценарий: Создание категории
 *   Дано я залогинен как admin@test.local
 *   Когда я перехожу на /admin/categories/new
 *   И заполняю форму категории
 *   Тогда категория появляется в списке
 *
 * Сценарий: Редактирование категории
 *   Дано существует категория "Платья"
 *   Когда я редактирую название на "Вечерние платья"
 *   Тогда изменения сохраняются в БД
 *
 * Сценарий: Удаление категории
 *   Дано существует категория "Тестовая"
 *   Когда я удаляю категорию
 *   Тогда она исчезает из списка
 */
import { expect, test } from '@playwright/test'
import {
  categoryExists,
  createTestCategory,
  createTestProduct,
  deleteAllCategories,
  deleteAllProducts,
  disconnectDb,
  getAllCategories,
  getCategoriesCount,
  getCategoryById,
  getCategoryBySlug,
  getProductByName,
} from '../helpers/db.helpers'
import {
  AdminCategoriesListPage,
  AdminCategoryEditPage,
  AdminCategoryNewPage,
  AdminProductEditPage,
} from '../pages/admin'

// Тестовые данные категорий
const TEST_CATEGORIES = [
  { name: 'Платья', slug: 'platya', sortOrder: 0 },
  { name: 'Блузки', slug: 'bluzki', sortOrder: 1 },
  { name: 'Брюки', slug: 'bryuki', sortOrder: 2 },
]

test.describe.serial('02-admin: Управление категориями', () => {
  test.beforeAll(async () => {
    // Очищаем категории перед тестами
    // ВАЖНО: deleteAllCategories() устанавливает categoryId: null для всех товаров,
    // что может вызвать проблемы при параллельном запуске тестов на разных браузерах
    await deleteAllCategories()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  test('должна открываться страница списка категорий', async ({ page }) => {
    const listPage = new AdminCategoriesListPage(page)
    await listPage.goto()

    // Проверяем заголовок
    await expect(listPage.heading).toBeVisible()

    // Проверяем наличие кнопки создания
    await expect(listPage.createButton).toBeVisible()
  })

  test('должна открываться страница создания категории', async ({ page }) => {
    const newPage = new AdminCategoryNewPage(page)
    await newPage.goto()

    // Проверяем заголовок
    await expect(newPage.heading).toBeVisible()

    // Проверяем наличие полей формы
    await expect(newPage.nameInput).toBeVisible()
    await expect(newPage.slugInput).toBeVisible()
    await expect(newPage.sortOrderInput).toBeVisible()
    await expect(newPage.submitButton).toBeVisible()
  })

  test('должна создаваться категория "Платья"', async ({ page }) => {
    const categoryData = TEST_CATEGORIES[0]
    const newPage = new AdminCategoryNewPage(page)
    await newPage.goto()

    // Создаём категорию
    await newPage.createCategory({
      name: categoryData.name,
      slug: categoryData.slug,
      sortOrder: categoryData.sortOrder,
    })

    // После создания должны оказаться на списке категорий
    await expect(page).toHaveURL(/\/admin\/categories\/?$/)

    // Проверяем что категория создана в БД
    expect(await categoryExists(categoryData.slug)).toBe(true)
  })

  test('должна создаваться категория "Блузки"', async ({ page }) => {
    const categoryData = TEST_CATEGORIES[1]
    const newPage = new AdminCategoryNewPage(page)
    await newPage.goto()

    await newPage.createCategory({
      name: categoryData.name,
      slug: categoryData.slug,
      sortOrder: categoryData.sortOrder,
    })

    await expect(page).toHaveURL(/\/admin\/categories\/?$/)
    expect(await categoryExists(categoryData.slug)).toBe(true)
  })

  test('должна создаваться категория "Брюки"', async ({ page }) => {
    const categoryData = TEST_CATEGORIES[2]
    const newPage = new AdminCategoryNewPage(page)
    await newPage.goto()

    await newPage.createCategory({
      name: categoryData.name,
      slug: categoryData.slug,
      sortOrder: categoryData.sortOrder,
    })

    await expect(page).toHaveURL(/\/admin\/categories\/?$/)
    expect(await categoryExists(categoryData.slug)).toBe(true)
  })

  test('все категории должны отображаться в списке', async ({ page }) => {
    const listPage = new AdminCategoriesListPage(page)
    await listPage.goto()

    // Проверяем наличие всех категорий
    for (const categoryData of TEST_CATEGORIES) {
      await expect(page.locator(`text="${categoryData.name}"`).first()).toBeVisible()
    }
  })

  test('итого должно быть 3 категории в БД', async () => {
    const count = await getCategoriesCount()
    expect(count).toBe(3)

    // Проверяем детали каждой категории
    for (const categoryData of TEST_CATEGORIES) {
      const category = await getCategoryBySlug(categoryData.slug)
      expect(category).not.toBeNull()
      expect(category?.name).toBe(categoryData.name)
      expect(category?.sortOrder).toBe(categoryData.sortOrder)
    }
  })

  test('slug автогенерируется из названия', async ({ page }) => {
    const newPage = new AdminCategoryNewPage(page)
    await newPage.goto()

    // Очищаем поле и вводим название с русскими буквами посимвольно
    // Это надёжнее чем fill() для триггера onChange события
    await newPage.nameInput.click()
    await newPage.nameInput.fill('')
    await newPage.nameInput.pressSequentially('Жакеты', { delay: 50 })

    // Ждём автогенерации slug с polling вместо фиксированного таймаута
    await expect(async () => {
      const slugValue = await newPage.slugInput.inputValue()
      expect(slugValue).toMatch(/^[a-z0-9-]+$/)
      expect(slugValue.length).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })
  })

  test('категории отсортированы по sortOrder', async () => {
    const categories = await getAllCategories()

    // Проверяем порядок
    expect(categories).toHaveLength(3)
    expect(categories[0].name).toBe('Платья')
    expect(categories[1].name).toBe('Блузки')
    expect(categories[2].name).toBe('Брюки')
  })

  test('редактирование категории, привязанной к товару', async ({ page, browserName }) => {
    // Используем уникальные имена для каждого браузера, чтобы избежать конфликтов
    const uniqueSuffix = `${browserName}-${Date.now()}`
    const testCategorySlug = `test-cat-edit-${uniqueSuffix}`
    const testProductName = `Тестовое платье ${uniqueSuffix}`

    // Создаём отдельную категорию для этого теста
    const category = await createTestCategory({
      name: `Тестовая категория ${uniqueSuffix}`,
      slug: testCategorySlug,
      sortOrder: 100,
    })

    // Создаём тестовый товар привязанный к этой категории
    await createTestProduct({
      name: testProductName,
      description: 'Тестовый товар',
      gender: 'FEMALE',
      categoryId: category.id,
    })

    // Переходим на страницу редактирования категории
    const editPage = new AdminCategoryEditPage(page)
    await editPage.goto(category.id)

    // Проверяем что страница загрузилась
    await expect(editPage.heading).toBeVisible()

    // Редактируем название категории
    const newCategoryName = `Обновлённая категория ${uniqueSuffix}`
    await editPage.updateCategory({ name: newCategoryName })

    // Проверяем что изменения сохранились в БД
    const updatedCategory = await getCategoryById(category.id)
    expect(updatedCategory?.name).toBe(newCategoryName)

    // Проверяем что товар всё ещё привязан к этой категории
    const updatedProduct = await getProductByName(testProductName)
    expect(updatedProduct?.categoryId).toBe(category.id)
  })

  test('изменение категории товара в форме редактирования продукта', async ({ page, browserName }) => {
    // Используем уникальные имена для каждого браузера
    const uniqueSuffix = `${browserName}-${Date.now()}`
    const testProductName = `Тестовая блузка ${uniqueSuffix}`
    const testCategoryName = `Тестовая категория ${uniqueSuffix}`
    const testCategorySlug = `test-cat-${uniqueSuffix}`

    // Создаём категорию для этого теста (изолированно от других тестов)
    const category = await createTestCategory({
      name: testCategoryName,
      slug: testCategorySlug,
      sortOrder: 200,
    })

    // Создаём тестовый товар без категории
    const product = await createTestProduct({
      name: testProductName,
      description: 'Товар для теста изменения категории',
      gender: 'FEMALE',
    })

    // Переходим на страницу редактирования товара
    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product.id)

    // Проверяем что страница загрузилась
    await expect(editPage.heading).toBeVisible()

    // Выбираем созданную категорию (после сохранения будет редирект на список)
    await editPage.updateBasicInfo({ categoryName: testCategoryName })

    // Проверяем что категория изменилась в БД
    const updatedProduct = await getProductByName(testProductName)
    expect(updatedProduct?.categoryId).toBe(category.id)

    // Возвращаемся на страницу редактирования чтобы проверить отображение
    await editPage.goto(product.id)
    const currentCategory = await editPage.getCurrentCategory()
    expect(currentCategory).toContain(testCategoryName)
  })

  test('смена категории товара на другую', async ({ page, browserName }) => {
    // Используем уникальные имена для каждого браузера
    const uniqueSuffix = `${browserName}-${Date.now()}`
    const testProductName = `Товар для смены категории ${uniqueSuffix}`

    // Создаём две категории для этого теста
    const category1 = await createTestCategory({
      name: `Первая категория ${uniqueSuffix}`,
      slug: `first-cat-${uniqueSuffix}`,
      sortOrder: 300,
    })
    const category2 = await createTestCategory({
      name: `Вторая категория ${uniqueSuffix}`,
      slug: `second-cat-${uniqueSuffix}`,
      sortOrder: 301,
    })

    // Создаём товар с первой категорией
    const product = await createTestProduct({
      name: testProductName,
      description: 'Товар для теста смены категории',
      gender: 'FEMALE',
      categoryId: category1.id,
    })

    // Переходим на страницу редактирования товара
    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product.id)

    // Меняем категорию на вторую (после сохранения редирект на список)
    await editPage.updateBasicInfo({ categoryName: `Вторая категория ${uniqueSuffix}` })

    // Проверяем что категория изменилась
    const updatedProduct = await getProductByName(testProductName)
    expect(updatedProduct?.categoryId).toBe(category2.id)

    // Возвращаемся на страницу редактирования чтобы проверить отображение
    await editPage.goto(product.id)
    const currentCategory = await editPage.getCurrentCategory()
    expect(currentCategory).toContain(`Вторая категория ${uniqueSuffix}`)
  })

  test('удаление категории у товара (выбор "Без категории")', async ({ page, browserName }) => {
    // Используем уникальные имена для каждого браузера
    const uniqueSuffix = `${browserName}-${Date.now()}`
    const testProductName = `Товар без категории ${uniqueSuffix}`

    // Создаём категорию для этого теста
    const category = await createTestCategory({
      name: `Категория для удаления ${uniqueSuffix}`,
      slug: `delete-cat-${uniqueSuffix}`,
      sortOrder: 400,
    })

    const product = await createTestProduct({
      name: testProductName,
      description: 'Товар для теста удаления категории',
      gender: 'FEMALE',
      categoryId: category.id,
    })

    // Переходим на страницу редактирования товара
    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product.id)

    // Убираем категорию (после сохранения редирект на список)
    await editPage.updateBasicInfo({ categoryName: 'Без категории' })

    // Проверяем что категория убрана в БД
    const updatedProduct = await getProductByName(testProductName)
    expect(updatedProduct?.categoryId).toBeNull()
  })

  test('очистка тестовых данных', async () => {
    // Удаляем тестовые товары, созданные в этом тестовом наборе
    await deleteAllProducts()
  })
})
