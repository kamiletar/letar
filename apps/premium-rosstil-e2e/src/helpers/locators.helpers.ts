/**
 * Хелперы для локаторов в E2E тестах
 *
 * Замена хрупких .chakra-* селекторов на стабильные локаторы.
 * Использует data-scope атрибуты Chakra UI v3 и ARIA роли.
 *
 * По образцу driving-school-e2e — обе используют Chakra UI v3.
 */
import type { Locator, Page } from '@playwright/test'

/**
 * Стабильные локаторы для Chakra UI v3 компонентов
 *
 * @example
 * await Locators.card(page).first().click()
 * await expect(Locators.toast(page)).toBeVisible()
 */
export const Locators = {
  /**
   * Карточка (Card) — заменяет .chakra-card__root
   */
  card: (page: Page): Locator => page.locator('[data-scope="card"], .chakra-card__root, article, [role="article"]'),

  /**
   * Toast-уведомление — заменяет .chakra-toast
   */
  toast: (page: Page): Locator => page.locator('[data-toaster] [role="alert"], [role="status"], [data-scope="toast"]'),

  /**
   * Badge — заменяет .chakra-badge
   */
  badge: (page: Page): Locator => page.locator('[data-scope="badge"]'),

  /**
   * Modal/Dialog — заменяет .chakra-modal__content
   */
  modal: (page: Page): Locator => page.locator('[role="dialog"]'),

  /**
   * Drawer — заменяет .chakra-drawer__content
   */
  drawer: (page: Page): Locator =>
    page.locator('[role="dialog"][data-scope="drawer"]').or(page.locator('[role="dialog"]')),

  /**
   * Menu — заменяет .chakra-menu__list
   */
  menu: (page: Page): Locator => page.locator('[role="menu"]'),

  /**
   * MenuItem — заменяет .chakra-menu__menuitem
   */
  menuItem: (page: Page): Locator => page.locator('[role="menuitem"]'),

  /**
   * Alert — заменяет .chakra-alert
   */
  alert: (page: Page): Locator => page.locator('[role="alert"], [data-scope="alert"]'),

  /**
   * Spinner — заменяет .chakra-spinner
   */
  spinner: (page: Page): Locator => page.locator('[data-scope="spinner"], [role="status"][aria-busy="true"]'),

  /**
   * Checkbox — заменяет .chakra-checkbox
   */
  checkbox: (page: Page): Locator => page.locator('[data-scope="checkbox"], [role="checkbox"]'),

  /**
   * Radio — заменяет .chakra-radio
   */
  radio: (page: Page): Locator => page.locator('[data-scope="radio-group"] [role="radio"], [role="radio"]'),

  /**
   * Switch — заменяет .chakra-switch
   */
  switch: (page: Page): Locator => page.locator('[data-scope="switch"], [role="switch"]'),

  /**
   * Tab — заменяет .chakra-tabs__tab
   */
  tab: (page: Page): Locator => page.locator('[role="tab"]'),

  /**
   * TabPanel — заменяет .chakra-tabs__tab-panel
   */
  tabPanel: (page: Page): Locator => page.locator('[role="tabpanel"]'),

  /**
   * Accordion — заменяет .chakra-accordion
   */
  accordion: (page: Page): Locator => page.locator('[data-scope="accordion"]'),

  /**
   * AccordionItem — заменяет .chakra-accordion__item
   */
  accordionItem: (page: Page): Locator => page.locator('[data-scope="accordion"] [data-part="item"]'),

  /**
   * Popover — заменяет .chakra-popover__content
   */
  popover: (page: Page): Locator => page.locator('[data-scope="popover"] [data-part="content"], [role="dialog"]'),

  /**
   * Tooltip — заменяет .chakra-tooltip
   */
  tooltip: (page: Page): Locator => page.locator('[data-scope="tooltip"], [role="tooltip"]'),

  /**
   * PinInput — заменяет .chakra-pin-input
   */
  pinInput: (page: Page): Locator => page.locator('[data-scope="pin-input"], [data-part="control"]'),

  /**
   * Select — заменяет .chakra-select
   */
  select: (page: Page): Locator => page.locator('[data-scope="select"], select, [role="combobox"]'),

  /**
   * FormField — Field в Chakra v3
   */
  formField: (page: Page, fieldName: string): Locator => page.locator(`[data-field-name="${fieldName}"]`),

  /**
   * FormError — Field.ErrorText в Chakra v3
   */
  formError: (page: Page): Locator => page.locator('[data-part="error-text"], [id*="error"]'),

  /**
   * TagsInput — теги (для категорий, фильтров и т.д.)
   */
  tagsInput: (page: Page): Locator => page.locator('[data-scope="tags-input"], [data-part="item"]'),

  /**
   * Container — основной контейнер страницы, заменяет .chakra-container
   */
  container: (page: Page): Locator => page.locator('main, [role="main"]'),

  /**
   * Stepper — пошаговый индикатор, заменяет .chakra-stepper
   */
  stepper: (page: Page): Locator =>
    page.locator('[data-scope="steps"], [data-part="stepper"], [data-part="indicator"], [role="progressbar"]'),

  /**
   * Stat — статистический виджет, заменяет .chakra-stat__*
   */
  stat: (page: Page): Locator => page.locator('[data-scope="stat"]'),

  /**
   * Stat number — число в статистике, заменяет .chakra-stat__number
   */
  statNumber: (page: Page): Locator => page.locator('[data-scope="stat"] [data-part="value-text"]'),

  /**
   * Card title — заголовок карточки, заменяет .chakra-card__title
   */
  cardTitle: (page: Page): Locator =>
    page.locator('[data-scope="card"] [data-part="title"], [data-scope="card"] h3, [data-scope="card"] h2'),
}

