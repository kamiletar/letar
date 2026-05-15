/**
 * Page Objects для страниц оформления заказа
 */
import type { Locator, Page } from '@playwright/test'

/**
 * Page Object для страницы оформления заказа /checkout
 */
export class CheckoutPage {
  readonly page: Page
  readonly url = '/checkout'

  // Заголовок
  readonly heading: Locator

  // Секция информации о покупателе
  readonly customerInfoSection: Locator
  readonly customerNameInput: Locator
  readonly customerPhoneInput: Locator
  readonly customerEmailInput: Locator

  // Секция адреса доставки
  readonly deliveryAddressSection: Locator
  readonly savedAddressesBlock: Locator
  readonly newAddressOption: Locator
  readonly addressInput: Locator

  // Комментарий
  readonly notesTextarea: Locator

  // Сводка заказа
  readonly orderSummary: Locator
  readonly orderItems: Locator
  readonly totalAmount: Locator

  // Кнопка оформления
  readonly submitButton: Locator

  // Ошибки формы
  readonly formErrors: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы
    this.heading = page.getByRole('heading', { name: /оформление заказа/i })

    // Секция информации о покупателе
    this.customerInfoSection = page.getByText(/информация о покупателе/i).locator('..')
    this.customerNameInput = page.getByLabel(/имя и фамилия/i)
    this.customerPhoneInput = page.getByLabel(/телефон/i)
    this.customerEmailInput = page.getByLabel(/email/i)

    // Секция адреса доставки
    this.deliveryAddressSection = page.getByText(/адрес доставки/i).locator('..')
    this.savedAddressesBlock = page.getByText(/сохраненные адреса/i).locator('..')
    this.newAddressOption = page.getByText(/ввести новый адрес/i)
    // Поле адреса - это видимый input от react-dadata с placeholder
    this.addressInput = page.getByPlaceholder(/введите адрес доставки/i)

    // Комментарий
    this.notesTextarea = page.getByLabel(/комментарий к заказу/i)

    // Сводка заказа
    this.orderSummary = page.getByText(/ваш заказ/i).locator('..')
    this.orderItems = this.orderSummary.locator('[data-testid="order-item"]')
    this.totalAmount = page.getByText(/итого:/i).locator('..')

    // Кнопка оформления
    this.submitButton = page.getByRole('button', { name: /оформить заказ/i })

    // Ошибки формы
    this.formErrors = page.locator('[data-part="error-text"]')
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Проверить, есть ли сохраненные адреса
   */
  async hasSavedAddresses(): Promise<boolean> {
    return (await this.savedAddressesBlock.count()) > 0
  }

  /**
   * Выбрать сохраненный адрес по названию
   */
  async selectSavedAddress(label: string) {
    const addressOption = this.page.getByText(label, { exact: false }).first()
    await addressOption.click()
  }

  /**
   * Выбрать "Ввести новый адрес"
   */
  async selectNewAddress() {
    await this.newAddressOption.click()
  }

  /**
   * Заполнить форму оформления заказа
   */
  async fillForm(data: { name?: string; phone?: string; email?: string; address?: string; notes?: string }) {
    if (data.name) {
      await this.customerNameInput.click()
      await this.customerNameInput.clear()
      await this.customerNameInput.fill(data.name)
    }
    if (data.phone) {
      await this.customerPhoneInput.click()
      await this.customerPhoneInput.clear()
      await this.customerPhoneInput.fill(data.phone)
    }
    if (data.email) {
      await this.customerEmailInput.click()
      await this.customerEmailInput.clear()
      await this.customerEmailInput.fill(data.email)
    }
    if (data.address) {
      // Если есть сохранённые адреса, нужно выбрать "ввести новый адрес"
      const hasSavedAddresses = await this.hasSavedAddresses()
      if (hasSavedAddresses) {
        await this.selectNewAddress()
      }
      await this.addressInput.click()
      await this.addressInput.clear()
      await this.addressInput.fill(data.address)

      // Ждём подсказки DaData и выбираем первую
      const suggestions = this.page.locator('.dadata-suggestions > div')

      await this.page.waitForTimeout(2000)

      const suggestionsCount = await suggestions.count()
      if (suggestionsCount > 0) {
        await suggestions.first().click()
      } else {
        // Если DaData не работает, заполняем скрытое поле напрямую
        await this.page.evaluate((address) => {
          const hiddenInput = document.querySelector('input[name="deliveryAddress"][hidden]') as HTMLInputElement
          if (hiddenInput) {
            hiddenInput.value = address
            // Триггерим change event для React/Conform
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }))
            hiddenInput.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }, data.address)
      }
    }
    if (data.notes) {
      await this.notesTextarea.click()
      await this.notesTextarea.fill(data.notes)
    }
  }

  /**
   * Получить количество товаров в сводке
   */
  async getOrderItemsCount(): Promise<number> {
    // Считаем количество строк товаров в сводке
    const itemRows = this.orderSummary.locator('[data-testid="order-item"]')
    const count = await itemRows.count()
    if (count > 0) {
      return count
    }
    // Если нет data-testid, считаем по структуре
    const itemsText = this.page.getByText(/товар/)
    return await itemsText.count()
  }

  /**
   * Получить итоговую сумму
   */
  async getTotalAmount(): Promise<string | null> {
    const totalText = this.page
      .getByText(/итого:/i)
      .locator('..')
      .locator('text=/₽/')
    return (await totalText.count()) > 0 ? await totalText.textContent() : null
  }

  /**
   * Отправить форму
   */
  async submit() {
    await this.submitButton.click()
  }

  /**
   * Проверить наличие ошибок валидации
   */
  async hasValidationErrors(): Promise<boolean> {
    return (await this.formErrors.count()) > 0
  }

  /**
   * Получить тексты ошибок валидации
   */
  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = []
    const count = await this.formErrors.count()
    for (let i = 0; i < count; i++) {
      const text = await this.formErrors.nth(i).textContent()
      if (text) {
        errors.push(text)
      }
    }
    return errors
  }
}

/**
 * Page Object для страницы успешного оформления /checkout/success
 */
export class CheckoutSuccessPage {
  readonly page: Page

  // Основные элементы
  readonly successIcon: Locator
  readonly heading: Locator
  readonly orderNumber: Locator
  readonly successMessage: Locator

  // Кнопки навигации
  readonly continueShopping: Locator
  readonly goToProfile: Locator

  // Блок с контактами
  readonly contactsBlock: Locator

  constructor(page: Page) {
    this.page = page

    // Иконка успеха (зеленая галочка)
    this.successIcon = page
      .locator('svg')
      .filter({ has: page.locator('[fill="currentColor"]') })
      .first()

    // Заголовок
    this.heading = page.getByRole('heading', { name: /заказ успешно оформлен/i })

    // Номер заказа
    this.orderNumber = page.getByText(/номер заказа:/i)

    // Сообщение об успехе
    this.successMessage = page.getByText(/спасибо за ваш заказ/i)

    // Кнопки навигации
    this.continueShopping = page.getByRole('link', { name: /продолжить покупки/i })
    this.goToProfile = page.getByRole('link', { name: /перейти в личный кабинет/i })

    // Блок контактов
    this.contactsBlock = page.getByText(/остались вопросы/i).locator('..')
  }

  /**
   * Получить номер заказа
   */
  async getOrderNumber(): Promise<string | null> {
    const text = await this.orderNumber.textContent()
    if (!text) {
      return null
    }
    // Извлекаем номер заказа из текста "Номер заказа: ORD-XXXXX"
    const match = text.match(/ORD-\d+/i)
    return match ? match[0] : null
  }
}
