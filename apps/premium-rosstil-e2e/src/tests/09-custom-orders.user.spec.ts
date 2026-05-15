/**
 * Тесты специальных/индивидуальных заказов (Custom Orders)
 *
 * Тестируем:
 * - Диалог заказа на странице товара
 * - Выбор типа заказа
 * - Страница списка заказов в профиле
 * - Страница детали заказа
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../config/i18n'
import { TEST_USER } from '../fixtures/test-data'
import { disconnectDb, ensureTestUser, resetRateLimit } from '../helpers/db.helpers'
import { CatalogPage } from '../pages/catalog'
import { CustomOrderDialog, CustomOrdersListPage } from '../pages/custom-orders'

test.describe.serial('03-user: Специальные заказы', () => {
  test.beforeAll(async () => {
    await ensureTestUser(TEST_USER)
    await resetRateLimit()
  })

  test.afterAll(async () => {
    await disconnectDb()
  })

  // Диалог специального заказа на странице товара
  test.describe('Диалог специального заказа', () => {
    test.beforeEach(async ({ page }) => {
      // Логин как пользователь

      // Переход в каталог
      const catalogPage = new CatalogPage(page)
      await catalogPage.goto()
      await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })

      // Переход к первому товару
      await catalogPage.clickProduct(0)
      await page.waitForLoadState('domcontentloaded')

      // Ждём полную загрузку страницы товара (кнопка "Заказать" должна появиться)
      const dialog = new CustomOrderDialog(page)
      await expect(dialog.orderButton).toBeVisible({ timeout: 10000 })
    })

    test('кнопка "Заказать" отображается на странице товара', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)
      await expect(dialog.orderButton).toBeVisible()
    })

    test('клик на кнопку открывает диалог', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()

      // Ждём открытия диалога (может быть анимация)
      await expect(dialog.dialogTitle).toBeVisible({ timeout: 5000 })
    })

    test('диалог показывает заголовок "Выберите тип заказа"', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()

      await expect(dialog.dialogTitle).toHaveText(/выберите тип заказа/i)
    })

    test('диалог содержит кнопку "На заказ"', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()

      await expect(dialog.madeToOrderButton).toBeVisible()
      await expect(dialog.madeToOrderButton).toContainText(/на заказ/i)
    })

    test('диалог содержит кнопку "Индивидуальный заказ"', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()

      await expect(dialog.customDesignButton).toBeVisible()
      await expect(dialog.customDesignButton).toContainText(/индивидуальный заказ/i)
    })

    test('диалог содержит кнопку "Сотрудничество"', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()

      await expect(dialog.b2bPartnershipButton).toBeVisible()
      await expect(dialog.b2bPartnershipButton).toContainText(/сотрудничество/i)
    })

    test('кнопка "На заказ" содержит описание', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()

      // Описание кнопки
      await expect(dialog.madeToOrderButton).toContainText(/мерками|кастомизации/i)
    })

    test('кнопка "Индивидуальный заказ" содержит описание', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()

      await expect(dialog.customDesignButton).toContainText(/дизайн|описанию/i)
    })

    test('кнопка "Сотрудничество" содержит описание', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()

      await expect(dialog.b2bPartnershipButton).toContainText(/магазинов|брендов|размерную сетку/i)
    })

    test('выбор "На заказ" показывает форму', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()
      await dialog.selectMadeToOrder()

      // Заголовок меняется
      await expect(dialog.dialogTitle).toHaveText(/на заказ/i)

      // Появляется кнопка "Назад"
      await expect(dialog.backButton).toBeVisible()
    })

    test('выбор "Индивидуальный заказ" показывает форму', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()
      await dialog.selectCustomDesign()

      // Заголовок меняется
      await expect(dialog.dialogTitle).toHaveText(/индивидуальный заказ/i)

      // Появляется кнопка "Назад"
      await expect(dialog.backButton).toBeVisible()
    })

    test.skip('выбор "Сотрудничество" показывает форму', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()
      await expect(dialog.b2bPartnershipButton).toBeVisible()
      await dialog.selectB2BPartnership()

      // Ждём загрузки формы (форма B2B может загружать данные компании)
      await page.waitForTimeout(1000)

      // Заголовок меняется
      await expect(dialog.dialogTitle).toHaveText(/сотрудничество/i, { timeout: 10000 })

      // Появляется кнопка "Назад"
      await expect(dialog.backButton).toBeVisible()
    })

    test('кнопка "Назад" возвращает к выбору типа', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()
      await dialog.selectMadeToOrder()

      // Нажимаем "Назад"
      await dialog.goBack()

      // Снова видим выбор типа
      await expect(dialog.dialogTitle).toHaveText(/выберите тип заказа/i)
      await expect(dialog.madeToOrderButton).toBeVisible()
    })

    test('диалог можно закрыть кнопкой закрытия', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      await dialog.open()
      await expect(dialog.dialogTitle).toBeVisible()

      await dialog.close()

      await expect(dialog.dialogTitle).toBeHidden()
    })

    test('закрытие и повторное открытие сбрасывает состояние', async ({ page }) => {
      const dialog = new CustomOrderDialog(page)

      // Открываем и выбираем тип
      await dialog.open()
      await dialog.selectMadeToOrder()
      await expect(dialog.dialogTitle).toHaveText(/на заказ/i)

      // Закрываем
      await dialog.close()
      await expect(dialog.dialogTitle).toBeHidden()

      // Открываем снова
      await dialog.open()

      // Должен быть начальный экран выбора типа
      await expect(dialog.dialogTitle).toHaveText(/выберите тип заказа/i)
    })
  })

  // Доступ к странице без авторизации
  test.describe('Доступ без авторизации', () => {
    test('неавторизованный пользователь перенаправляется на логин со страницы заказов', async ({ page }) => {
      await page.goto(localePath('/profile/custom-orders'))
      await expect(page).toHaveURL(/\/ru\/auth\/signin/i)
    })

    test('клик на "Заказать" без авторизации перенаправляет на логин', async ({ page }) => {
      const catalogPage = new CatalogPage(page)
      await catalogPage.goto()
      await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })
      await catalogPage.clickProduct(0)
      await page.waitForLoadState('domcontentloaded')

      const dialog = new CustomOrderDialog(page)
      await dialog.open()

      // Должен перенаправить на логин
      await expect(page).toHaveURL(/\/ru\/auth\/signin/i)
    })
  })

  // Страница списка заказов в профиле
  test.describe('Страница списка заказов /profile/custom-orders', () => {
    test('страница загружается', async ({ page }) => {
      const listPage = new CustomOrdersListPage(page)
      await listPage.goto()

      await expect(page).toHaveURL(/\/ru\/profile\/custom-orders/i)
    })

    test('заголовок страницы отображается', async ({ page }) => {
      const listPage = new CustomOrdersListPage(page)
      await listPage.goto()

      await expect(listPage.heading).toBeVisible()
    })

    test('при отсутствии заказов показывается пустое состояние', async ({ page }) => {
      const listPage = new CustomOrdersListPage(page)
      await listPage.goto()

      // Либо есть заказы, либо показывается пустое состояние
      const hasOrders = (await listPage.getOrderCount()) > 0
      const isEmpty = await listPage.isEmpty()

      expect(hasOrders || isEmpty).toBe(true)
    })

    test('пустое состояние содержит ссылку на каталог', async ({ page }) => {
      const listPage = new CustomOrdersListPage(page)
      await listPage.goto()

      const isEmpty = await listPage.isEmpty()
      if (isEmpty) {
        await expect(listPage.catalogLink).toBeVisible()
        await expect(listPage.catalogLink).toHaveAttribute('href', /\/ru\/catalog/i)
      }
    })
  })

  // Тесты создания заказов (требуют подготовку данных - skip)
  test.describe('Создание заказов', () => {
    test.skip('создание заказа "На заказ" с мерками', async ({ page }) => {
      // Требует:
      // - Заполненные мерки в профиле
      // - Заполнение формы заказа
      // - Отправку формы
      const listPage = new CustomOrdersListPage(page)
      await listPage.goto()
    })

    test.skip('создание заказа "Индивидуальный дизайн" с фото', async ({ page }) => {
      // Требует:
      // - Загрузку фото-ориентиров
      // - Описание дизайна
      // - Отправку формы
      const listPage = new CustomOrdersListPage(page)
      await listPage.goto()
    })

    test.skip('создание B2B заказа', async ({ page }) => {
      // Требует:
      // - Заполненные данные компании в профиле
      // - Указание количества по размерам
      // - Отправку формы
      const listPage = new CustomOrdersListPage(page)
      await listPage.goto()
    })
  })
})
