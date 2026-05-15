/**
 * Page Object для страниц управления товарами в админке
 */
import type { Locator, Page } from '@playwright/test'
import * as path from 'path'

import { LOCALE_PREFIX, localePath } from '../../config/i18n'

// Путь к тестовым изображениям в основном приложении premium-rosstil
const TEST_IMAGES_DIR = path.resolve(
  __dirname,
  '../../../../premium-rosstil/src/app/[locale]/catalog/_components/_images'
)

/**
 * Page Object для списка товаров /admin/products
 */
export class AdminProductsListPage {
  readonly page: Page
  readonly url = localePath('/admin/products')

  readonly heading: Locator
  readonly createButton: Locator
  readonly productsGrid: Locator
  readonly emptyState: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1, h2', { hasText: 'Продукты' }).first()
    this.createButton = page.getByRole('link', { name: 'Создать продукт' })
    this.productsGrid = page.locator('[data-testid="products-grid"], .css-grid, [class*="grid"]').first()
    this.emptyState = page.locator('text=Нет продуктов')
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Получить карточку товара по названию
   */
  getProductCard(name: string): Locator {
    return this.page.locator('[class*="card"], [data-testid="product-card"]', {
      has: this.page.locator(`text="${name}"`),
    })
  }

  /**
   * Проверить существование товара в списке
   */
  async hasProduct(name: string): Promise<boolean> {
    const card = this.getProductCard(name)
    return (await card.count()) > 0
  }

  /**
   * Перейти к редактированию товара
   */
  async editProduct(name: string) {
    const card = this.getProductCard(name)
    await card.locator('a', { hasText: /редактировать/i }).click()
  }
}

/**
 * Page Object для создания товара /admin/products/new
 */
export class AdminProductNewPage {
  readonly page: Page
  readonly url = localePath('/admin/products/new')

  readonly heading: Locator
  readonly backLink: Locator

  // Поля формы
  readonly nameInput: Locator
  readonly descriptionTextarea: Locator
  // GenderSelect использует Chakra UI Select с hidden input
  readonly genderSelectTrigger: Locator
  readonly genderSelectContent: Locator

  // Кнопка отправки
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1, h2', { hasText: 'Создать новый продукт' }).first()
    this.backLink = page.locator('a', { hasText: '← Вернуться к списку продуктов' })

    // Поля формы (по placeholder, так как Conform генерирует динамические имена)
    this.nameInput = page.getByPlaceholder('Введите название продукта')
    this.descriptionTextarea = page.getByPlaceholder('Введите описание продукта')
    // GenderSelect - Chakra UI Select с trigger кнопкой
    this.genderSelectTrigger = page.locator('[data-part="trigger"]', { hasText: /Выберите пол|Мужской|Женский/ })
    this.genderSelectContent = page.locator('[data-part="content"]')

    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Создать продукт' })
  }

  async goto() {
    await this.page.goto(this.url)
  }

  /**
   * Выбрать пол в Chakra UI Select
   */
  async selectGender(gender: 'FEMALE' | 'MALE') {
    // Ждём готовности trigger
    await this.genderSelectTrigger.waitFor({ state: 'visible' })

    // Кликаем на trigger чтобы открыть dropdown
    await this.genderSelectTrigger.click()

    // Ждём появления listbox (Portal рендерит вне основного DOM)
    const listbox = this.page.getByRole('listbox')
    await listbox.waitFor({ state: 'visible', timeout: 10000 })

    // Выбираем нужную опцию
    const label = gender === 'FEMALE' ? 'Женский' : 'Мужской'
    const option = this.page.getByRole('option', { name: label })
    await option.click()

    // Ждём закрытия listbox
    await listbox.waitFor({ state: 'hidden', timeout: 5000 })
  }

  /**
   * Заполнить и отправить форму создания товара
   * После успеха редиректит на /admin/products (список)
   */
  async createProduct(data: { name: string; description?: string; gender: 'FEMALE' | 'MALE' }) {
    // Ждём загрузки формы и видимости полей
    await this.nameInput.waitFor({ state: 'visible' })

    // Очищаем и заполняем поле названия
    await this.nameInput.clear()
    await this.nameInput.pressSequentially(data.name, { delay: 50 })

    // Верифицируем что значение есть
    const nameValue = await this.nameInput.inputValue()
    if (nameValue !== data.name) {
      throw new Error(`Name input not filled correctly. Expected: "${data.name}", got: "${nameValue}"`)
    }

    if (data.description) {
      await this.descriptionTextarea.clear()
      await this.descriptionTextarea.pressSequentially(data.description, { delay: 20 })
    }

    // Выбираем пол
    await this.selectGender(data.gender)

    // Верифицируем что значение названия всё ещё есть (не сбросилось после select)
    const nameValueAfterGender = await this.nameInput.inputValue()
    if (nameValueAfterGender !== data.name) {
      throw new Error(
        `Name input was reset after gender select. Expected: "${data.name}", got: "${nameValueAfterGender}"`
      )
    }

    // Отправляем форму
    await this.submitButton.click()

    // Ждём редиректа
    await this.page.waitForURL(new RegExp(`${LOCALE_PREFIX}/admin/products/?$`), { timeout: 30000 })
  }
}

