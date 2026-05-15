/**
 * Page Objects для статических информационных страниц
 */
import type { Locator, Page } from '@playwright/test'

import { localePath } from '../../config/i18n'

/**
 * Page Object для главной страницы /
 */
export class HomePage {
  readonly page: Page
  readonly url = localePath('/')

  // Навигация (ищем по data-testid и ролям, а не по тегам header/main)
  readonly logo: Locator
  readonly navCatalog: Locator
  readonly navAbout: Locator
  readonly navContacts: Locator
  readonly cartButton: Locator
  readonly navigation: Locator

  // Основной контент (используем body > div структуру вместо main)
  readonly heroSection: Locator
  readonly catalogLink: Locator
  readonly pageTitle: Locator

  // Футер
  readonly footer: Locator
  readonly footerLinks: Locator

  constructor(page: Page) {
    this.page = page

    // Навигация - логотип в LinkBox с href="/"
    this.logo = page.locator(`a[href="${localePath('/')}"]`).first()
    this.navigation = page.locator('[data-testid="navigation"]')
    this.navCatalog = page.getByRole('link', { name: /каталог/i }).first()
    this.navAbout = page.getByRole('link', { name: /о бренде/i }).first()
    this.navContacts = page.getByRole('link', { name: /контакты/i }).first()
    // Корзина скрыта когда пуста - используем aria-label
    this.cartButton = page.getByLabel(/корзина/i)

    // Основной контент - заголовок страницы
    this.pageTitle = page.getByText(/премиум росстиль/i).first()
    this.heroSection = page.locator('body').first()
    this.catalogLink = page.getByRole('link', { name: /каталог|смотреть/i }).first()

    // Футер
    this.footer = page.locator('footer')
    this.footerLinks = page.locator('footer a')
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }
}

/**
 * Page Object для страницы О нас /about
 */
export class AboutPage {
  readonly page: Page
  readonly url = localePath('/about')

  // Заголовок - Chakra Heading рендерится как h2 по умолчанию
  readonly heading: Locator

  // Контент - используем body вместо main (main не существует в разметке)
  readonly content: Locator
  readonly brandStory: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы - ищем по тексту "О Бренде"
    this.heading = page.getByText(/^о бренде$/i).first()

    // Основной контент - body содержит контент
    this.content = page.locator('body')
    this.brandStory = page.getByText(/бренд|история|философия|росстиль|одежда/i).first()
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }
}

/**
 * Page Object для страницы Контакты /contacts
 */
export class ContactsPage {
  readonly page: Page
  readonly url = localePath('/contacts')

  // Заголовок
  readonly heading: Locator

  // Контактная информация
  readonly content: Locator
  readonly phoneNumber: Locator
  readonly email: Locator
  readonly socialLinks: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы - ищем по тексту "Контакты"
    this.heading = page.getByText(/^контакты$/i).first()

    // Контент - body содержит контент
    this.content = page.locator('body')
    this.phoneNumber = page.getByText(/\+7|8-|телефон/i).first()
    this.email = page.getByText(/@rosstil/i).first()
    this.socialLinks = page.locator('a[href*="telegram"], a[href*="instagram"], a[href*="vk.com"]')
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }
}

/**
 * Page Object для страницы Доставка /delivery
 */
export class DeliveryPage {
  readonly page: Page
  readonly url = localePath('/delivery')

  // Заголовок
  readonly heading: Locator

  // Контент
  readonly content: Locator
  readonly deliveryMethods: Locator
  readonly deliveryTerms: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы - ищем по тексту "Доставка"
    this.heading = page.getByText(/^доставка$/i).first()

    // Контент о доставке - body содержит контент
    this.content = page.locator('body')
    this.deliveryMethods = page.getByText(/способ|курьер|почта|сдэк|самовывоз/i).first()
    this.deliveryTerms = page.getByText(/срок|дн|рабочих/i).first()
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }
}

/**
 * Page Object для страницы Как купить /how-to-buy
 */
export class HowToBuyPage {
  readonly page: Page
  readonly url = localePath('/how-to-buy')

  // Заголовок
  readonly heading: Locator

  // Контент
  readonly content: Locator
  readonly steps: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы - ищем по тексту "Как купить"
    this.heading = page.getByText(/^как купить$/i).first()

    // Контент - шаги покупки - body содержит контент
    this.content = page.locator('body')
    this.steps = page.getByText(/выберите|свяжитесь|консультация|получение/i).first()
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }
}

/**
 * Page Object для страницы Реквизиты /requisites
 */
export class RequisitesPage {
  readonly page: Page
  readonly url = localePath('/requisites')

  // Заголовок
  readonly heading: Locator

  // Контент
  readonly content: Locator
  readonly companyName: Locator
  readonly inn: Locator
  readonly address: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы - ищем по тексту "Реквизиты"
    this.heading = page.getByText(/^реквизиты$/i).first()

    // Реквизиты компании - body содержит контент
    this.content = page.locator('body')
    this.companyName = page.getByText(/ип|ооо|аксянова/i).first()
    this.inn = page.getByText(/инн|огрн/i).first()
    this.address = page.getByText(/банк|сбербанк/i).first()
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }
}

/**
 * Page Object для страницы Калькулятор размеров /size-calculator
 */
export class SizeCalculatorPage {
  readonly page: Page
  readonly url = localePath('/size-calculator')

  // Заголовок
  readonly heading: Locator

  // Форма - MeasurementCalculator компонент
  readonly calculatorSection: Locator
  readonly bustInput: Locator
  readonly waistInput: Locator
  readonly hipsInput: Locator

  // Результат
  readonly resultSection: Locator
  readonly tipsSection: Locator

  constructor(page: Page) {
    this.page = page

    // Заголовок страницы - ищем по тексту "Калькулятор размеров"
    this.heading = page.getByText(/^калькулятор размеров$/i).first()

    // Форма калькулятора - ищем по тексту в форме
    this.calculatorSection = page.getByText(/обхват груди|введите мерки/i).first()
    this.bustInput = page.getByLabel(/обхват груди/i)
    this.waistInput = page.getByLabel(/обхват талии/i)
    this.hipsInput = page.getByLabel(/обхват бедер|обхват бёдер/i)

    // Результат
    this.resultSection = page.getByText(/рекомендуемый размер|ваш размер/i).first()
    this.tipsSection = page.getByText(/как правильно снять мерки/i).first()
  }

  async goto() {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }
}
