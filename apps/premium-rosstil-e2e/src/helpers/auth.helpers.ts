/**
 * Хелперы для авторизации в E2E тестах
 */
import type { Page } from '@playwright/test'

import { LOCALE_PREFIX, localePath } from '../config/i18n'
import { resetRateLimit } from './db.helpers'

/**
 * Логин пользователя через форму
 */
export async function login(page: Page, email: string, password: string) {
  // Сбрасываем rate limit перед логином, чтобы тесты не блокировались
  await resetRateLimit(email)

  await page.goto(localePath('/auth/signin'))

  // Ждём полной загрузки страницы (важно для Firefox)
  // eslint-disable-next-line playwright/no-networkidle
  await page.waitForLoadState('networkidle')

  // Заполняем форму (webkit требует click + pressSequentially вместо fill)
  const emailInput = page.locator('input[type="email"]')
  await emailInput.click()
  await emailInput.clear()
  await emailInput.pressSequentially(email, { delay: 10 })

  const passwordInput = page.locator('input[type="password"]')
  await passwordInput.click()
  await passwordInput.clear()
  await passwordInput.pressSequentially(password, { delay: 10 })

  // Ждём, пока кнопка станет кликабельной
  const submitButton = page.locator('form button[type="submit"]:not([data-testid="oauth-button"])')
  await submitButton.waitFor({ state: 'visible' })

  // Отправляем форму
  await submitButton.click()

  // Ждём редиректа после успешного логина
  // Примечание: в Next.js используется router.push('/') + router.refresh()
  // что является client-side navigation
  await page.waitForURL((url) => !url.pathname.startsWith(`${LOCALE_PREFIX}/auth/`), {
    timeout: 30000,
    waitUntil: 'domcontentloaded',
  })
}

/**
 * Регистрация нового пользователя через форму
 */
export async function register(page: Page, data: { name: string; email: string; password: string }) {
  await page.goto(localePath('/auth/register'))

  // Заполняем форму
  await page.locator('input[placeholder="Ваше имя"]').fill(data.name)
  await page.locator('input[type="email"]').fill(data.email)
  await page.locator('input[placeholder="Минимум 8 символов"]').fill(data.password)
  await page.locator('input[placeholder="Повторите пароль"]').fill(data.password)

  // Отправляем форму (исключаем OAuth кнопки)
  await page.locator('form button[type="submit"]:not([data-testid="oauth-button"])').click()
}

/**
 * Выход из системы
 */
export async function logout(page: Page) {
  // Клик по меню пользователя
  await page.locator('[data-testid="user-menu"]').click()
  // Клик по кнопке выхода
  await page.locator('[data-testid="logout-button"]').click()
  // Ждём редиректа на главную или страницу входа
  await page.waitForURL(
    (url) => url.pathname === `${LOCALE_PREFIX}/` || url.pathname.startsWith(`${LOCALE_PREFIX}/auth/`)
  )
}

/**
 * Проверка авторизован ли пользователь
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Проверяем наличие меню пользователя
  const userMenu = page.locator('[data-testid="user-menu"]')
  return userMenu.isVisible()
}

/**
 * Ожидание сообщения об успехе
 */
export async function waitForSuccessMessage(page: Page, timeout = 5000) {
  await page.locator('text=green.500, text*="успешно"').waitFor({ timeout })
}

/**
 * Ожидание сообщения об ошибке
 */
export async function waitForErrorMessage(page: Page, timeout = 5000) {
  await page.locator('[class*="red"]').waitFor({ timeout })
}
