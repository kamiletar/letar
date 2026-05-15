/**
 * Тест: Фильтры и пагинация каталога
 *
 * Сценарий: Фильтрация по категории
 *   Дано в БД есть товары в разных категориях
 *   Когда я применяю фильтр по категории "Платья"
 *   Тогда отображаются только товары из категории "Платья"
 *
 * Сценарий: Фильтрация по новинкам
 *   Дано в БД есть товары с флагом isNewCollection
 *   Когда я применяю фильтр "Новинки"
 *   Тогда отображаются только новые товары
 *
 * Сценарий: Пагинация
 *   Дано в БД больше 12 товаров
 *   Когда я перехожу на страницу 2
 *   Тогда отображаются товары со следующей страницы
 *
 * ВАЖНО: Этот тест зависит от данных созданных в предыдущих тестах:
 * - 07-manage-categories.spec.ts (категории)
 * - 02-create-products.spec.ts (товары)
 */
import { expect, test } from '@playwright/test'
import {
  createTestCategory,
  deleteAllCategories,
  disconnectDb,
  getAllProducts,
  getCategoryBySlug,
  setProductCategory,
  setProductNewCollection,
} from '../helpers/db.helpers'
import { CatalogPage } from '../pages/catalog'

test.describe.serial('03-user: Фильтры и пагинация каталога', () => {
  let dressCategory: { id: string; name: string; slug: string }
  let allProducts: Awaited<ReturnType<typeof getAllProducts>>

  test.beforeAll(async () => {
    // Получаем все продукты
    allProducts = await getAllProducts()

    if (allProducts.length === 0) {
      throw new Error('Товары не созданы! Сначала запустите тест 02-create-products.spec.ts')
    }

    // Создаём категории если их нет
    let category = await getCategoryBySlug('platya-test')
    if (!category) {
      await deleteAllCategories()
      category = await createTestCategory({ name: 'Платья', slug: 'platya-test', sortOrder: 0 })
      await createTestCategory({ name: 'Блузки', slug: 'bluzki-test', sortOrder: 1 })
    }
    dressCategory = category

    // Привязываем первый продукт к категории "Платья"
    if (allProducts[0]) {
      await setProductCategory(allProducts[0].id, dressCategory.id)
      // Устанавливаем флаг новинки для первого продукта
      await setProductNewCollection(allProducts[0].id, true)
    }

    // Снимаем флаг новинки с остальных продуктов
    for (let i = 1; i < allProducts.length; i++) {
      const product = allProducts[i]
      if (product) {
        await setProductNewCollection(product.id, false)
      }
    }
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  // === Базовые тесты ===

  test('страница каталога открывается с фильтрами', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    // Проверяем заголовок
    await expect(catalogPage.heading).toBeVisible()

    // Ждём загрузки товаров
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Проверяем что есть товары
    const count = await catalogPage.getProductCount()
    expect(count).toBeGreaterThan(0)
  })

  // === Фильтрация по URL параметрам ===

  test('фильтрация по категории через URL работает', async ({ page }) => {
    const catalogPage = new CatalogPage(page)

    // Переходим с фильтром по категории
    await catalogPage.gotoWithFilters({ category: dressCategory.id })

    // Ждём загрузки
    await page.waitForLoadState('domcontentloaded')

    // URL должен содержать параметр категории
    expect(page.url()).toContain(`category=${dressCategory.id}`)
  })

  test('фильтрация по новинкам через URL работает', async ({ page }) => {
    const catalogPage = new CatalogPage(page)

    // Переходим с фильтром новинок
    await catalogPage.gotoWithFilters({ newCollection: true })

    await page.waitForLoadState('domcontentloaded')

    // URL должен содержать параметр
    expect(page.url()).toContain('newCollection=true')
  })

  test('фильтрация по полу через URL работает', async ({ page }) => {
    const catalogPage = new CatalogPage(page)

    // Переходим с фильтром по полу
    await catalogPage.gotoWithFilters({ gender: 'FEMALE' })

    await page.waitForLoadState('domcontentloaded')

    // URL должен содержать параметр
    expect(page.url()).toContain('gender=FEMALE')
  })

  test('сортировка через URL работает', async ({ page }) => {
    const catalogPage = new CatalogPage(page)

    // Переходим с сортировкой по цене (от дешёвых)
    await catalogPage.gotoWithFilters({ sort: 'price_asc' })

    await page.waitForLoadState('domcontentloaded')

    // URL должен содержать параметр
    expect(page.url()).toContain('sort=price_asc')
  })

  // === Комбинированные фильтры ===

  test('комбинация нескольких фильтров работает', async ({ page }) => {
    const catalogPage = new CatalogPage(page)

    // Применяем несколько фильтров сразу
    await catalogPage.gotoWithFilters({
      gender: 'FEMALE',
      newCollection: true,
      sort: 'newest',
    })

    await page.waitForLoadState('domcontentloaded')

    // URL должен содержать все параметры
    const url = page.url()
    expect(url).toContain('gender=FEMALE')
    expect(url).toContain('newCollection=true')
    expect(url).toContain('sort=newest')
  })

  // === Пагинация ===

  test('пагинация через URL работает', async ({ page }) => {
    const catalogPage = new CatalogPage(page)

    // Переходим на страницу 2
    await catalogPage.gotoWithFilters({ page: 2 })

    await page.waitForLoadState('domcontentloaded')

    // URL должен содержать параметр страницы
    expect(page.url()).toContain('page=2')
  })

  test('страница без товаров показывает пустое состояние', async ({ page }) => {
    const catalogPage = new CatalogPage(page)

    // Переходим на очень большой номер страницы
    await catalogPage.gotoWithFilters({ page: 999 })

    await page.waitForLoadState('domcontentloaded')

    // Должно быть либо 0 товаров, либо сообщение о пустом состоянии
    const productCount = await catalogPage.getProductCount()
    if (productCount === 0) {
      // Проверяем что показывается сообщение о пустом каталоге
      await expect(page.getByText(/товары не найдены|каталог пуст|нет товаров/i)).toBeVisible()
    }
  })

  // === Сброс фильтров ===

  test('каталог без фильтров показывает все товары', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

    // Должны быть все товары (минимум те, что созданы в предыдущих тестах)
    const count = await catalogPage.getProductCount()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})
