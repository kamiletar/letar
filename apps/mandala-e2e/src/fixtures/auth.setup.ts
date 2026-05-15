/**
 * Setup тест для аутентификации
 *
 * Логинится через UI форму Better Auth — это надёжнее чем
 * ручное создание cookies/токенов.
 *
 * ВАЖНО: Требуется тестовый админ в базе (seed.ts создаёт его)
 */
import { expect, test as setup } from '@playwright/test'
import { ADMIN_STORAGE_STATE } from './storage-state'

/**
 * Тестовые данные — должны совпадать с seed.ts
 */
const TEST_ADMIN = {
  email: 'admin@elfafeya.art',
  password: 'admin123',
}

setup('authenticate as admin', async ({ page }) => {
  // Переходим на страницу логина
  await page.goto('/sign-in')

  // Ждём загрузки формы
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible({ timeout: 10000 })

  // Закрываем баннер оффлайн-режима если появился (он перекрывает форму)
  const offlineBannerClose = page.getByRole('button', { name: 'Не сейчас' })
  await offlineBannerClose.click({ timeout: 5000 }).catch(() => {
    // Баннер не появился — это OK
  })

  // Ждём исчезновения баннера (setup файл, не spec — override не покрывает)
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(500)

  // Заполняем форму (используем label потому что @letar/forms рендерит textbox с aria-label)
  const emailInput = page.getByPlaceholder('your@email.com')
  await emailInput.click()
  await emailInput.fill(TEST_ADMIN.email)

  const passwordInput = page.getByLabel('Пароль')
  await passwordInput.click()
  await passwordInput.fill(TEST_ADMIN.password)

  // Отправляем форму
  await page.getByRole('button', { name: 'Войти' }).click()

  // Ждём успешного входа — должен произойти редирект
  // Если callbackUrl не указан, редиректит на главную
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 15000 })

  // Проверяем что сессия получена (можно зайти в admin)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })

  // Сохраняем состояние для переиспользования в тестах
  await page.context().storageState({ path: ADMIN_STORAGE_STATE })

  console.log(`✓ Admin session saved to ${ADMIN_STORAGE_STATE}`)
})