/**
 * Получить карточку по содержимому текста
 *
 * @param page - Playwright Page
 * @param text - Текст внутри карточки
 *
 * @example
 * const card = getCardByText(page, 'Платье шёлковое')
 * await card.click()
 */
export function getCardByText(page: Page, text: string | RegExp): Locator {
  return Locators.card(page).filter({ hasText: text })
}

/**
 * Получить menu item по имени
 *
 * @param page - Playwright Page
 * @param name - Имя пункта меню
 *
 * @example
 * await getMenuItem(page, 'Удалить').click()
 */
export function getMenuItem(page: Page, name: string | RegExp): Locator {
  return page.getByRole('menuitem', { name })
}

/**
 * Получить tab по имени
 *
 * @param page - Playwright Page
 * @param name - Имя вкладки
 *
 * @example
 * await getTab(page, 'Женское').click()
 */
export function getTab(page: Page, name: string | RegExp): Locator {
  return page.getByRole('tab', { name })
}

/**
 * Получить radio button по имени
 *
 * @param page - Playwright Page
 * @param name - Имя radio
 *
 * @example
 * await getRadio(page, 'Женский').click()
 */
export function getRadio(page: Page, name: string | RegExp): Locator {
  return page.getByRole('radio', { name })
}

/**
 * Получить checkbox по имени
 *
 * @param page - Playwright Page
 * @param name - Имя checkbox
 *
 * @example
 * await getCheckbox(page, 'Принимаю условия').click()
 */
export function getCheckbox(page: Page, name: string | RegExp): Locator {
  return page.getByRole('checkbox', { name })
}

/**
 * Получить кнопку по имени
 *
 * @param page - Playwright Page
 * @param name - Имя кнопки
 *
 * @example
 * await getButton(page, /сохранить/i).click()
 */
export function getButton(page: Page, name: string | RegExp): Locator {
  return page.getByRole('button', { name })
}

/**
 * Получить ссылку по имени
 *
 * @param page - Playwright Page
 * @param name - Имя ссылки
 *
 * @example
 * await getLink(page, 'Каталог').click()
 */
export function getLink(page: Page, name: string | RegExp): Locator {
  return page.getByRole('link', { name })
}

/**
 * Получить combobox (select/dropdown) по имени
 *
 * @param page - Playwright Page
 * @param name - Имя combobox (опционально)
 *
 * @example
 * await getCombobox(page).selectOption('PENDING')
 */
export function getCombobox(page: Page, name?: string | RegExp): Locator {
  if (name) {
    return page.getByRole('combobox', { name })
  }
  return page.getByRole('combobox')
}