/**
 * Page Object для редактирования товара /admin/products/[id]/edit
 */
export class AdminProductEditPage {
  readonly page: Page

  readonly heading: Locator
  readonly backLink: Locator
  readonly viewInCatalogButton: Locator
  readonly deleteButton: Locator

  // Секция основной информации
  readonly basicInfoSection: Locator
  readonly nameInput: Locator
  readonly descriptionTextarea: Locator
  readonly genderSelect: Locator
  readonly categorySelectTrigger: Locator
  readonly saveBasicInfoButton: Locator

  // Секция вариантов
  readonly variantsSection: Locator
  readonly addVariantButton: Locator
  readonly noVariantsMessage: Locator

  // Диалог создания/редактирования варианта
  readonly variantDialog: Locator
  readonly variantColorInput: Locator
  readonly variantCompositionTextarea: Locator
  readonly variantSubmitButton: Locator
  readonly variantCancelButton: Locator

  // Диалог создания/редактирования товара (ProductItem)
  readonly itemDialog: Locator
  // SizeSelect - Chakra UI Select с trigger кнопкой
  readonly itemSizeSelectTrigger: Locator
  readonly itemSizeSelectContent: Locator
  readonly itemPriceInput: Locator
  readonly itemCountInput: Locator
  readonly itemSubmitButton: Locator
  readonly itemCancelButton: Locator

  constructor(page: Page) {
    this.page = page

    this.heading = page.locator('h1, h2', { hasText: 'Редактировать продукт' }).first()
    this.backLink = page.locator('a', { hasText: '← Вернуться к списку продуктов' })
    this.viewInCatalogButton = page.locator('a', { hasText: 'Просмотр в каталоге' })
    this.deleteButton = page.locator('button', { hasText: 'Удалить продукт' })

    // Секция основной информации
    this.basicInfoSection = page.locator('h2, h3', { hasText: 'Основная информация' }).locator('..')
    this.nameInput = page.locator('input[name="name"]')
    this.descriptionTextarea = page.locator('textarea[name="description"]')
    this.genderSelect = page.locator('select[name="gender"]')
    // CategorySelect - Chakra UI Select с trigger кнопкой
    // Ищем Field.Root с label "Категория", затем внутри него trigger
    this.categorySelectTrigger = page
      .locator('label', { hasText: 'Категория' })
      .locator('..')
      .locator('[data-part="trigger"]')
    this.saveBasicInfoButton = page.locator('button[type="submit"]', { hasText: 'Сохранить изменения' })

    // Секция вариантов
    this.variantsSection = page.locator('h2, h3', { hasText: 'Варианты продукта' }).locator('..').locator('..')
    this.addVariantButton = page.locator('button', { hasText: /Создать вариант|Добавить вариант/ })
    this.noVariantsMessage = page.locator('text=У этого продукта пока нет вариантов')

    // Диалог варианта
    this.variantDialog = page.locator('[role="dialog"]', {
      has: page.locator('text=/Создать вариант|Редактировать вариант/'),
    })
    this.variantColorInput = this.variantDialog.locator('input[name="color"]')
    this.variantCompositionTextarea = this.variantDialog.locator('textarea[name="composition"]')
    this.variantSubmitButton = this.variantDialog.locator('button[type="submit"]')
    this.variantCancelButton = this.variantDialog.locator('button', { hasText: 'Отмена' })

    // Диалог товара (ProductItem)
    this.itemDialog = page.locator('[role="dialog"]', {
      has: page.locator('text=/Добавить товар|Редактировать товар/'),
    })
    // SizeSelect - Chakra UI Select с trigger кнопкой
    this.itemSizeSelectTrigger = this.itemDialog.locator('[data-part="trigger"]', { hasText: /Выберите размер|RU/ })
    // Используем getByRole для точного поиска listbox размеров
    this.itemSizeSelectContent = page.getByRole('listbox', { name: 'Размер' })
    this.itemPriceInput = this.itemDialog.locator('input[name="price"]')
    this.itemCountInput = this.itemDialog.locator('input[name="availableCount"]')
    this.itemSubmitButton = this.itemDialog.locator('button[type="submit"]')
    this.itemCancelButton = this.itemDialog.locator('button', { hasText: 'Отмена' })
  }

