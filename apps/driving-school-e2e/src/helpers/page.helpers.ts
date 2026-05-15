/**
 * Хелперы для работы со страницами в E2E тестах
 *
 * Устраняет дублирование ~806 вызовов waitForLoadState
 * и ~752 паттернов goto + проверка заголовка
 */
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Перейти на страницу и дождаться загрузки DOM
 *
 * @param page - Playwright Page
 * @param url - URL для перехода
 * @param options - Дополнительные опции
 *
 * @example
 * await navigateAndWait(page, '/dashboard/')
 * await navigateAndWait(page, '/profile/', { timeout: 10000 })
 */
export async function navigateAndWait(page: Page, url: string, options?: { timeout?: number }): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (options?.timeout) {
    await page.waitForLoadState('domcontentloaded', { timeout: options.timeout })
  }
}

/**
 * Перейти на страницу и проверить заголовок
 *
 * @param page - Playwright Page
 * @param url - URL для перехода
 * @param headingText - Ожидаемый текст заголовка (string или RegExp)
 * @param options - Дополнительные опции
 *
 * @example
 * await gotoAndExpectHeading(page, '/dashboard/', 'Мой профиль')
 * await gotoAndExpectHeading(page, '/lessons/', /занятия/i)
 */
export async function gotoAndExpectHeading(
  page: Page,
  url: string,
  headingText: string | RegExp,
  options?: { timeout?: number; exact?: boolean }
): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await expectHeading(page, headingText, options)
}

/**
 * Проверить видимость заголовка на странице
 *
 * @param page - Playwright Page
 * @param text - Текст заголовка (string или RegExp)
 * @param options - Дополнительные опции
 *
 * @example
 * await expectHeading(page, 'Мои занятия')
 * await expectHeading(page, /профиль/i, { timeout: 10000 })
 */
export async function expectHeading(
  page: Page,
  text: string | RegExp,
  options?: { timeout?: number; exact?: boolean }
): Promise<void> {
  const heading = page.getByRole('heading', {
    name: text,
    exact: options?.exact,
  })
  await expect(heading).toBeVisible({ timeout: options?.timeout ?? 10000 })
}

/**
 * Ожидание загрузки страницы (domcontentloaded)
 *
 * @param page - Playwright Page
 * @param timeout - Таймаут в миллисекундах
 *
 * @example
 * await waitForPageLoad(page)
 * await waitForPageLoad(page, 15000)
 */
export async function waitForPageLoad(page: Page, timeout = 10000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout })
}

/**
 * Дождаться гидрации React-формы.
 *
 * React при гидрации навешивает __reactFiber$ на DOM-элементы.
 * Это гарантирует, что обработчики onSubmit уже привязаны.
 *
 * @param page - Playwright Page
 * @param timeout - Таймаут ожидания (по умолчанию 15000)
 *
 * @example
 * await page.goto('/form-page')
 * await waitForFormHydration(page)
 * await page.getByRole('button', { name: /submit/i }).click()
 */
export async function waitForFormHydration(page: Page, timeout = 15000): Promise<void> {
  await page.waitForFunction(
    () => {
      const form = document.querySelector('form')
      if (!form) return false
      // React при гидрации добавляет __reactFiber$ или __reactProps$ к DOM-элементам
      return Object.keys(form).some((key) => key.startsWith('__reactFiber$') || key.startsWith('__reactProps$'))
    },
    { timeout }
  )
}

/**
 * Проверить пустое состояние страницы (empty state)
 *
 * @param page - Playwright Page
 * @param emptyTextPattern - Паттерн для текста пустого состояния
 * @returns true если пустое состояние видимо
 *
 * @example
 * const isEmpty = await checkEmptyState(page, /нет занятий|пока нет занятий/i)
 * if (isEmpty) console.log('Страница пуста')
 */
export async function checkEmptyState(page: Page, emptyTextPattern: RegExp): Promise<boolean> {
  return page
    .getByText(emptyTextPattern)
    .isVisible()
    .catch(() => false)
}

/**
 * Безопасная проверка видимости элемента (не бросает ошибку)
 *
 * @param locator - Playwright Locator
 * @returns true если элемент видим
 *
 * @example
 * const isVisible = await safeIsVisible(page.getByRole('button', { name: /submit/i }))
 * if (isVisible) await button.click()
 */
export async function safeIsVisible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false)
}

/**
 * Безопасная проверка видимости с таймаутом
 *
 * @param locator - Playwright Locator
 * @param timeout - Таймаут в миллисекундах
 * @returns true если элемент видим
 *
 * @example
 * const hasDialog = await safeIsVisibleWithTimeout(page.getByRole('dialog'), 5000)
 */
export async function safeIsVisibleWithTimeout(locator: Locator, timeout: number): Promise<boolean> {
  return locator.isVisible({ timeout }).catch(() => false)
}

/**
 * Проверить наличие текста из нескольких альтернатив (без .or() цепочки)
 *
 * @param page - Playwright Page
 * @param patterns - Массив паттернов (string или RegExp)
 * @returns первый найденный локатор или null
 *
 * @example
 * const text = await findFirstVisibleText(page, [/ошибка/i, /error/i, /что-то пошло не так/i])
 * if (text) await expect(text).toBeVisible()
 */
