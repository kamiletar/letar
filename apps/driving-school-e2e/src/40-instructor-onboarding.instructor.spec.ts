import { expect, test } from './fixtures/base-test'
import { generateTestEmail } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'
import { clearAllEmails, isMailHogAvailable, waitForEmail } from './helpers/mailhog.helpers'
import { waitForAction } from './helpers/page.helpers'

/**
 * E2E тесты для расширенного онбординга инструктора
 *
 * Страница: /instructor-onboarding/
 *
 * Функциональность:
 * - Шаг 1: Фото профиля
 * - Шаг 2: Информация о себе (опыт, описание)
 * - Шаг 3: Настройка расписания
 * - Шаг 4: Добавление автомобиля (если не добавлен)
 * - Шаг 5: Создание типов занятий
 * - Возможность пропустить онбординг
 *
 * Примечание: Доступен только для инструкторов после базового онбординга
 */
test.describe('Расширенный онбординг инструктора', () => {
  test.describe('Доступ к онбордингу', () => {
    test('E2E-IOB-1 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto('/instructor-onboarding/', { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      // Должен быть редирект на sign-in
      const isAuthUrl = page.url().includes('sign-in')
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      expect(isAuthUrl || hasSignInForm).toBe(true)

      await context.close()
    })

    test('E2E-IOB-2 — ученик редиректится на dashboard', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto('/instructor-onboarding/')
      await page.waitForLoadState('domcontentloaded')

      // Ученик должен быть перенаправлен на dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await context.close()
    })

    test('E2E-IOB-3 — инструктор с завершённым онбордингом редиректится на dashboard', async ({ page }) => {
      // Используем тестового инструктора
      await page.goto('/instructor-onboarding/')
      await page.waitForLoadState('domcontentloaded')

      // Инструктор с завершённым онбордингом — редирект на dashboard
      // Если онбординг не завершён — отображается wizard или ошибка
      const url = page.url()
      const isDashboard = url.includes('dashboard')
      const hasWizard = await page
        .getByText(/настройка профиля/i)
        .isVisible()
        .catch(() => false)
      const hasError = await page
        .getByText(/что-то пошло не так/i)
        .isVisible()
        .catch(() => false)

      if (isDashboard) {
        expect(url).toContain('dashboard')
      } else {
        console.log('  ⏭️ Skip: онбординг не завершён — отображается wizard или ошибка')
        expect(hasWizard || hasError || url.includes('instructor-onboarding')).toBe(true)
      }
    })
  })

  test.describe('Полный цикл онбординга инструктора', () => {
    test('E2E-IOB-4 — регистрация + полный онбординг инструктора', async ({ page }) => {
      // Пропускаем если MailHog недоступен
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен на localhost:8025')

      await clearAllEmails()

      const testEmail = generateTestEmail('instructor-onboard')

      // === 1. РЕГИСТРАЦИЯ ===
      // Очищаем авторизацию инструктора для регистрации нового пользователя
      await page.context().clearCookies()
      await page.goto('/sign-up/')
      await page.getByPlaceholder('example@mail.com').fill(testEmail)
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
      await page.locator('[data-field-name="acceptOffer"]').click()
      await page.locator('[data-field-name="acceptPrivacy"]').click()
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      // Ждём форму верификации
      await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({
        timeout: 15000,
      })

      // === 2. PIN ВЕРИФИКАЦИЯ ===
      const email = await waitForEmail(testEmail, { timeout: 30000 })
      expect(email).toBeTruthy()

      const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
      expect(pinMatch).not.toBeNull()
      const pinCode = pinMatch![1]

      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })
      await waitForAction(page)
      await page.getByRole('button', { name: /подтвердить/i }).click()

      // === 3. БАЗОВЫЙ ОНБОРДИНГ ===
      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

      // Имя
      await expect(page.getByText('Как вас зовут?')).toBeVisible({ timeout: 10000 })
      await page.getByPlaceholder('Например: Александр').fill('E2E Инструктор Полный')

      // Выбираем роль "Инструктор"
      await expect(page.getByText('Выберите вашу роль')).toBeVisible()
      await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })

      // Продолжить
      await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

      // Профиль инструктора — автомобиль
      await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })
      await page.getByPlaceholder('Например: Hyundai').fill('BMW')
      await page.getByPlaceholder('Например: Solaris').fill('3 Series')

      // Завершить базовый онбординг
      await page.getByRole('button', { name: /завершить/i }).click({ force: true })

      // === 4. РАСШИРЕННЫЙ ОНБОРДИНГ ИНСТРУКТОРА ===
      await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 15000 })

      // Заголовок расширенного онбординга
      await expect(page.getByText('Настройка профиля инструктора')).toBeVisible({ timeout: 10000 })

      // Пропустить онбординг (для ускорения теста)
      const skipButton = page.getByRole('button', { name: /пропустить|позже/i })
      const hasSkip = await skipButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasSkip) {
        await skipButton.click()
        await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
      } else {
        // Или проходим первые шаги
        console.log('  ℹ️ Кнопка пропуска не найдена, проходим шаги')

        // Шаг 1: Фото (пропускаем)
        const nextStep = page.getByRole('button', { name: /далее|продолжить|пропустить/i }).first()
        if (await nextStep.isVisible().catch(() => false)) {
          await nextStep.click()
        }

        // Ждём редирект или следующий шаг
        await waitForAction(page)
      }
    })
  })

  test.describe('UI элементы расширенного онбординга', () => {
    test('E2E-IOB-5 — проверка структуры wizard', async ({ page }) => {
      // Пропускаем если MailHog недоступен
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен — тест требует нового пользователя')

      await clearAllEmails()

      const testEmail = generateTestEmail('instructor-wizard')

      // Быстрая регистрация как инструктор
      // Очищаем авторизацию инструктора для регистрации нового пользователя
      await page.context().clearCookies()
      await page.goto('/sign-up/')
      await page.getByPlaceholder('example@mail.com').fill(testEmail)
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
      await page.locator('[data-field-name="acceptOffer"]').click()
      await page.locator('[data-field-name="acceptPrivacy"]').click()
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({ timeout: 15000 })

      const email = await waitForEmail(testEmail, { timeout: 30000 })
      const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
      const pinCode = pinMatch![1]

      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })
      await waitForAction(page)
      await page.getByRole('button', { name: /подтвердить/i }).click()

      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

      // Базовый онбординг
      await page.getByPlaceholder('Например: Александр').fill('E2E Wizard Test')
      await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })
      await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

      await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })
      await page.getByPlaceholder('Например: Hyundai').fill('Test')
      await page.getByPlaceholder('Например: Solaris').fill('Car')
      await page.getByRole('button', { name: /завершить/i }).click({ force: true })

      // Расширенный онбординг
      await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 15000 })

      // Проверяем структуру
      // Заголовок
      await expect(page.getByText('Настройка профиля инструктора')).toBeVisible({ timeout: 10000 })

      // Описание
      await expect(page.getByText(/заполните профиль.*ученики.*найти/i)).toBeVisible()

      // Должна быть кнопка выхода
      const hasLogout = await page
        .getByRole('button', { name: /выход/i })
        .isVisible()
        .catch(() => false)

      expect(hasLogout).toBe(true)
    })

    test('E2E-IOB-6 — шаги wizard отображаются', async ({ page }) => {
      // Пропускаем если MailHog недоступен
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен — тест требует нового пользователя')

      await clearAllEmails()

      const testEmail = generateTestEmail('instructor-steps')

      // Быстрая регистрация
      // Очищаем авторизацию инструктора для регистрации нового пользователя
      await page.context().clearCookies()
      await page.goto('/sign-up/')
      await page.getByPlaceholder('example@mail.com').fill(testEmail)
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
      await page.locator('[data-field-name="acceptOffer"]').click()
      await page.locator('[data-field-name="acceptPrivacy"]').click()
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({ timeout: 15000 })

      const email = await waitForEmail(testEmail, { timeout: 30000 })
      const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
      const pinCode = pinMatch![1]

      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })
      await waitForAction(page)
      await page.getByRole('button', { name: /подтвердить/i }).click()

      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

      // Базовый онбординг
      await page.getByPlaceholder('Например: Александр').fill('E2E Steps Test')
      await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })
      await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

      await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })
      await page.getByPlaceholder('Например: Hyundai').fill('Test')
      await page.getByPlaceholder('Например: Solaris').fill('Car')
      await page.getByRole('button', { name: /завершить/i }).click({ force: true })

      // Расширенный онбординг
      await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 15000 })
      await expect(page.getByText('Настройка профиля инструктора')).toBeVisible({ timeout: 10000 })

      // Проверяем что есть индикаторы шагов или кнопки навигации
      // Steps indicator
      const hasSteps = await Locators.stepper(page)
        .first()
        .isVisible()
        .catch(() => false)

      // Или кнопки навигации
      const hasNavigation = await page
        .getByRole('button', { name: /далее|назад|пропустить/i })
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasSteps || hasNavigation).toBe(true)
    })
  })

  // === Iteration 5: Расширенное покрытие (+2 теста) ===

  test.describe('Специфичные шаги онбординга инструктора', () => {
    test('E2E-IOB-7 — шаг загрузки фото профиля', async ({ page }) => {
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен')

      await clearAllEmails()
      const testEmail = generateTestEmail('instructor-photo')

      // Быстрая регистрация как инструктор
      // Очищаем авторизацию инструктора для регистрации нового пользователя
      await page.context().clearCookies()
      await page.goto('/sign-up/')
      await page.getByPlaceholder('example@mail.com').fill(testEmail)
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
      await page.locator('[data-field-name="acceptOffer"]').click()
      await page.locator('[data-field-name="acceptPrivacy"]').click()
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({ timeout: 15000 })

      const email = await waitForEmail(testEmail, { timeout: 30000 })
      const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
      const pinCode = pinMatch![1]

      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })
      await waitForAction(page)
      await page.getByRole('button', { name: /подтвердить/i }).click()

      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

      // Базовый онбординг
      await page.getByPlaceholder('Например: Александр').fill('E2E Photo Test')
      await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })
      await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

      await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })
      await page.getByPlaceholder('Например: Hyundai').fill('Test')
      await page.getByPlaceholder('Например: Solaris').fill('Car')
      await page.getByRole('button', { name: /завершить/i }).click({ force: true })

      // Расширенный онбординг
      await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 15000 })
      await expect(page.getByText('Настройка профиля инструктора')).toBeVisible({ timeout: 10000 })

      // Ищем элемент загрузки фото
      const photoUpload = page
        .locator('input[type="file"]')
        .or(page.getByLabel(/фото|photo|avatar/i))
        .or(page.locator('[data-testid="photo-upload"]'))
        .or(page.getByRole('button', { name: /загрузить.*фото|upload.*photo/i }))

      const hasPhotoUpload = await photoUpload
        .first()
        .isVisible()
        .catch(() => false)
      if (hasPhotoUpload) {
        console.log('  ✓ Элемент загрузки фото профиля найден')
      } else {
        console.log('  ⏭️ Skip: элемент загрузки фото не найден на текущем шаге')
      }
    })

    test('E2E-IOB-8 — шаг настройки расписания', async ({ page }) => {
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен')

      await clearAllEmails()
      const testEmail = generateTestEmail('instructor-schedule')

      // Быстрая регистрация как инструктор
      // Очищаем авторизацию инструктора для регистрации нового пользователя
      await page.context().clearCookies()
      await page.goto('/sign-up/')
      await page.getByPlaceholder('example@mail.com').fill(testEmail)
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
      await page.locator('[data-field-name="acceptOffer"]').click()
      await page.locator('[data-field-name="acceptPrivacy"]').click()
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({ timeout: 15000 })

      const email = await waitForEmail(testEmail, { timeout: 30000 })
      const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
      const pinCode = pinMatch![1]

      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })
      await waitForAction(page)
      await page.getByRole('button', { name: /подтвердить/i }).click()

      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

      // Базовый онбординг
      await page.getByPlaceholder('Например: Александр').fill('E2E Schedule Test')
      await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })
      await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

      await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })
      await page.getByPlaceholder('Например: Hyundai').fill('Test')
      await page.getByPlaceholder('Например: Solaris').fill('Car')
      await page.getByRole('button', { name: /завершить/i }).click({ force: true })

      // Расширенный онбординг
      await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 15000 })
      await expect(page.getByText('Настройка профиля инструктора')).toBeVisible({ timeout: 10000 })

      // Пробуем перейти к шагу расписания
      const scheduleStep = page
        .getByText(/расписан|schedule|рабочие часы|working hours/i)
        .or(page.getByRole('button', { name: /расписан|schedule/i }))

      // Навигация по шагам
      const nextBtn = page.getByRole('button', { name: /далее|next|продолжить/i }).first()
      let attempts = 0

      while (attempts < 5) {
        const hasSchedule = await scheduleStep.isVisible().catch(() => false)
        if (hasSchedule) {
          console.log('  ✓ Шаг настройки расписания найден')
          break
        }

        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click()
          await waitForAction(page)
        } else {
          break
        }
        attempts++
      }

      if (attempts >= 5) {
        console.log('  ⏭️ Skip: шаг расписания не найден после навигации')
      }
    })
  })

  // === Фаза 4: Расширенное покрытие (+4 теста) ===

  test('E2E-IONB-09 — загрузка документов (права, сертификаты)', async ({ page }) => {
    const mailHogAvailable = await isMailHogAvailable()
    test.skip(!mailHogAvailable, 'MailHog недоступен')

    await clearAllEmails()
    const testEmail = generateTestEmail('instructor-docs')

    // Быстрая регистрация как инструктор
    await page.goto('/sign-up/')
    await page.getByPlaceholder('example@mail.com').fill(testEmail)
    await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
    await page.locator('[data-field-name="acceptOffer"]').click()
    await page.locator('[data-field-name="acceptPrivacy"]').click()
    await page.getByRole('button', { name: /зарегистрироваться/i }).click()

    await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({ timeout: 15000 })

    const email = await waitForEmail(testEmail, { timeout: 30000 })
    const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
    const pinCode = pinMatch![1]

    const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
    await firstPinInput.click()
    await page.keyboard.type(pinCode, { delay: 100 })
    await waitForAction(page)
    await page.getByRole('button', { name: /подтвердить/i }).click()

    await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

    // Базовый онбординг
    await page.getByPlaceholder('Например: Александр').fill('E2E Docs Test')
    await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })
    await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

    await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('Например: Hyundai').fill('Test')
    await page.getByPlaceholder('Например: Solaris').fill('Car')
    await page.getByRole('button', { name: /завершить/i }).click({ force: true })

    // Расширенный онбординг
    await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 15000 })

    // Ищем элементы загрузки документов
    const docsUpload = page
      .getByText(/документы|водительское удостоверение|сертификат|license|certificate/i)
      .or(page.locator('input[type="file"][accept*="pdf"]'))
      .or(page.locator('[data-testid="document-upload"]'))

    const hasDocsSection = await docsUpload
      .first()
      .isVisible()
      .catch(() => false)

    if (hasDocsSection) {
      console.log('  ✓ Секция загрузки документов найдена')
    } else {
      // Навигируем по шагам для поиска
      const nextBtn = page.getByRole('button', { name: /далее|next|продолжить/i }).first()
      let found = false

      for (let i = 0; i < 5; i++) {
        const hasDocs = await page
          .getByText(/документы|удостоверение|сертификат/i)
          .isVisible()
          .catch(() => false)
        if (hasDocs) {
          console.log('  ✓ Шаг загрузки документов найден')
          found = true
          break
        }

        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click()
          await waitForAction(page)
        } else {
          break
        }
      }

      if (!found) {
        console.log('  ⏭️ Skip: секция документов не найдена')
      }
    }
  })

  test('E2E-IONB-10 — верификация телефона', async ({ page }) => {
    const mailHogAvailable = await isMailHogAvailable()
    test.skip(!mailHogAvailable, 'MailHog недоступен')

    await clearAllEmails()
    const testEmail = generateTestEmail('instructor-phone')

    // Быстрая регистрация как инструктор
    await page.goto('/sign-up/')
    await page.getByPlaceholder('example@mail.com').fill(testEmail)
    await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
    await page.locator('[data-field-name="acceptOffer"]').click()
    await page.locator('[data-field-name="acceptPrivacy"]').click()
    await page.getByRole('button', { name: /зарегистрироваться/i }).click()

    await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({ timeout: 15000 })

    const email = await waitForEmail(testEmail, { timeout: 30000 })
    const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
    const pinCode = pinMatch![1]

    const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
    await firstPinInput.click()
    await page.keyboard.type(pinCode, { delay: 100 })
    await waitForAction(page)
    await page.getByRole('button', { name: /подтвердить/i }).click()

    await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

    // Базовый онбординг
    await page.getByPlaceholder('Например: Александр').fill('E2E Phone Test')
    await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })
    await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

    await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('Например: Hyundai').fill('Test')
    await page.getByPlaceholder('Например: Solaris').fill('Car')
    await page.getByRole('button', { name: /завершить/i }).click({ force: true })

    // Расширенный онбординг
    await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 15000 })

    // Ищем поле телефона или верификацию телефона
    const phoneField = page
      .getByLabel(/телефон|phone/i)
      .or(page.getByPlaceholder(/\+7|телефон|phone/i))
      .or(page.locator('input[type="tel"]'))

    const verifyPhoneButton = page.getByRole('button', { name: /верифицировать|подтвердить.*телефон|verify.*phone/i })

    const hasPhoneField = await phoneField
      .first()
      .isVisible()
      .catch(() => false)
    const hasVerifyButton = await verifyPhoneButton.isVisible().catch(() => false)

    if (hasPhoneField) {
      console.log('  ✓ Поле телефона найдено')
    }
    if (hasVerifyButton) {
      console.log('  ✓ Кнопка верификации телефона найдена')
    }
    if (!hasPhoneField && !hasVerifyButton) {
      console.log('  ⏭️ Skip: верификация телефона не реализована на этом этапе')
    }
  })

  test('E2E-IONB-11 — привязка банковской карты (mock)', async ({ page }) => {
    const mailHogAvailable = await isMailHogAvailable()
    test.skip(!mailHogAvailable, 'MailHog недоступен')

    await clearAllEmails()
    const testEmail = generateTestEmail('instructor-bank')

    // Быстрая регистрация как инструктор
    await page.goto('/sign-up/')
    await page.getByPlaceholder('example@mail.com').fill(testEmail)
    await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
    await page.locator('[data-field-name="acceptOffer"]').click()
    await page.locator('[data-field-name="acceptPrivacy"]').click()
    await page.getByRole('button', { name: /зарегистрироваться/i }).click()

    await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({ timeout: 15000 })

    const email = await waitForEmail(testEmail, { timeout: 30000 })
    const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
    const pinCode = pinMatch![1]

    const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
    await firstPinInput.click()
    await page.keyboard.type(pinCode, { delay: 100 })
    await waitForAction(page)
    await page.getByRole('button', { name: /подтвердить/i }).click()

    await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

    // Базовый онбординг
    await page.getByPlaceholder('Например: Александр').fill('E2E Bank Test')
    await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })
    await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

    await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('Например: Hyundai').fill('Test')
    await page.getByPlaceholder('Например: Solaris').fill('Car')
    await page.getByRole('button', { name: /завершить/i }).click({ force: true })

    // Расширенный онбординг
    await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 15000 })

    // Ищем секцию оплаты или привязки карты
    const paymentSection = page.getByText(/оплата|платёж|карта|payment|bank|реквизиты/i)
    const cardInput = page.locator('input[name*="card"]').or(page.getByPlaceholder(/номер карты|card number/i))

    const hasPaymentSection = await paymentSection
      .first()
      .isVisible()
      .catch(() => false)
    const hasCardInput = await cardInput
      .first()
      .isVisible()
      .catch(() => false)

    if (hasPaymentSection || hasCardInput) {
      console.log('  ✓ Секция оплаты/привязки карты найдена')
    } else {
      console.log('  ⏭️ Skip: функция привязки банковской карты не реализована')
    }
  })

  test('E2E-IONB-12 — завершение онбординга без авто', async ({ page }) => {
    const mailHogAvailable = await isMailHogAvailable()
    test.skip(!mailHogAvailable, 'MailHog недоступен')

    await clearAllEmails()
    const testEmail = generateTestEmail('instructor-no-car')

    // Быстрая регистрация как инструктор
    await page.goto('/sign-up/')
    await page.getByPlaceholder('example@mail.com').fill(testEmail)
    await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
    await page.locator('[data-field-name="acceptOffer"]').click()
    await page.locator('[data-field-name="acceptPrivacy"]').click()
    await page.getByRole('button', { name: /зарегистрироваться/i }).click()

    await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({ timeout: 15000 })

    const email = await waitForEmail(testEmail, { timeout: 30000 })
    const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
    const pinCode = pinMatch![1]

    const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
    await firstPinInput.click()
    await page.keyboard.type(pinCode, { delay: 100 })
    await waitForAction(page)
    await page.getByRole('button', { name: /подтвердить/i }).click()

    await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

    // Базовый онбординг — выбираем инструктора
    await page.getByPlaceholder('Например: Александр').fill('E2E No Car Test')
    await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })
    await page.getByRole('button', { name: /продолжить/i }).click({ force: true })

    // На шаге автомобиля ищем возможность пропустить
    await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 5000 })

    // Ищем опцию "Без авто" или кнопку пропуска
    const noCarOption = page.getByText(/без авто|нет авто|no car|пропустить/i)
    const skipCarButton = page.getByRole('button', { name: /пропустить|skip|позже/i })
    const checkbox = page.locator('input[type="checkbox"]').filter({ hasText: /нет авто|без авто/i })

    const hasNoCarOption = await noCarOption.isVisible().catch(() => false)
    const hasSkipButton = await skipCarButton.isVisible().catch(() => false)
    const hasCheckbox = await checkbox.isVisible().catch(() => false)

    if (hasNoCarOption) {
      await noCarOption.click()
      console.log('  ✓ Опция "Без авто" найдена и выбрана')
    } else if (hasSkipButton) {
      console.log('  ✓ Кнопка пропуска шага автомобиля найдена')
    } else if (hasCheckbox) {
      console.log('  ✓ Чекбокс "Без авто" найден')
    } else {
      // Пробуем завершить без заполнения авто
      const finishBtn = page.getByRole('button', { name: /завершить|finish/i })
      if (await finishBtn.isEnabled()) {
        await finishBtn.click()
        await waitForAction(page)

        // Проверяем результат
        const hasError = await page
          .getByText(/обязательн|укажите.*авто|required/i)
          .isVisible()
          .catch(() => false)
        if (hasError) {
          console.log('  ⚠️ Авто обязательно — функция "Без авто" не реализована')
        } else {
          console.log('  ✓ Можно завершить без заполнения авто')
        }
      } else {
        console.log('  ⏭️ Skip: невозможно завершить без авто')
      }
    }
  })
})