  /**
   * Перейти на страницу редактирования товара по ID
   */
  async goto(productId: string) {
    await this.page.goto(localePath(`/admin/products/${productId}/edit`))
  }

  /**
   * Получить карточку варианта по цвету
   */
  getVariantCard(color: string): Locator {
    return this.page.locator('[class*="card"]', {
      has: this.page.locator(`text="${color}"`),
    })
  }

  /**
   * Открыть диалог создания варианта
   */
  async openCreateVariantDialog() {
    await this.addVariantButton.click()
    await this.variantDialog.waitFor({ state: 'visible' })
  }

  /**
   * Создать вариант товара
   */
  async createVariant(data: { color: string; composition: string }) {
    await this.openCreateVariantDialog()

    // click перед fill для совместимости с WebKit
    await this.variantColorInput.click()
    await this.variantColorInput.fill(data.color)

    await this.variantCompositionTextarea.click()
    await this.variantCompositionTextarea.fill(data.composition)

    await this.variantSubmitButton.click()

    // Ждём закрытия диалога
    await this.variantDialog.waitFor({ state: 'hidden' })

    // Ждём обновления страницы (revalidatePath)
    await this.page.waitForTimeout(1000)
  }

  /**
   * Развернуть карточку варианта (показать товары и изображения)
   */
  async expandVariant(color: string) {
    const card = this.getVariantCard(color)
    const expandButton = card.locator('button', { hasText: 'Показать' })
    if (await expandButton.isVisible()) {
      await expandButton.click()
    }
  }

  /**
   * Свернуть карточку варианта
   */
  async collapseVariant(color: string) {
    const card = this.getVariantCard(color)
    const collapseButton = card.locator('button', { hasText: 'Скрыть' })
    if (await collapseButton.isVisible()) {
      await collapseButton.click()
    }
  }

  /**
   * Открыть диалог добавления товара (ProductItem) для варианта
   */
  async openAddItemDialog(variantColor: string) {
    const card = this.getVariantCard(variantColor)
    const addButton = card.locator('button', { hasText: 'Добавить товар' })
    await addButton.click()
    await this.itemDialog.waitFor({ state: 'visible' })
  }

  /**
   * Выбрать размер в Chakra UI Select
   */
  async selectSize(sizeId: string) {
    // Кликаем на trigger чтобы открыть dropdown
    await this.itemSizeSelectTrigger.click()

    // Ждём появления контента
    await this.itemSizeSelectContent.waitFor({ state: 'visible' })

    // Находим опцию по data-value и кликаем
    await this.itemSizeSelectContent.locator(`[data-value="${sizeId}"]`).click()

    // Ждём закрытия dropdown
    await this.itemSizeSelectContent.waitFor({ state: 'hidden' })
  }

  /**
   * Добавить товар (ProductItem) к варианту
   */
  async addItem(variantColor: string, data: { sizeId: string; price: number; count: number }) {
    await this.openAddItemDialog(variantColor)

    await this.selectSize(data.sizeId)

    // click перед fill для совместимости с WebKit
    await this.itemPriceInput.click()
    await this.itemPriceInput.fill(data.price.toString())

    await this.itemCountInput.click()
    await this.itemCountInput.fill(data.count.toString())

    await this.itemSubmitButton.click()

    // Ждём закрытия диалога
    await this.itemDialog.waitFor({ state: 'hidden' })

    // Ждём обновления страницы
    await this.page.waitForTimeout(1000)
  }

