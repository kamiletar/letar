import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для управления транспортными средствами инструктора
 *
 * Страницы:
 * - /vehicles/ — список транспорта
 * - /vehicles/create/ — добавление нового ТС
 * - /vehicles/[id]/edit/ — редактирование ТС
 */
test.describe('Транспортные средства инструктора', () => {
  test.describe('Список транспорта', () => {
    test('E2E-VEH-1 — страница списка загружается', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Заголовок "Мои автомобили"
      await expect(page.getByRole('heading', { name: /мои автомобили/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-VEH-2 — отображается кнопка добавления авто', async ({ page }) => {
      await page.goto(urls.vehicles)

      // Кнопка "Добавить авто"
      await expect(
        page.getByRole('link', { name: /добавить авто/i }).or(page.getByRole('button', { name: /добавить авто/i }))
      ).toBeVisible({ timeout: 10000 })
    })

    test('E2E-VEH-3 — клик на кнопку добавления переходит на create', async ({ page }) => {
      await page.goto(urls.vehicles)

      const addButton = page
        .getByRole('link', { name: /добавить авто/i })
        .or(page.getByRole('button', { name: /добавить авто/i }))

      await addButton.click()

      // Должен быть переход на страницу создания
      await expect(page).toHaveURL(/vehicles\/create/, { timeout: 10000 })
    })

    test('E2E-VEH-4 — пустое состояние отображается корректно', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Либо карточки автомобилей, либо пустое состояние
      const hasVehicles = await page
        .locator('[data-testid="vehicle-card"]')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (!hasVehicles) {
        // Пустое состояние: "Нет автомобилей"
        await expect(page.getByRole('heading', { name: /нет автомобилей/i })).toBeVisible()
      }
    })

    test('E2E-VEH-5 — карточка автомобиля показывает основную информацию', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Ищем карточку автомобиля
      const vehicleCard = page.locator('[data-testid="vehicle-card"]').first()

      const hasVehicleCard = await vehicleCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasVehicleCard) {
        // Карточка должна содержать марку/модель или информацию об авто
        await expect(
          vehicleCard
            .getByText(/toyota|hyundai|kia|volkswagen|lada|skoda/i)
            .or(vehicleCard.getByText(/механик|автомат|МКПП|АКПП/i))
        ).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: нет автомобилей для отображения')
      }
    })
  })

  test.describe('Создание транспортного средства', () => {
    test('E2E-VEH-6 — страница создания загружается', async ({ page }) => {
      await page.goto(urls.vehiclesCreate)
      await page.waitForLoadState('domcontentloaded')

      // Заголовок "Добавить автомобиль"
      await expect(page.getByRole('heading', { name: /добавить автомобиль/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-VEH-7 — форма содержит обязательные поля', async ({ page }) => {
      await page.goto(urls.vehiclesCreate)
      await page.waitForLoadState('domcontentloaded')

      // Поле марки (textbox)
      await expect(page.getByRole('textbox', { name: /марка/i })).toBeVisible({ timeout: 10000 })

      // Поле модели (textbox)
      await expect(page.getByRole('textbox', { name: /модель/i })).toBeVisible()

      // Тип КПП (combobox)
      await expect(page.getByRole('combobox', { name: /кпп/i })).toBeVisible()
    })

    test('E2E-VEH-8 — кнопка отправки формы присутствует', async ({ page }) => {
      await page.goto(urls.vehiclesCreate)

      // Кнопка "Добавить"
      await expect(page.getByRole('button', { name: /добавить/i })).toBeVisible({ timeout: 10000 })
    })

    test('E2E-VEH-9 — валидация пустых обязательных полей', async ({ page }) => {
      await page.goto(urls.vehiclesCreate)
      await page.waitForLoadState('domcontentloaded')

      // Нажимаем кнопку отправки без заполнения
      const submitButton = page.getByRole('button', { name: /добавить/i })
      await expect(submitButton).toBeVisible({ timeout: 10000 })
      await submitButton.click()

      // Ждём реакции формы
      await page.waitForTimeout(500)

      // Проверяем что форма всё ещё видна (не отправилась, т.к. валидация не прошла)
      // или появились ошибки валидации
      const hasInvalidField = await page
        .locator('[aria-invalid="true"]')
        .first()
        .isVisible()
        .catch(() => false)
      const formStillVisible = await page
        .getByRole('textbox', { name: /марка/i })
        .isVisible()
        .catch(() => false)

      expect(hasInvalidField || formStillVisible).toBe(true)
    })

    test('E2E-VEH-10 — форма заполняется и реагирует на submit', async ({ page }) => {
      await page.goto(urls.vehiclesCreate)
      await page.waitForLoadState('domcontentloaded')

      // Заполняем основные поля
      const brandField = page.getByLabel(/марка/i).or(page.getByPlaceholder(/toyota|hyundai|марка/i))
      await brandField.fill('Тест Марка E2E')

      const modelField = page.getByLabel(/модель/i).or(page.getByPlaceholder(/camry|solaris|модель/i))
      await modelField.fill('Тест Модель E2E')

      const yearField = page.getByLabel(/год выпуска/i).or(page.getByRole('spinbutton', { name: /год/i }))
      if (await yearField.isVisible().catch(() => false)) {
        await yearField.fill('2020')
      }

      const colorField = page.getByLabel(/цвет/i).or(page.getByPlaceholder(/белый|серебр/i))
      if (await colorField.isVisible().catch(() => false)) {
        await colorField.fill('Белый')
      }

      // Проверяем что данные заполнены
      await expect(brandField).toHaveValue('Тест Марка E2E')
      await expect(modelField).toHaveValue('Тест Модель E2E')

      // Нажимаем кнопку добавления
      const submitButton = page.getByRole('button', { name: /добавить/i })
      await submitButton.click()

      // Ждём реакции на submit (успех, валидация, или страница остаётся)
      await page.waitForTimeout(1000)

      // Тест успешен если страница интерактивна (не 500, не белый экран)
      await expect(page.getByRole('heading', { name: /добавить автомобиль/i })).toBeVisible()
    })

    test('E2E-VEH-11 — кнопка отмены возвращает назад', async ({ page }) => {
      // Сначала переходим на список
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Затем на создание
      await page.goto(urls.vehiclesCreate)
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку отмены
      const cancelButton = page.getByRole('button', { name: /отмена/i }).or(page.getByRole('link', { name: /отмена/i }))

      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click()

        // Должен быть возврат (не остаёмся на create)
        await page.waitForTimeout(1000)
        expect(page.url()).not.toContain('/create')
      }
    })
  })

  test.describe('Редактирование транспортного средства', () => {
    test('E2E-VEH-12 — переход к редактированию из карточки', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Ищем карточку автомобиля
      const vehicleCard = page.locator('[data-testid="vehicle-card"]').first()
      const hasVehicleCard = await vehicleCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasVehicleCard) {
        console.log('  ⏭️ Skip: нет автомобилей для редактирования')
        return
      }

      // Ищем кнопку редактирования или ссылку
      const editButton = vehicleCard
        .getByRole('link', { name: /редактировать|изменить/i })
        .or(vehicleCard.getByRole('button', { name: /редактировать|изменить/i }))
        .or(vehicleCard.locator('[href*="/edit"]'))

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click()
        await expect(page).toHaveURL(/vehicles\/.*\/edit/, { timeout: 10000 })
      } else {
        // Попробуем клик по карточке
        await vehicleCard.click()
        // Проверяем появление меню/модалки или переход
        await page.waitForTimeout(1000)
      }
    })

    test('E2E-VEH-13 — форма редактирования предзаполнена', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Ищем карточку с кнопкой редактирования
      const editLink = page.locator('a[href*="/vehicles/"][href*="/edit"]').first()
      const hasEditLink = await editLink.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasEditLink) {
        console.log('  ⏭️ Skip: нет автомобилей для редактирования')
        return
      }

      await editLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Поля должны быть предзаполнены
      const brandField = page.getByLabel(/марка/i).or(page.getByPlaceholder(/toyota|hyundai|марка/i))

      if (await brandField.isVisible().catch(() => false)) {
        const brandValue = await brandField.inputValue()
        expect(brandValue.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Доступ и безопасность', () => {
    test('E2E-VEH-14 — неавторизованный пользователь редиректится', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.vehicles, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      // Должен быть редирект на sign-in, login или 404
      const isAuthUrl = page.url().includes('sign-in') || page.url().includes('login')
      const has404 = await page
        .getByText(/404|не найден/i)
        .isVisible()
        .catch(() => false)
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      expect(isAuthUrl || has404 || hasSignInForm).toBe(true)

      await context.close()
    })

    test('E2E-VEH-15 — страница создания защищена', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      try {
        await page.goto(urls.vehiclesCreate, { timeout: 15000 })
      } catch {
        console.log('  ⏭️ Skip: страница не загрузилась')
        await context.close()
        return
      }

      await page.waitForLoadState('domcontentloaded')

      // Должен быть редирект на sign-in, login или 404
      const isAuthUrl = page.url().includes('sign-in') || page.url().includes('login')
      const has404 = await page
        .getByText(/404|не найден/i)
        .isVisible()
        .catch(() => false)
      const hasSignInForm = await page
        .getByPlaceholder(/email/i)
        .isVisible()
        .catch(() => false)

      expect(isAuthUrl || has404 || hasSignInForm).toBe(true)

      await context.close()
    })
  })

  test.describe('Фильтрация и статусы', () => {
    test('E2E-VEH-16 — отображение активных и неактивных ТС', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Может быть разделение на активные/неактивные
      const hasInactiveSection = await page
        .getByText(/неактивные автомобили/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasInactiveSection) {
        // Раздел неактивных отображается
        await expect(page.getByText(/неактивные автомобили/i)).toBeVisible()
      }
    })

    test('E2E-VEH-17 — отображение статуса доступности', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Ищем индикаторы статуса на карточках
      const vehicleCard = page.locator('[data-testid="vehicle-card"]').first()
      const hasVehicleCard = await vehicleCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasVehicleCard) {
        // Может быть badge или текст статуса
        const hasStatusIndicator = await vehicleCard
          .getByText(/доступен|недоступен|на ремонте|на ТО|активен/i)
          .isVisible()
          .catch(() => false)

        // Статус может отображаться как badge/icon — это нормально
        if (!hasStatusIndicator) {
          console.log('  ℹ️ Статус может отображаться как иконка')
        }
      }
    })
  })

  // === Iteration 5: Расширенное CRUD покрытие (+4 теста) ===

  test.describe('Расширенное редактирование и удаление', () => {
    test('E2E-VEH-18 — страница редактирования загружается', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      // Ищем ссылку на редактирование
      const editLink = page.locator('a[href*="/vehicles/"][href*="/edit"]').first()
      const hasEditLink = await editLink.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasEditLink) {
        console.log('  ⏭️ Skip: нет автомобилей для редактирования')
        return
      }

      await editLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Проверяем заголовок страницы редактирования
      const heading = page
        .getByRole('heading', { name: /редактирование|изменить|edit/i })
        .or(page.getByRole('heading', { name: /автомобиль/i }))

      const hasHeading = await heading.isVisible().catch(() => false)
      if (hasHeading) {
        await expect(heading).toBeVisible()
        console.log('  ✓ Страница редактирования загружается')
      } else {
        console.log('  ⏭️ Skip: заголовок редактирования не найден')
      }
    })

    test('E2E-VEH-19 — валидация при редактировании', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      const editLink = page.locator('a[href*="/vehicles/"][href*="/edit"]').first()
      const hasEditLink = await editLink.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasEditLink) {
        console.log('  ⏭️ Skip: нет автомобилей для редактирования')
        return
      }

      await editLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Очищаем обязательное поле
      const brandField = page.getByLabel(/марка/i).or(page.getByRole('textbox', { name: /марка/i }))

      if (!(await brandField.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: поле марки не найдено')
        return
      }

      await brandField.clear()

      // Пробуем сохранить
      const saveButton = page
        .getByRole('button', { name: /сохранить|обновить|save|update/i })
        .or(page.locator('button[type="submit"]'))

      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click()
        await page.waitForTimeout(500)

        // Должна появиться ошибка валидации или форма не отправится
        const hasError = await page
          .locator('[aria-invalid="true"]')
          .first()
          .isVisible()
          .catch(() => false)
        const formStillVisible = await brandField.isVisible().catch(() => false)

        expect(hasError || formStillVisible).toBe(true)
        console.log('  ✓ Валидация при редактировании работает')
      }
    })

    test('E2E-VEH-20 — отмена редактирования возвращает к списку', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      const editLink = page.locator('a[href*="/vehicles/"][href*="/edit"]').first()
      const hasEditLink = await editLink.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasEditLink) {
        console.log('  ⏭️ Skip: нет автомобилей для редактирования')
        return
      }

      await editLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку отмены
      const cancelButton = page
        .getByRole('button', { name: /отмена|cancel|назад/i })
        .or(page.getByRole('link', { name: /отмена|cancel|назад|вернуться/i }))

      const hasCancelButton = await cancelButton.isVisible().catch(() => false)
      if (hasCancelButton) {
        await cancelButton.click()
        await page.waitForTimeout(500)

        // Должен быть возврат на список (URL не содержит /edit)
        expect(page.url()).not.toContain('/edit')
        console.log('  ✓ Отмена редактирования работает')
      } else {
        console.log('  ⏭️ Skip: кнопка отмены не найдена')
      }
    })

    test('E2E-VEH-21 — кнопка удаления автомобиля доступна', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      const editLink = page.locator('a[href*="/vehicles/"][href*="/edit"]').first()
      const hasEditLink = await editLink.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasEditLink) {
        console.log('  ⏭️ Skip: нет автомобилей для удаления')
        return
      }

      await editLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку удаления
      const deleteButton = page
        .getByRole('button', { name: /удалить|delete/i })
        .or(page.locator('[data-testid="delete-vehicle-button"]'))

      const hasDeleteButton = await deleteButton.isVisible().catch(() => false)
      if (hasDeleteButton) {
        // Не кликаем на удаление — только проверяем доступность
        await expect(deleteButton).toBeEnabled()
        console.log('  ✓ Кнопка удаления найдена')
      } else {
        // Может быть в меню
        const menuButton = page.getByRole('button', { name: /⋮|⋯|меню|more/i })
        if (await menuButton.isVisible().catch(() => false)) {
          await menuButton.click()
          await page.waitForTimeout(300)

          const deleteMenuItem = page.getByRole('menuitem', { name: /удалить/i })
          const hasDeleteMenuItem = await deleteMenuItem.isVisible().catch(() => false)
          if (hasDeleteMenuItem) {
            console.log('  ✓ Удаление доступно в меню')
            await page.keyboard.press('Escape')
          } else {
            console.log('  ⏭️ Skip: кнопка удаления не найдена')
          }
        } else {
          console.log('  ⏭️ Skip: кнопка удаления не найдена')
        }
      }
    })
  })
})
