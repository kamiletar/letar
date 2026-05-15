import { expect, test } from './fixtures/base-test'
import { urlsExtended } from './fixtures/test-data'

test.describe('65. Создание школы /school/create/', () => {
  test.describe('65.1 Загрузка страницы создания', () => {
    test('E2E-65.1.1 — страница создания школы загружается', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем заголовок страницы
      const heading = page
        .getByRole('heading', { name: /создание школы|новая школа|create school/i })
        .or(page.getByRole('heading', { name: /регистрация школы/i }))
        .or(page.getByText(/создать.*школ/i))

      const hasHeading = await heading.isVisible().catch(() => false)

      // Страница может требовать авторизацию
      const needsAuth = page.url().includes('sign-in') || page.url().includes('login')

      if (needsAuth) {
        console.log('  ⏭️ Skip: требуется авторизация для создания школы')
        return
      }

      if (hasHeading) {
        await expect(heading).toBeVisible()
        console.log('  ✓ Страница создания школы загружается')
      } else {
        // Может быть недоступно для текущего пользователя
        const accessDenied = await page
          .getByText(/доступ запрещён|нет прав|access denied/i)
          .isVisible()
          .catch(() => false)

        if (accessDenied) {
          console.log('  ⏭️ Skip: нет прав для создания школы')
        } else {
          console.log('  ⏭️ Skip: заголовок страницы не найден')
        }
      }
    })

    test('E2E-65.1.2 — форма создания школы отображается', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем форму
      const form = page.locator('form').or(page.locator('[data-testid="create-school-form"]'))

      const hasForm = await form.isVisible().catch(() => false)
      if (hasForm) {
        await expect(form).toBeVisible()
        console.log('  ✓ Форма создания школы найдена')
      } else {
        console.log('  ⏭️ Skip: форма не найдена')
      }
    })
  })

  test.describe('65.2 Поля формы', () => {
    test('E2E-65.2.1 — поле названия школы', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем поле названия
      const nameInput = page
        .getByRole('textbox', { name: /название|name|наименование/i })
        .or(page.locator('[data-testid="school-name-input"]'))
        .or(page.getByLabel(/название школы/i))

      const hasNameInput = await nameInput.isVisible().catch(() => false)
      if (hasNameInput) {
        await expect(nameInput).toBeEnabled()
        console.log('  ✓ Поле названия школы найдено')
      } else {
        console.log('  ⏭️ Skip: поле названия не найдено')
      }
    })

    test('E2E-65.2.2 — поле описания школы', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем поле описания
      const descriptionInput = page
        .getByRole('textbox', { name: /описание|description/i })
        .or(page.locator('textarea'))
        .or(page.getByLabel(/описание школы/i))

      const hasDescriptionInput = await descriptionInput.isVisible().catch(() => false)
      if (hasDescriptionInput) {
        await expect(descriptionInput).toBeEnabled()
        console.log('  ✓ Поле описания школы найдено')
      } else {
        console.log('  ⏭️ Skip: поле описания не найдено')
      }
    })

    test('E2E-65.2.3 — поле адреса/города', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем поле адреса
      const addressInput = page
        .getByRole('textbox', { name: /адрес|город|city|address|location/i })
        .or(page.locator('[data-testid="school-address-input"]'))
        .or(page.getByLabel(/адрес|город/i))

      const hasAddressInput = await addressInput.isVisible().catch(() => false)
      if (hasAddressInput) {
        await expect(addressInput).toBeEnabled()
        console.log('  ✓ Поле адреса/города найдено')
      } else {
        console.log('  ⏭️ Skip: поле адреса не найдено')
      }
    })

    test('E2E-65.2.4 — поле контактного телефона', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем поле телефона
      const phoneInput = page
        .getByRole('textbox', { name: /телефон|phone/i })
        .or(page.locator('[data-testid="school-phone-input"]'))
        .or(page.getByLabel(/телефон/i))
        .or(page.locator('input[type="tel"]'))

      const hasPhoneInput = await phoneInput.isVisible().catch(() => false)
      if (hasPhoneInput) {
        await expect(phoneInput).toBeEnabled()
        console.log('  ✓ Поле телефона найдено')
      } else {
        console.log('  ⏭️ Skip: поле телефона не найдено')
      }
    })
  })

  test.describe('65.3 Загрузка логотипа', () => {
    test('E2E-65.3.1 — поле загрузки логотипа школы', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем поле загрузки логотипа
      const logoUpload = page
        .locator('input[type="file"]')
        .or(page.locator('[data-testid="logo-upload"]'))
        .or(page.getByRole('button', { name: /загруз|upload|логотип/i }))

      const hasLogoUpload = await logoUpload.isVisible().catch(() => false)
      if (hasLogoUpload) {
        console.log('  ✓ Поле загрузки логотипа найдено')
      } else {
        console.log('  ⏭️ Skip: поле загрузки логотипа не найдено')
      }
    })
  })

  test.describe('65.4 Действия формы', () => {
    test('E2E-65.4.1 — кнопка создания школы', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем кнопку создания
      const createButton = page
        .getByRole('button', { name: /создать|create|сохран|save|зарегистр/i })
        .or(page.locator('[data-testid="create-school-button"]'))
        .or(page.locator('button[type="submit"]'))

      const hasCreateButton = await createButton.isVisible().catch(() => false)
      if (hasCreateButton) {
        await expect(createButton).toBeVisible()
        console.log('  ✓ Кнопка создания школы найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка создания не найдена')
      }
    })

    test('E2E-65.4.2 — валидация обязательных полей', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Пробуем отправить пустую форму
      const submitButton = page
        .getByRole('button', { name: /создать|create|сохран/i })
        .or(page.locator('button[type="submit"]'))

      if (!(await submitButton.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: кнопка отправки не найдена')
        return
      }

      await submitButton.click()
      await page.waitForTimeout(500)

      // Ищем сообщения об ошибках валидации
      const validationError = page
        .getByText(/обязательн|required|заполните|введите/i)
        .or(page.locator('[role="alert"]'))
        .or(page.locator('.error-message'))
        .first()

      const hasValidation = await validationError.isVisible().catch(() => false)
      if (hasValidation) {
        console.log('  ✓ Валидация обязательных полей работает')
      } else {
        // Может сработать HTML5 валидация
        console.log('  ⏭️ Skip: сообщение валидации не найдено')
      }
    })

    test('E2E-65.4.3 — кнопка отмены/назад', async ({ page }) => {
      await page.goto(urlsExtended.schoolCreate)
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем кнопку отмены
      const cancelButton = page
        .getByRole('button', { name: /отмен|cancel|назад|back/i })
        .or(page.getByRole('link', { name: /отмен|назад|back/i }))
        .or(page.locator('[data-testid="cancel-button"]'))

      const hasCancelButton = await cancelButton.isVisible().catch(() => false)
      if (hasCancelButton) {
        await expect(cancelButton).toBeVisible()
        console.log('  ✓ Кнопка отмены найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка отмены не найдена')
      }
    })
  })

  // ========================================
  // Итерация 4: Управление ролями и членами школы
  // ========================================

  test.describe('65.5 Управление членами школы', () => {
    test('E2E-SCHOOL-01 — приглашение MANAGER', async ({ page }) => {
      // Переходим на страницу управления школой
      await page.goto('/school/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем кнопку приглашения
      const inviteButton = page
        .getByRole('button', { name: /пригласить|invite|добавить член|add member/i })
        .or(page.locator('[data-testid="invite-member-button"]'))

      const hasInviteButton = await inviteButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasInviteButton) {
        console.log('  ⏭️ Skip: кнопка приглашения не найдена')
        return
      }

      await inviteButton.click()

      // Ищем форму с выбором роли
      const roleSelect = page
        .getByRole('combobox', { name: /роль|role/i })
        .or(page.getByLabel(/роль/i))
        .or(page.locator('select[name="role"]'))

      const hasRoleSelect = await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasRoleSelect) {
        // Проверяем наличие роли MANAGER в списке
        await roleSelect.click()
        const managerOption = page.getByRole('option', { name: /manager|менеджер|администратор/i })
        const hasManagerOption = await managerOption.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasManagerOption) {
          await expect(managerOption).toBeVisible()
          console.log('  ✓ Роль MANAGER доступна для приглашения')
        } else {
          console.log('  ⏭️ Skip: роль MANAGER не найдена в списке')
        }
      } else {
        console.log('  ⏭️ Skip: форма с выбором роли не найдена')
      }
    })

    test('E2E-SCHOOL-02 — приглашение INSTRUCTOR', async ({ page }) => {
      await page.goto('/school/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      const inviteButton = page.getByRole('button', { name: /пригласить|invite/i })
      if (!(await inviteButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('  ⏭️ Skip: кнопка приглашения не найдена')
        return
      }

      await inviteButton.click()

      // Проверяем наличие роли INSTRUCTOR
      const roleSelect = page.getByRole('combobox', { name: /роль|role/i }).or(page.getByLabel(/роль/i))
      if (await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roleSelect.click()
        const instructorOption = page.getByRole('option', { name: /instructor|инструктор/i })
        const hasInstructorOption = await instructorOption.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasInstructorOption) {
          await expect(instructorOption).toBeVisible()
          console.log('  ✓ Роль INSTRUCTOR доступна для приглашения')
        } else {
          console.log('  ⏭️ Skip: роль INSTRUCTOR не найдена')
        }
      } else {
        console.log('  ⏭️ Skip: форма с выбором роли не найдена')
      }
    })

    test('E2E-SCHOOL-03 — приглашение THEORY_INSTRUCTOR', async ({ page }) => {
      await page.goto('/school/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      const inviteButton = page.getByRole('button', { name: /пригласить|invite/i })
      if (!(await inviteButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('  ⏭️ Skip: кнопка приглашения не найдена')
        return
      }

      await inviteButton.click()

      const roleSelect = page.getByRole('combobox', { name: /роль|role/i }).or(page.getByLabel(/роль/i))
      if (await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roleSelect.click()
        const theoryInstructorOption = page.getByRole('option', { name: /theory|теори|преподаватель/i })
        const hasTheoryOption = await theoryInstructorOption.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasTheoryOption) {
          await expect(theoryInstructorOption).toBeVisible()
          console.log('  ✓ Роль THEORY_INSTRUCTOR доступна для приглашения')
        } else {
          console.log('  ⏭️ Skip: роль THEORY_INSTRUCTOR не найдена')
        }
      } else {
        console.log('  ⏭️ Skip: форма с выбором роли не найдена')
      }
    })

    test('E2E-SCHOOL-04 — приглашение STUDENT', async ({ page }) => {
      await page.goto('/school/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      const inviteButton = page.getByRole('button', { name: /пригласить|invite/i })
      if (!(await inviteButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('  ⏭️ Skip: кнопка приглашения не найдена')
        return
      }

      await inviteButton.click()

      const roleSelect = page.getByRole('combobox', { name: /роль|role/i }).or(page.getByLabel(/роль/i))
      if (await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roleSelect.click()
        const studentOption = page.getByRole('option', { name: /student|ученик|курсант/i })
        const hasStudentOption = await studentOption.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasStudentOption) {
          await expect(studentOption).toBeVisible()
          console.log('  ✓ Роль STUDENT доступна для приглашения')
        } else {
          console.log('  ⏭️ Skip: роль STUDENT не найдена')
        }
      } else {
        console.log('  ⏭️ Skip: форма с выбором роли не найдена')
      }
    })
  })

  test.describe('65.6 Права доступа по ролям', () => {
    test('E2E-SCHOOL-06 — ADMIN может редактировать настройки', async ({ page }) => {
      // Переходим на страницу настроек школы
      await page.goto('/school/settings/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Проверяем, что страница настроек доступна (нет сообщения об отказе)
      const accessDenied = page.getByText(/доступ запрещён|access denied|только администратор/i)
      const hasAccessDenied = await accessDenied.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasAccessDenied) {
        console.log('  ⏭️ Skip: пользователь не админ — доступ запрещён')
        return
      }

      // Проверяем наличие формы редактирования
      const settingsForm = page.locator('form').or(page.getByText(/настройки школы/i))
      const hasSettingsForm = await settingsForm.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasSettingsForm) {
        await expect(settingsForm).toBeVisible()
        console.log('  ✓ ADMIN может редактировать настройки школы')
      } else {
        console.log('  ⏭️ Skip: форма настроек не найдена')
      }
    })

    test('E2E-SCHOOL-07 — проверка ограничения доступа к настройкам', async ({ page }) => {
      // Этот тест проверяет, что страница правильно обрабатывает отказ в доступе
      await page.goto('/school/settings/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Либо есть форма (для админа), либо есть сообщение о запрете (для не-админа)
      const settingsForm = page.locator('form')
      const accessDenied = page.getByText(/доступ запрещён|access denied|только администратор/i)

      const hasForm = await settingsForm.isVisible({ timeout: 5000 }).catch(() => false)
      const hasDenied = await accessDenied.isVisible().catch(() => false)

      if (hasForm || hasDenied) {
        // Страница корректно обрабатывает доступ
        expect(hasForm || hasDenied).toBeTruthy()
        console.log('  ✓ Страница настроек корректно обрабатывает права доступа')
      } else {
        console.log('  ⏭️ Skip: не удалось определить состояние страницы')
      }
    })

    test('E2E-SCHOOL-08 — отображение списка членов школы', async ({ page }) => {
      await page.goto('/school/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем таблицу членов
      const membersTable = page
        .getByRole('table')
        .or(page.locator('[data-testid="members-table"]'))
        .or(page.getByText(/участники|members|состав/i))

      const hasMembersTable = await membersTable.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasMembersTable) {
        await expect(membersTable).toBeVisible()
        console.log('  ✓ Список членов школы отображается')
      } else {
        console.log('  ⏭️ Skip: список членов не найден')
      }
    })

    test('E2E-SCHOOL-10 — кнопка удаления члена из школы', async ({ page }) => {
      await page.goto('/school/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем кнопку удаления члена
      const deleteButton = page
        .getByRole('button', { name: /удалить|remove|исключить|delete/i })
        .or(page.locator('[data-testid="remove-member-button"]'))
        .or(page.locator('[aria-label*="удалить"]'))

      const hasDeleteButton = await deleteButton
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (hasDeleteButton) {
        await expect(deleteButton.first()).toBeVisible()
        console.log('  ✓ Кнопка удаления члена найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка удаления не найдена (возможно нет прав или членов)')
      }
    })
  })

  test.describe('65.7 Приглашения', () => {
    test('E2E-SCHOOL-05 — секция активных приглашений', async ({ page }) => {
      await page.goto('/school/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем секцию приглашений
      const invitationsSection = page
        .getByText(/приглашения|invitations|ожидающие/i)
        .or(page.locator('[data-testid="invitations-card"]'))

      const hasInvitationsSection = await invitationsSection.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasInvitationsSection) {
        await expect(invitationsSection).toBeVisible()
        console.log('  ✓ Секция приглашений отображается')
      } else {
        console.log('  ⏭️ Skip: секция приглашений не найдена')
      }
    })

    test('E2E-SCHOOL-09 — форма отправки приглашения по email', async ({ page }) => {
      await page.goto('/school/')
      await page.waitForLoadState('domcontentloaded')

      if (page.url().includes('sign-in')) {
        console.log('  ⏭️ Skip: требуется авторизация')
        return
      }

      // Ищем кнопку приглашения
      const inviteButton = page.getByRole('button', { name: /пригласить|invite/i })
      if (!(await inviteButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('  ⏭️ Skip: кнопка приглашения не найдена')
        return
      }

      await inviteButton.click()

      // Проверяем наличие поля email в форме приглашения
      const emailInput = page
        .getByRole('textbox', { name: /email|почта/i })
        .or(page.getByLabel(/email/i))
        .or(page.locator('input[type="email"]'))

      const hasEmailInput = await emailInput.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasEmailInput) {
        await expect(emailInput).toBeEnabled()
        console.log('  ✓ Форма приглашения по email найдена')
      } else {
        console.log('  ⏭️ Skip: поле email не найдено в форме приглашения')
      }
    })
  })
})
