/**
 * Тест: Создание товаров в админ-панели
 *
 * Сценарий: Создание товара с вариантами и SKU
 *   Дано я залогинен как admin@test.local
 *   И в БД есть размеры XS-XL
 *   Когда я перехожу на /admin/products/new
 *   И заполняю форму товара
 *   И добавляю вариант с цветом и составом
 *   И добавляю SKU для каждого размера
 *   Тогда товар появляется в списке
 *   И вариант содержит правильные SKU
 *
 * ВАЖНО: Этот тест должен запускаться ПОСЛЕ 01-create-sizes.spec.ts,
 * так как он зависит от созданных размеров.
 */
import { expect, test } from '@playwright/test'
import {
  deleteAllProducts,
  disconnectDb,
  getProductByName,
  getProductsCount,
  getSizesByGender,
  productExists,
} from '../helpers/db.helpers'
import { AdminProductEditPage, AdminProductNewPage, AdminProductsListPage } from '../pages/admin'

// Тестовые данные товаров
const TEST_PRODUCTS = [
  {
    name: 'Платье "Элегант"',
    description: 'Элегантное вечернее платье',
    gender: 'FEMALE' as const,
    variant: {
      color: 'Черный',
      composition: '95% полиэстер, 5% эластан',
    },
    items: [
      { size: 'XS', price: 15000, count: 5 },
      { size: 'S', price: 15000, count: 10 },
      { size: 'M', price: 15000, count: 10 },
    ],
  },
  {
    name: 'Блузка "Минимал"',
    description: 'Минималистичная блузка для офиса',
    gender: 'FEMALE' as const,
    variant: {
      color: 'Белый',
      composition: '100% хлопок',
    },
    items: [
      { size: 'S', price: 8500, count: 15 },
      { size: 'M', price: 8500, count: 20 },
    ],
  },
  {
    name: 'Брюки "Классик"',
    description: 'Классические брюки',
    gender: 'FEMALE' as const,
    variant: {
      color: 'Темно-синий',
      composition: '70% шерсть, 30% полиэстер',
    },
    items: [
      { size: 'M', price: 12000, count: 15 },
      { size: 'L', price: 12000, count: 10 },
    ],
  },
]