  /**
   * Получить количество товаров (ProductItems) в варианте
   */
  async getItemsCount(variantColor: string): Promise<number> {
    const card = this.getVariantCard(variantColor)
    const itemsHeading = card.locator('h4, h5', { hasText: /Товары \((\d+)\)/ })
    const text = await itemsHeading.textContent()
    const match = text?.match(/Товары \((\d+)\)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Открыть секцию загрузки изображений для варианта
   */
  async openImageUpload(variantColor: string) {
    const card = this.getVariantCard(variantColor)

    // Находим кнопку "Добавить изображения" в секции VariantImages
    const addImagesButton = card.locator('button', { hasText: 'Добавить изображения' })

    // Если кнопка видна - кликаем для показа dropzone
    if (await addImagesButton.isVisible()) {
      await addImagesButton.click()
      // Ждём появления dropzone
      await card.locator('input[type="file"]').waitFor({ state: 'attached' })
    }
  }

  /**
   * Загрузить изображения к варианту
   */
  async uploadImages(variantColor: string, imageFiles: string[]) {
    const card = this.getVariantCard(variantColor)

    // Сначала открываем секцию загрузки
    await this.openImageUpload(variantColor)

    // Находим input для файлов
    const fileInput = card.locator('input[type="file"]')

    // Формируем полные пути к изображениям
    const filePaths = imageFiles.map((file) => path.join(TEST_IMAGES_DIR, file))

    // Загружаем файлы через input
    await fileInput.setInputFiles(filePaths)

    // Ждём появления файлов в превью списке
    await card.locator('text=Файлов:').waitFor({ state: 'visible' })

    // Нажимаем "Загрузить все"
    const uploadButton = card.locator('button', { hasText: 'Загрузить все' })
    await uploadButton.click()

    // Ждём появления toast об успехе или завершения загрузки
    // Используем более надёжный способ - ожидаем исчезновения кнопки "Загрузить все"
    // (после успешной загрузки список файлов очищается)
    await uploadButton.waitFor({ state: 'hidden', timeout: 30000 })

    // Дополнительно ждём обновления страницы
    await this.page.waitForTimeout(1000)
  }

  /**
   * Получить количество изображений варианта
   * Заголовок имеет формат "Изображения (N)" в компоненте VariantImages
   */
  async getImagesCount(variantColor: string): Promise<number> {
    const card = this.getVariantCard(variantColor)
    // Используем более универсальный локатор - ищем любой элемент с текстом "Изображения (N)"
    const imagesHeading = card.locator('text=/Изображения \\(\\d+\\)/').first()

    if (!(await imagesHeading.isVisible())) {
      return 0
    }

    const text = await imagesHeading.textContent()
    const match = text?.match(/Изображения \((\d+)\)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Проверить, что вариант существует
   */
  async hasVariant(color: string): Promise<boolean> {
    const card = this.getVariantCard(color)
    return (await card.count()) > 0
  }

  /**
   * Выбрать категорию в Chakra UI Select
   * @param categoryName Название категории или 'Без категории'
   */
  async selectCategory(categoryName: string) {
    // Кликаем на trigger чтобы открыть dropdown
    await this.categorySelectTrigger.click()

    // Ждём появления listbox (Portal рендерит вне основного DOM)
    const listbox = this.page.getByRole('listbox')
    await listbox.waitFor({ state: 'visible', timeout: 10000 })

    // Выбираем нужную опцию по имени
    const option = this.page.getByRole('option', { name: categoryName })
    await option.click()

    // Ждём закрытия listbox
    await listbox.waitFor({ state: 'hidden', timeout: 5000 })
  }

  /**
   * Обновить основную информацию о товаре (включая категорию)
   * После сохранения происходит редирект на /admin/products
   */
  async updateBasicInfo(data: { name?: string; description?: string; categoryName?: string }) {
    if (data.name) {
      await this.nameInput.click()
      await this.nameInput.clear()
      await this.nameInput.fill(data.name)
    }

    if (data.description) {
      await this.descriptionTextarea.click()
      await this.descriptionTextarea.clear()
      await this.descriptionTextarea.fill(data.description)
    }

    if (data.categoryName) {
      await this.selectCategory(data.categoryName)
    }

    await this.saveBasicInfoButton.click()

    // Ждём редиректа на список продуктов
    await this.page.waitForURL(/\/admin\/products\/?$/, { timeout: 15000 })
  }

  /**
   * Получить текущее значение категории
   */
  async getCurrentCategory(): Promise<string> {
    const triggerText = await this.categorySelectTrigger.textContent()
    return triggerText?.trim() || ''
  }
}