export async function findFirstVisibleText(page: Page, patterns: (string | RegExp)[]): Promise<Locator | null> {
  for (const pattern of patterns) {
    const locator = page.getByText(pattern)
    if (await safeIsVisible(locator)) {
      return locator
    }
  }
  return null
}

/**
 * Проверить наличие элемента из нескольких альтернатив
 *
 * @param locators - Массив локаторов
 * @returns первый видимый локатор или null
 *
 * @example
 * const btn = await findFirstVisible([
 *   page.getByRole('button', { name: /submit/i }),
 *   page.getByRole('button', { name: /отправить/i })
 * ])
 * if (btn) await btn.click()
 */
export async function findFirstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    if (await safeIsVisible(locator)) {
      return locator
    }
  }
  return null
}

/**
 * Проверка редиректа на sign-in (для защищённых страниц)
 *
 * @param page - Playwright Page
 * @param timeout - Таймаут в миллисекундах
 *
 * @example
 * await navigateAndWait(page, '/protected/')
 * await expectSignInRedirect(page)
 */
export async function expectSignInRedirect(page: Page, timeout = 10000): Promise<void> {
  await expect(page).toHaveURL(/sign-in/, { timeout })
}

/**
 * Ожидание появления toast-уведомления
 *
 * Использует [data-toaster] для точного поиска внутри контейнера тостов,
 * а не по всей странице (исключает ложные срабатывания).
 *
 * @param page - Playwright Page
 * @param text - Текст уведомления (string или RegExp)
 * @param timeout - Таймаут в миллисекундах
 *
 * @example
 * await expectToast(page, 'Профиль обновлён')
 * await expectToast(page, /сохранено|успешно/i)
 */
export async function expectToast(page: Page, text: string | RegExp, timeout = 10000): Promise<void> {
  const toaster = page.locator('[data-toaster]')
  await expect(toaster.getByText(text)).toBeVisible({ timeout })
}

/**
 * Ожидание success toast (общий паттерн)
 *
 * @param page - Playwright Page
 * @param text - Текст уведомления (опционально, по умолчанию — общий паттерн)
 * @param timeout - Таймаут в миллисекундах
 *
 * @example
 * await expectSuccessToast(page)
 * await expectSuccessToast(page, /профиль обновлён/i)
 */
export async function expectSuccessToast(page: Page, text?: string | RegExp, timeout = 10000): Promise<void> {
  const pattern = text ?? /сохранен|успешно|создан|обновлен|удален|отправлен/i
  await expectToast(page, pattern, timeout)
}

/**
 * Ожидание error toast
 *
 * @param page - Playwright Page
 * @param text - Текст ошибки (опционально, по умолчанию — общий паттерн)
 * @param timeout - Таймаут в миллисекундах
 *
 * @example
 * await expectErrorToast(page)
 * await expectErrorToast(page, /не удалось/i)
 */
export async function expectErrorToast(page: Page, text?: string | RegExp, timeout = 10000): Promise<void> {
  const pattern = text ?? /ошибка|не удалось|error/i
  await expectToast(page, pattern, timeout)
}

/**
 * Ждёт завершения сетевого запроса (замена waitForTimeout после клика)
 *
 * @param page - Playwright Page
 * @param timeout - Таймаут в миллисекундах
 *
 * @example
 * await page.getByRole('button', { name: /сохранить/i }).click()
 * await waitForAction(page)
 */
export async function waitForAction(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => undefined)
}

/**
 * Кликнуть кнопку и дождаться network idle
 *
 * @param page - Playwright Page
 * @param name - Имя кнопки (string или RegExp)
 * @param timeout - Таймаут в миллисекундах
 *
 * @example
 * await clickAndWait(page, /сохранить/i)
 * await clickAndWait(page, 'Удалить', 15000)
 */
export async function clickAndWait(page: Page, name: string | RegExp, timeout = 10000): Promise<void> {
  await page.getByRole('button', { name }).click()
  await waitForAction(page, timeout)
}

/**
 * Пропустить тест с сообщением если условие истинно
 *
 * @param skip - Условие для пропуска
 * @param message - Сообщение для вывода
 *
 * @example
 * skipIf(!hasFeature, 'Feature не реализована')
 */
export function skipWithLog(skip: boolean, message: string): void {
  if (skip) {
    console.log(`  ⏭️ Skip: ${message}`)
  }
}

/**
 * Получить schoolId из файла, сохранённого в globalSetup
 *
 * Файл playwright/.auth/school-data.json создаётся в globalSetup
 * и содержит { schoolId: string }.
 *
 * @returns schoolId или null если файл не найден
 *
 * @example
 * const schoolId = getTestSchoolId()
 * if (schoolId) {
 *   await page.goto(schoolCourses(schoolId))
 * }
 */
export function getTestSchoolId(): string | null {
  // Проверяем оба возможных пути (CWD и configDir)
  const paths = [
    resolve(process.cwd(), 'playwright/.auth/school-data.json'),
    resolve(__dirname, '../../playwright/.auth/school-data.json'),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const data = JSON.parse(readFileSync(p, 'utf8'))
        return data.schoolId || null
      } catch {
        return null
      }
    }
  }
  return null
}
