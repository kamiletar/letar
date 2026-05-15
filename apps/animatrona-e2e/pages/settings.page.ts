/**
 * Page Object для страницы настроек.
 *
 * Методы для работы с табами и настройками:
 * - Библиотека
 * - Плеер
 * - Транскодирование
 * - Профили кодирования
 * - Оформление (тема)
 */

import type { Locator, Page } from 'playwright'
import { BasePage } from './base.page'

export class SettingsPage extends BasePage {
  /** Таблист с табами настроек */
  readonly tabList: Locator

  /** Таб "Библиотека" */
  readonly libraryTab: Locator

  /** Таб "Плеер" */
  readonly playerTab: Locator

  /** Таб "Транскод" */
  readonly transcodeTab: Locator

  /** Таб "Профили" */
  readonly profilesTab: Locator

  /** Таб "Оформление" */
  readonly appearanceTab: Locator

  constructor(page: Page) {
    super(page)
    this.tabList = page.getByRole('tablist')
    this.libraryTab = page.getByRole('tab', { name: /библиотека/i })
    this.playerTab = page.getByRole('tab', { name: /плеер/i })
    this.transcodeTab = page.getByRole('tab', { name: /транскод/i })
    this.profilesTab = page.getByRole('tab', { name: /профил/i })
    this.appearanceTab = page.getByRole('tab', { name: /оформление|тема/i })
  }

  /**
   * Проверить загружена ли страница настроек
   */
  async isLoaded(): Promise<boolean> {
    // Проверяем наличие любого контента настроек
    const hasContent = this.page.getByText(/тема|библиотека|плеер|транскод|профил/i)
    return hasContent
      .first()
      .isVisible()
      .catch(() => false)
  }

  /**
   * Получить количество табов
   */
  async getTabCount(): Promise<number> {
    const tabs = this.page.getByRole('tab')
    return tabs.count()
  }

  /**
   * Выбрать таб по имени
   */
  async selectTab(name: string): Promise<void> {
    const tab = this.page.getByRole('tab', { name: new RegExp(name, 'i') })
    await tab.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Получить текущий выбранный таб
   */
  async getSelectedTab(): Promise<string | null> {
    const tabs = this.page.getByRole('tab')
    const count = await tabs.count()

    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i)
      const isSelected = await tab.getAttribute('aria-selected')
      if (isSelected === 'true') {
        return tab.textContent()
      }
    }
    return null
  }

  // ==================== Theme Settings ====================

  /**
   * Radio group для темы
   */
  get themeRadioGroup(): Locator {
    return this.page.getByRole('radiogroup').filter({ hasText: /тёмная|светлая|dark|light/i })
  }

  /**
   * Radio "Тёмная тема"
   */
  get darkThemeRadio(): Locator {
    return this.page.getByRole('radio', { name: /тёмная|dark/i })
  }

  /**
   * Radio "Светлая тема"
   */
  get lightThemeRadio(): Locator {
    return this.page.getByRole('radio', { name: /светлая|light/i })
  }

  /**
   * Проверить видимость переключателя темы
   */
  async isThemeSwitchVisible(): Promise<boolean> {
    return this.themeRadioGroup.isVisible().catch(() => false)
  }

  /**
   * Получить текущую тему
   */
  async getCurrentTheme(): Promise<'dark' | 'light' | null> {
    const isDark = await this.darkThemeRadio.isChecked().catch(() => false)
    const isLight = await this.lightThemeRadio.isChecked().catch(() => false)

    if (isDark) {
      return 'dark'
    }
    if (isLight) {
      return 'light'
    }
    return null
  }

  /**
   * Установить тему
   */
  async setTheme(theme: 'dark' | 'light'): Promise<void> {
    const radio = theme === 'dark' ? this.darkThemeRadio : this.lightThemeRadio
    await radio.click()
    await this.page.waitForTimeout(500)
  }

  // ==================== Library Settings ====================

  /**
   * Путь к папке библиотеки
   */
  get libraryPathInput(): Locator {
    return this.page.locator('input[name="libraryPath"], [data-testid="library-path"]')
  }

  // ==================== Profiles Settings ====================

  /**
   * Список профилей кодирования
   */
  get profilesList(): Locator {
    return this.page.locator('[data-testid="profiles-list"], .profiles-list')
  }

  /**
   * Кнопка "Добавить профиль"
   */
  get addProfileButton(): Locator {
    return this.page.getByRole('button', { name: /добавить профиль/i })
  }

  /**
   * Проверить наличие профилей
   */
  async hasProfiles(): Promise<boolean> {
    const profilesText = this.page.getByText(/профил/i)
    return profilesText
      .first()
      .isVisible()
      .catch(() => false)
  }
}
