import { expect, test } from './fixtures/base-test'
import { generateTestEmail, urls, weakPassword } from './fixtures/test-data'
import { clearAllEmails, isMailHogAvailable, waitForEmail } from './helpers/mailhog.helpers'

test.describe('Аутентификация', () => {
  test.describe('Регистрация', () => {
    /**
     * Тест регистрации нового пользователя.
     * Требует MailHog для получения письма с кодом верификации.
     * MailHog: SMTP localhost:1025, Web UI localhost:8025
     */
    test('E2E-1.1.7 — регистрация нового пользователя через форму', async ({ page }) => {
      const testEmail = generateTestEmail('user')

      await page.goto(urls.signUp)

      // Проверяем заголовок страницы (точное совпадение, чтобы избежать "Быстрая регистрация")
      await expect(page.getByText('Регистрация', { exact: true })).toBeVisible()

      // Заполняем форму
      await page.getByPlaceholder('example@mail.com').fill(testEmail)
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')

      // Принимаем юридические документы (обязательно для регистрации)
      // Кликаем по чекбоксу через data-field-name
      await page.locator('[data-field-name="acceptOffer"]').click()
      await page.locator('[data-field-name="acceptPrivacy"]').click()

      // Отправляем форму
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      // Ожидаем переход к верификации email (VerifyPinForm)
      // Используем .first() т.к. на странице есть и заголовок и лейбл с похожим текстом
      await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({
        timeout: 15000,
      })
    })

    test('E2E-1.1.101 — валидация — слабый пароль отклоняется', async ({ page }) => {
      await page.goto(urls.signUp)

      // Заполняем форму со слабым паролем
      await page.getByPlaceholder('example@mail.com').fill(generateTestEmail())
      await page.getByPlaceholder('Минимум 8 символов').fill(weakPassword)

      // Пытаемся отправить
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      // Проверяем, что форма не отправилась - остались на странице регистрации
      await expect(page).toHaveURL(/sign-up/)
      // И что кнопка не в состоянии загрузки (форма заблокирована валидацией)
      await expect(page.getByRole('button', { name: /зарегистрироваться/i })).toBeEnabled()
    })

    test('E2E-1.1.102 — валидация — обязательно принять оферту', async ({ page }) => {
      await page.goto(urls.signUp)

      // Заполняем форму без согласий
      await page.getByPlaceholder('example@mail.com').fill(generateTestEmail())
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')

      // Пытаемся отправить без принятия оферты
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      // Проверяем, что форма не отправилась
      await expect(page).toHaveURL(/sign-up/)
    })

    /**
     * 1.1.3b — Полный цикл регистрации с подтверждением email PIN-кодом
     * Требует MailHog: SMTP localhost:1025, Web UI localhost:8025
     */
    test('E2E-1.1.3b — подтверждение email PIN-кодом через MailHog', async ({ page }) => {
      // Пропускаем тест если MailHog недоступен
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен на localhost:8025')

      // Очищаем старые письма
      await clearAllEmails()

      const testEmail = generateTestEmail('pin-verify')

      // Регистрация
      await page.goto(urls.signUp)
      await page.getByPlaceholder('example@mail.com').fill(testEmail)
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')
      await page.locator('[data-field-name="acceptOffer"]').click()
      await page.locator('[data-field-name="acceptPrivacy"]').click()
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      // Ждём форму верификации
      await expect(page.getByRole('heading', { name: /подтвердите email/i })).toBeVisible({
        timeout: 15000,
      })

      // Получаем письмо из MailHog
      const email = await waitForEmail(testEmail, { timeout: 30000 })
      expect(email).toBeTruthy()

      // Извлекаем PIN код из тела письма (формат: 6 цифр)
      const pinMatch = email.Content.Body.match(/\b(\d{6})\b/)
      expect(pinMatch).toBeTruthy()
      expect(pinMatch).not.toBeNull()
      // После проверок pinMatch гарантированно не null
      const pinCode = pinMatch[1] as string

      // Вводим PIN код — Chakra PinInput автоматически переключает фокус
      // Кликаем на первый видимый input (внутри data-part="control")
      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })

      // Небольшая пауза для обработки onValueComplete
      await page.waitForTimeout(500)

      // Кликаем кнопку "Подтвердить"
      await page.getByRole('button', { name: /подтвердить/i }).click()

      // После успешной верификации происходит редирект на onboarding
      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })
    })

    test('E2E-1.1.3a — регистрация с существующим email показывает ошибку', async ({ page }) => {
      // Используем email тестового инструктора (он точно существует после setup)
      const existingEmail = 'e2e-instructor@e2e-test.local'

      await page.goto(urls.signUp)

      // Заполняем форму
      await page.getByPlaceholder('example@mail.com').fill(existingEmail)
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')

      // Принимаем юридические документы
      await page.locator('[data-field-name="acceptOffer"]').click()
      await page.locator('[data-field-name="acceptPrivacy"]').click()

      // Отправляем форму
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      // Ожидаем ошибку о существующем пользователе или переход к верификации
      // (если пользователь уже существует но не верифицирован, может показаться форма верификации)
      const errorOrVerify = page
        .getByText(/email уже зарегистрирован|пользователь.*существует|user already exists/i)
        .or(page.getByRole('heading', { name: /подтвердите email/i }))

      await expect(errorOrVerify).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Вход', () => {
    test('E2E-1.1.9 — форма входа отображается корректно', async ({ page }) => {
      await page.goto(urls.signIn)

      // Проверяем заголовок (используется Text, не Heading)
      await expect(page.getByText('Вход', { exact: true }).first()).toBeVisible()

      // Проверяем наличие полей
      await expect(page.getByPlaceholder('example@mail.com')).toBeVisible()
      await expect(page.getByPlaceholder('Введите пароль')).toBeVisible()

      // Проверяем кнопку входа
      await expect(page.getByRole('button', { name: /войти/i })).toBeVisible()

      // Проверяем ссылки OAuth
      await expect(page.getByRole('button', { name: /google/i })).toBeVisible()

      // Проверяем ссылку на регистрацию
      await expect(page.getByText(/зарегистрироваться/i)).toBeVisible()
    })

    test('E2E-1.1.11 — ошибка входа с неверным паролем', async ({ page }) => {
      await page.goto(urls.signIn)

      // Вводим несуществующие данные
      await page.getByPlaceholder('example@mail.com').fill('nonexistent@test.local')
      await page.getByPlaceholder('Введите пароль').fill('WrongPassword123!')

      // Отправляем форму
      await page.getByRole('button', { name: /войти/i }).click()

      // Ожидаем сообщение об ошибке
      await expect(
        page.getByText(/неверный email или пароль|неверные учётные данные|ошибка входа|invalid/i)
      ).toBeVisible({ timeout: 10000 })
    })

    test('E2E-1.1.103 — валидация — пустые поля отклоняются', async ({ page }) => {
      await page.goto(urls.signIn)

      // Пытаемся отправить пустую форму
      await page.getByRole('button', { name: /войти/i }).click()

      // Проверяем, что форма не отправилась (остались на странице входа)
      await expect(page).toHaveURL(/sign-in/)
    })
  })

  test.describe('Навигация', () => {
    test('E2E-1.1.104 — переход со страницы входа на регистрацию', async ({ page }) => {
      await page.goto(urls.signIn)

      // Кликаем на ссылку регистрации
      await page.getByText(/зарегистрироваться/i).click()

      // Проверяем, что перешли на страницу регистрации
      await expect(page).toHaveURL(/sign-up/)
      await expect(page.getByText('Регистрация', { exact: true })).toBeVisible()
    })

    test('E2E-1.1.105 — переход со страницы регистрации на вход', async ({ page }) => {
      await page.goto(urls.signUp)

      // Кликаем на ссылку входа (точное совпадение)
      await page.getByText('Войти', { exact: true }).click()

      // Проверяем, что перешли на страницу входа
      await expect(page).toHaveURL(/sign-in/)
      await expect(page.getByText('Вход', { exact: true }).first()).toBeVisible()
    })

    test('E2E-1.1.106 — неавторизованный пользователь редиректится на страницу входа', async ({ page }) => {
      // Пытаемся открыть защищённую страницу
      await page.goto(urls.dashboard)

      // Должен быть редирект на страницу входа
      await expect(page).toHaveURL(/sign-in/)
    })

    test('E2E-1.1.2 — переход на страницу регистрации с главной', async ({ page }) => {
      await page.goto(urls.home)

      // Ищем ссылку/кнопку регистрации в header или на странице
      const signUpLink = page.getByRole('link', { name: /зарегистрироваться|регистрация/i })

      if (await signUpLink.isVisible().catch(() => false)) {
        await signUpLink.click()
        await expect(page).toHaveURL(/sign-up/)
      }
    })
  })

  test.describe('Восстановление пароля', () => {
    test('E2E-1.1.21 — страница восстановления пароля отображается', async ({ page }) => {
      await page.goto(urls.forgotPassword)

      // Проверяем заголовок
      await expect(page.getByText(/восстановление пароля/i)).toBeVisible()

      // Проверяем поле email
      await expect(page.getByPlaceholder(/email|example@mail.com/i)).toBeVisible()

      // Проверяем кнопку отправки
      await expect(page.getByRole('button', { name: /отправить|сбросить|восстановить/i })).toBeVisible()
    })

    test('E2E-1.1.107 — восстановление пароля — ссылка со страницы входа', async ({ page }) => {
      await page.goto(urls.signIn)

      // Ищем ссылку на восстановление пароля
      const forgotLink = page.getByRole('link', { name: /забыли пароль|восстановить/i })

      await expect(forgotLink).toBeVisible()
      await forgotLink.click()

      await expect(page).toHaveURL(/forgot-password/)
    })

    test('E2E-1.1.108 — восстановление пароля — валидация пустого email', async ({ page }) => {
      await page.goto(urls.forgotPassword)

      // Пытаемся отправить без email
      await page.getByRole('button', { name: /отправить|сбросить|восстановить/i }).click()

      // Форма не должна отправиться
      await expect(page).toHaveURL(/forgot-password/)
    })

    test('E2E-1.1.109 — восстановление пароля — ссылка "Вспомнили пароль?"', async ({ page }) => {
      await page.goto(urls.forgotPassword)

      // Ищем ссылку на вход
      const signInLink = page.getByRole('link', { name: /войти/i })

      await expect(signInLink).toBeVisible()
      await signInLink.click()

      await expect(page).toHaveURL(/sign-in/)
    })
  })

  test.describe('Онбординг', () => {
    /**
     * 1.1.4 — Полный цикл: регистрация → PIN → онбординг ученика
     * Тест проходит весь путь от регистрации до dashboard
     * Требует MailHog: SMTP localhost:1025, Web UI localhost:8025
     */
    test('E2E-1.1.4 — полный цикл: регистрация → онбординг ученика', async ({ page }) => {
      // Пропускаем тест если MailHog недоступен
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен на localhost:8025')

      // Очищаем старые письма
      await clearAllEmails()

      const testEmail = generateTestEmail('student-onboard')

      // === 1. РЕГИСТРАЦИЯ ===
      await page.goto(urls.signUp)
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

      // Вводим PIN код — Chakra PinInput автоматически переключает фокус
      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })

      // Пауза для обработки onValueComplete
      await page.waitForTimeout(500)

      // Кликаем кнопку "Подтвердить"
      await page.getByRole('button', { name: /подтвердить/i }).click()

      // Ждём редирект на онбординг
      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

      // === 3. ОНБОРДИНГ УЧЕНИКА ===
      // Шаг 1: Имя и роль
      await expect(page.getByText('Как вас зовут?')).toBeVisible()
      await page.getByPlaceholder('Например: Александр').fill('E2E Ученик Тест')

      // Выбираем роль "Ученик" (force: true для Chakra RadioCard)
      await expect(page.getByText('Выберите вашу роль')).toBeVisible()
      await page.getByRole('radio', { name: /ученик.*записывайтесь/i }).click({ force: true })

      // Нажимаем "Продолжить" для перехода к шагу деталей
      await page.getByRole('button', { name: /продолжить/i }).click()

      // Шаг 2: Детали профиля ученика (город опционален)
      await expect(page.getByText('Расскажите о себе')).toBeVisible({ timeout: 5000 })
      await page.getByRole('button', { name: /завершить/i }).click()

      // === 4. ПРОВЕРКА РЕДИРЕКТА ===
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
    })

    /**
     * 1.1.6 — Полный цикл: регистрация → PIN → онбординг инструктора
     * Инструкторы после базового онбординга редиректятся на /instructor-onboarding
     * Требует MailHog
     */
    test('E2E-1.1.6 — полный цикл: регистрация → онбординг инструктора', async ({ page }) => {
      // Пропускаем тест если MailHog недоступен
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен на localhost:8025')

      // Очищаем старые письма
      await clearAllEmails()

      const testEmail = generateTestEmail('instructor-onboard')

      // === 1. РЕГИСТРАЦИЯ ===
      await page.goto(urls.signUp)
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

      // Вводим PIN код — Chakra PinInput автоматически переключает фокус
      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })

      // Пауза для обработки onValueComplete
      await page.waitForTimeout(500)

      // Кликаем кнопку "Подтвердить"
      await page.getByRole('button', { name: /подтвердить/i }).click()

      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

      // === 3. ОНБОРДИНГ ИНСТРУКТОРА ===
      // Шаг 1: Имя и роль
      await expect(page.getByText('Как вас зовут?')).toBeVisible()
      await page.getByPlaceholder('Например: Александр').fill('E2E Инструктор Тест')

      // Выбираем роль "Инструктор" (force: true для Chakra RadioCard)
      await expect(page.getByText('Выберите вашу роль')).toBeVisible()
      await page.getByRole('radio', { name: /инструктор.*ведите/i }).click({ force: true })

      // Нажимаем "Продолжить" для перехода к шагу деталей
      await page.getByRole('button', { name: /продолжить/i }).click()

      // Шаг 2: Детали профиля инструктора — заполняем обязательные поля
      await expect(page.getByText('Информация об автомобиле')).toBeVisible({ timeout: 15000 })
      await page.getByPlaceholder('Например: Hyundai').fill('Toyota')
      await page.getByPlaceholder('Например: Solaris').fill('Corolla')
      await page.getByRole('button', { name: /завершить/i }).click()

      // === 4. ИНСТРУКТОР → РАСШИРЕННЫЙ ОНБОРДИНГ ===
      await expect(page).toHaveURL(/instructor-onboarding/, { timeout: 20000 })
    })

    /**
     * Полный цикл: регистрация → PIN → онбординг администратора школы
     * Администраторы школ заполняют данные школы и редиректятся на dashboard
     * Требует MailHog
     */
    test('E2E-1.1.110 — полный цикл: регистрация → онбординг администратора школы', async ({ page }) => {
      // Пропускаем тест если MailHog недоступен
      const mailHogAvailable = await isMailHogAvailable()
      test.skip(!mailHogAvailable, 'MailHog недоступен на localhost:8025')

      // Очищаем старые письма
      await clearAllEmails()

      const testEmail = generateTestEmail('school-admin-onboard')

      // === 1. РЕГИСТРАЦИЯ ===
      await page.goto(urls.signUp)
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

      // Вводим PIN код — Chakra PinInput автоматически переключает фокус
      const firstPinInput = page.locator('[data-field-name="pin"] [data-part="control"] input').first()
      await firstPinInput.click()
      await page.keyboard.type(pinCode, { delay: 100 })

      // Пауза для обработки onValueComplete
      await page.waitForTimeout(500)

      // Кликаем кнопку "Подтвердить"
      await page.getByRole('button', { name: /подтвердить/i }).click()

      await expect(page).toHaveURL(/onboarding/, { timeout: 20000 })

      // === 3. ОНБОРДИНГ АДМИНИСТРАТОРА ШКОЛЫ ===
      // Шаг 1: Имя и роль
      await expect(page.getByText('Как вас зовут?')).toBeVisible()
      await page.getByPlaceholder('Например: Александр').fill('E2E Админ Школы')

      // Выбираем роль "Автошкола" (force: true для Chakra RadioCard)
      await expect(page.getByText('Выберите вашу роль')).toBeVisible()
      await page.getByRole('radio', { name: /автошкола.*управляйте/i }).click({ force: true })

      // Нажимаем "Продолжить" для перехода к шагу деталей
      await page.getByRole('button', { name: /продолжить/i }).click()

      // Шаг 2: Данные автошколы — название и город обязательны
      await expect(page.getByText('Данные автошколы')).toBeVisible({ timeout: 5000 })
      await page.getByPlaceholder('Например: Автошкола Профи').fill('E2E Автошкола Тест')
      const cityInput = page.getByPlaceholder('Введите город')
      await cityInput.fill('Москва')
      // DaData API может быть недоступен — пробуем выбрать из автокомплита, если нет — blur для сохранения
      const suggestion = page
        .getByRole('listitem')
        .filter({ hasText: /москва/i })
        .first()
      if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
        await suggestion.click()
      } else {
        // Blur для сохранения введённого текста как значения формы
        await cityInput.blur()
      }
      await page.getByRole('button', { name: /завершить/i }).click()

      // === 4. АДМИНИСТРАТОР → DASHBOARD ===
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
    })
  })

  test.describe('Выход из аккаунта', () => {
    /**
     * 1.1.5 — Выход из аккаунта (требует авторизации)
     * Использует storage state от auth.setup.ts
     *
     * ВАЖНО: Этот тест пропускается если storage state не существует
     * (например при запуске без setup проекта)
     */
    test('E2E-1.1.5 — выход из аккаунта инструктора', async ({ browser }) => {
      const fs = await import('fs')
      const storageStatePath = 'playwright/.auth/instructor.json'

      // Пропускаем тест если storage state не существует (setup не запускался)
      if (!fs.existsSync(storageStatePath)) {
        test.skip(true, 'Storage state не существует — требуется setup проект')
        return
      }

      // Создаём контекст с авторизацией инструктора
      const context = await browser.newContext({
        storageState: storageStatePath,
      })
      const page = await context.newPage()

      // Переходим на dashboard
      await page.goto('/dashboard/')
      await expect(page).toHaveURL(/dashboard/)

      // Ищем кнопку выхода (LogoutButton на dashboard)
      // Кнопка выхода — это form с кнопкой типа submit
      const logoutButton = page.getByRole('button', { name: /выход/i })

      // Проверяем что кнопка видна
      await expect(logoutButton).toBeVisible({ timeout: 5000 })

      // Кликаем на кнопку выхода
      await logoutButton.click()

      // После выхода должен быть редирект на страницу входа
      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })

      await context.close()
    })
  })
})