test.describe.serial('02-admin: Создание товаров', () => {
  // Кэш размеров для тестов
  let femaleSizes: Awaited<ReturnType<typeof getSizesByGender>>
  // Флаг: товары уже созданы другим браузером
  let productsAlreadyExist = false

  test.beforeAll(async () => {
    // Проверяем есть ли уже товары в БД (могут быть созданы другим браузером)
    const existingCount = await getProductsCount()
    if (existingCount > 0) {
      // Товары уже созданы (вероятно, другим браузером), не удаляем их
      productsAlreadyExist = true
    } else {
      // Товаров нет - очищаем связанные данные на всякий случай
      await deleteAllProducts()
    }

    // Получаем размеры для женских товаров
    femaleSizes = await getSizesByGender('FEMALE')

    // Проверяем что размеры созданы
    if (femaleSizes.length === 0) {
      throw new Error('Размеры не созданы! Сначала запустите тест 01-create-sizes.spec.ts')
    }
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  test('должна открываться страница списка товаров', async ({ page }) => {
    const listPage = new AdminProductsListPage(page)
    await listPage.goto()

    // Проверяем заголовок
    await expect(listPage.heading).toBeVisible()

    // Проверяем наличие кнопки создания
    await expect(listPage.createButton).toBeVisible()
  })

  test('должна открываться страница создания товара', async ({ page }) => {
    const newPage = new AdminProductNewPage(page)
    await newPage.goto()

    // Проверяем заголовок
    await expect(newPage.heading).toBeVisible()

    // Проверяем наличие полей формы
    await expect(newPage.nameInput).toBeVisible()
    await expect(newPage.descriptionTextarea).toBeVisible()
    await expect(newPage.genderSelectTrigger).toBeVisible()
    await expect(newPage.submitButton).toBeVisible()
  })

  test('должен создаваться товар "Платье Элегант"', async ({ page }) => {
    const productData = TEST_PRODUCTS[0]

    // Если товар уже существует - пропускаем создание
    if (await productExists(productData.name)) {
      test.skip(productsAlreadyExist, 'Товар уже создан другим браузером')
      return
    }

    const newPage = new AdminProductNewPage(page)
    await newPage.goto()

    // Создаём товар
    await newPage.createProduct({
      name: productData.name,
      description: productData.description,
      gender: productData.gender,
    })

    // После создания должны оказаться на списке товаров
    await expect(page).toHaveURL(/\/admin\/products\/?$/)

    // Проверяем что товар создан в БД
    expect(await productExists(productData.name)).toBe(true)
  })

  test('должен добавляться вариант к товару "Платье Элегант"', async ({ page }) => {
    const productData = TEST_PRODUCTS[0]

    // Получаем товар из БД для получения ID
    const product = await getProductByName(productData.name)
    expect(product).not.toBeNull()

    // Если у товара уже есть вариант - пропускаем
    if (product!.variants.length > 0) {
      test.skip(productsAlreadyExist, 'Вариант уже создан другим браузером')
      return
    }

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Проверяем заголовок
    await expect(editPage.heading).toBeVisible()

    // Проверяем что нет вариантов
    await expect(editPage.noVariantsMessage).toBeVisible()

    // Создаём вариант
    await editPage.createVariant({
      color: productData.variant.color,
      composition: productData.variant.composition,
    })

    // Проверяем что вариант появился
    expect(await editPage.hasVariant(productData.variant.color)).toBe(true)
  })

  test('должны добавляться SKU к варианту товара "Платье Элегант"', async ({ page }) => {
    const productData = TEST_PRODUCTS[0]

    // Получаем товар из БД
    const product = await getProductByName(productData.name)
    expect(product).not.toBeNull()

    // Если у варианта уже есть SKU - пропускаем
    if (product!.variants[0]?.items.length >= productData.items.length) {
      test.skip(productsAlreadyExist, 'SKU уже созданы другим браузером')
      return
    }

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Разворачиваем вариант
    await editPage.expandVariant(productData.variant.color)

    // Добавляем SKU для каждого размера
    for (const itemData of productData.items) {
      // Находим размер в БД
      const size = femaleSizes.find((s: (typeof femaleSizes)[number]) => s.international === itemData.size)
      expect(size).toBeDefined()

      await editPage.addItem(productData.variant.color, {
        sizeId: size!.id,
        price: itemData.price,
        count: itemData.count,
      })
    }

    // Проверяем в БД что товары созданы
    const updatedProduct = await getProductByName(productData.name)
    expect(updatedProduct?.variants[0]?.items.length).toBe(productData.items.length)
  })

  test('должен создаваться товар "Блузка Минимал" с вариантом и SKU', async ({ page }) => {
    const productData = TEST_PRODUCTS[1]

    // Проверяем существует ли товар с полными данными
    const existingProduct = await getProductByName(productData.name)
    if (existingProduct && existingProduct.variants[0]?.items.length >= productData.items.length) {
      test.skip(productsAlreadyExist, 'Товар уже создан другим браузером')
      return
    }

    // Создаём товар если его нет
    if (!existingProduct) {
      const newPage = new AdminProductNewPage(page)
      await newPage.goto()
      await newPage.createProduct({
        name: productData.name,
        description: productData.description,
        gender: productData.gender,
      })
    }

    // Получаем товар из БД для получения ID
    const product = await getProductByName(productData.name)
    expect(product).not.toBeNull()

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Создаём вариант если его нет
    if (product!.variants.length === 0) {
      await editPage.createVariant({
        color: productData.variant.color,
        composition: productData.variant.composition,
      })
    }

    // Разворачиваем вариант
    await editPage.expandVariant(productData.variant.color)

    // Добавляем SKU если их нет
    const currentProduct = await getProductByName(productData.name)
    if ((currentProduct?.variants[0]?.items.length || 0) < productData.items.length) {
      for (const itemData of productData.items) {
        const size = femaleSizes.find((s: (typeof femaleSizes)[number]) => s.international === itemData.size)
        expect(size).toBeDefined()

        await editPage.addItem(productData.variant.color, {
          sizeId: size!.id,
          price: itemData.price,
          count: itemData.count,
        })
      }
    }

    // Проверяем в БД
    const updatedProduct = await getProductByName(productData.name)
    expect(updatedProduct).not.toBeNull()
    expect(updatedProduct?.variants.length).toBe(1)
    expect(updatedProduct?.variants[0]?.items.length).toBe(productData.items.length)
  })

  test('должен создаваться товар "Брюки Классик" с вариантом и SKU', async ({ page }) => {
    const productData = TEST_PRODUCTS[2]

    // Проверяем существует ли товар с полными данными
    const existingProduct = await getProductByName(productData.name)
    if (existingProduct && existingProduct.variants[0]?.items.length >= productData.items.length) {
      test.skip(productsAlreadyExist, 'Товар уже создан другим браузером')
      return
    }

    // Создаём товар если его нет
    if (!existingProduct) {
      const newPage = new AdminProductNewPage(page)
      await newPage.goto()
      await newPage.createProduct({
        name: productData.name,
        description: productData.description,
        gender: productData.gender,
      })
    }

    // Получаем товар из БД для получения ID
    const product = await getProductByName(productData.name)
    expect(product).not.toBeNull()

    const editPage = new AdminProductEditPage(page)
    await editPage.goto(product!.id)

    // Создаём вариант если его нет
    if (product!.variants.length === 0) {
      await editPage.createVariant({
        color: productData.variant.color,
        composition: productData.variant.composition,
      })
    }

    // Разворачиваем вариант
    await editPage.expandVariant(productData.variant.color)

    // Добавляем SKU если их нет
    const currentProduct = await getProductByName(productData.name)
    if ((currentProduct?.variants[0]?.items.length || 0) < productData.items.length) {
      for (const itemData of productData.items) {
        const size = femaleSizes.find((s: (typeof femaleSizes)[number]) => s.international === itemData.size)
        expect(size).toBeDefined()

        await editPage.addItem(productData.variant.color, {
          sizeId: size!.id,
          price: itemData.price,
          count: itemData.count,
        })
      }
    }

    // Проверяем в БД
    const updatedProduct = await getProductByName(productData.name)
    expect(updatedProduct).not.toBeNull()
    expect(updatedProduct?.variants.length).toBe(1)
    expect(updatedProduct?.variants[0]?.items.length).toBe(productData.items.length)
  })

  test('все товары должны отображаться в списке', async ({ page }) => {
    const listPage = new AdminProductsListPage(page)
    await listPage.goto()

    // Проверяем наличие всех товаров
    for (const productData of TEST_PRODUCTS) {
      await expect(page.locator(`text="${productData.name}"`).first()).toBeVisible()
    }
  })

  test('итого должно быть минимум 3 товара в БД', async () => {
    const count = await getProductsCount()
    expect(count).toBeGreaterThanOrEqual(3)

    // Проверяем детали каждого товара
    for (const productData of TEST_PRODUCTS) {
      const product = await getProductByName(productData.name)
      expect(product).not.toBeNull()
      expect(product?.gender).toBe(productData.gender)
      expect(product?.variants.length).toBeGreaterThanOrEqual(1)
      expect(product?.variants[0]?.color).toBe(productData.variant.color)
      expect(product?.variants[0]?.composition).toBe(productData.variant.composition)
      // items.length может быть больше из-за seed данных
      expect(product?.variants[0]?.items.length).toBeGreaterThanOrEqual(productData.items.length)
    }
  })
})
