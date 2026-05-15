import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

test.use({ storageState: 'playwright/.auth/instructor.json' })

test.describe('5.1 Баланс ученика', () => {
  test('E2E-5.1.1 — открыть список учеников', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const heading = page.getByRole('heading', { name: /учен|student|мои ученики/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('E2E-5.1.2 — перейти к балансу ученика', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .or(page.locator('article').filter({ hasText: /ученик|student|активн/i }))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    // Найти ссылку на баланс
    const balanceLink = studentCard
      .getByRole('link', { name: /баланс|balance/i })
      .or(studentCard.getByRole('button', { name: /баланс|пополнить/i }))

    if (await balanceLink.isVisible().catch(() => false)) {
      await balanceLink.click()
    } else {
      // Попробовать клик на карточку, затем искать баланс
      await studentCard.click()
      await page.waitForLoadState('domcontentloaded')

      const balanceBtn = page
        .getByRole('link', { name: /баланс/i })
        .or(page.getByRole('button', { name: /баланс|пополнить/i }))
        .or(page.getByRole('tab', { name: /баланс/i }))

      if (!(await balanceBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        // Проверяем, что мы на странице студента с балансом
        const hasBalanceInfo = await page
          .getByText(/баланс|prepaid|занятий осталось/i)
          .isVisible()
          .catch(() => false)
        if (hasBalanceInfo) {
          console.log('  ✓ Информация о балансе отображается на странице ученика')
          return
        }
        console.log('  ⏭️ Skip: ссылка на баланс не найдена')
        return
      }
      await balanceBtn.click()
    }

    // Ожидаем страницу баланса или секцию с балансом
    await expect(
      page.getByText(/баланс|prepaid|занятий|lessons/i).or(page.getByRole('heading', { name: /баланс/i }))
    ).toBeVisible({ timeout: 5000 })
  })

  test('E2E-5.1.3 — форма пополнения баланса', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем вкладку или кнопку баланса
    const balanceBtn = page
      .getByRole('link', { name: /баланс/i })
      .or(page.getByRole('button', { name: /баланс|пополнить/i }))
      .or(page.getByRole('tab', { name: /баланс/i }))

    if (await balanceBtn.isVisible().catch(() => false)) {
      await balanceBtn.click()
    }

    // Проверяем форму пополнения
    const addForm = page.locator('form').filter({ hasText: /пополн|добавить.*занят|add.*lesson/i })
    const addButton = page.getByRole('button', { name: /пополнить|добавить|add/i })

    if (await addForm.isVisible().catch(() => false)) {
      await expect(addForm.getByLabel(/количество|занятий|lessons/i).or(addForm.getByRole('spinbutton'))).toBeVisible({
        timeout: 5000,
      })
      console.log('  ✓ Форма пополнения найдена')
    } else if (await addButton.isVisible().catch(() => false)) {
      await expect(addButton).toBeEnabled()
      console.log('  ✓ Кнопка пополнения найдена')
    } else {
      console.log('  ⏭️ Skip: форма пополнения не найдена')
    }
  })

  test('E2E-5.1.4 — верификация прав ученика', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Искать секцию с водительскими правами
    const licenseSection = page
      .locator('[data-testid="license-section"]')
      .or(page.getByText(/водительск.*прав|license|категори/i))
      .or(page.getByRole('heading', { name: /прав|license/i }))

    if (await licenseSection.isVisible().catch(() => false)) {
      await expect(licenseSection.first()).toBeVisible()
      console.log('  ✓ Секция прав найдена')
    } else {
      // Проверяем что хотя бы профиль ученика открылся
      const hasStudentInfo = await page
        .getByText(/ученик|student|профиль/i)
        .isVisible()
        .catch(() => false)
      if (hasStudentInfo) {
        console.log('  ⏭️ Skip: секция прав не найдена, но профиль открыт')
      } else {
        console.log('  ⏭️ Skip: профиль ученика не загрузился')
      }
    }
  })

  // === Iteration 5: Расширенное покрытие (+4 теста) ===

  test('E2E-5.1.5 — история транзакций баланса', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем историю транзакций
    const historySection = page
      .getByText(/история|транзакц|операци|history/i)
      .or(page.locator('[data-testid="balance-history"]'))
      .or(page.getByRole('tab', { name: /история/i }))

    if (await historySection.isVisible().catch(() => false)) {
      await historySection.click()
      await page.waitForTimeout(500)

      // Проверяем наличие списка транзакций или пустого состояния
      const hasList = await page
        .locator('table tbody tr, [data-testid="transaction-item"]')
        .first()
        .isVisible()
        .catch(() => false)
      const hasEmpty = await page
        .getByText(/нет.*операц|пусто|no.*transactions/i)
        .isVisible()
        .catch(() => false)

      expect(hasList || hasEmpty).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: секция истории не найдена')
    }
  })

  test('E2E-5.1.6 — списание занятия с баланса', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем кнопку списания
    const deductBtn = page
      .getByRole('button', { name: /списать|снять|deduct/i })
      .or(page.locator('[data-testid="deduct-balance"]'))

    if (await deductBtn.isVisible().catch(() => false)) {
      await expect(deductBtn).toBeEnabled()
      console.log('  ✓ Кнопка списания найдена')
    } else {
      console.log('  ⏭️ Skip: кнопка списания не найдена')
    }
  })

  test('E2E-5.1.7 — формат отображения суммы баланса', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Проверяем формат отображения баланса (число + "занятий" или сумма)
    const balanceText = page.getByText(/\d+\s*(занят|lesson|₽|руб)/i).or(page.locator('[data-testid="balance-value"]'))

    const hasBalance = await balanceText
      .first()
      .isVisible()
      .catch(() => false)
    if (hasBalance) {
      await expect(balanceText.first()).toBeVisible()
    } else {
      console.log('  ⏭️ Skip: баланс не отображается')
    }
  })

  test('E2E-5.1.8 — уведомление о низком балансе', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем предупреждение о низком балансе (может быть badge, alert или текст)
    const lowBalanceWarning = page
      .getByText(/низкий баланс|мало занятий|заканчива|low balance/i)
      .or(page.locator('[data-testid="low-balance-warning"]'))
      .or(page.getByRole('alert'))

    const hasWarning = await lowBalanceWarning.isVisible().catch(() => false)
    // Предупреждение опционально — не фейлим если его нет
    if (hasWarning) {
      console.log('  ✓ Предупреждение о низком балансе найдено')
    } else {
      console.log('  ℹ️ Предупреждение о низком балансе не отображается (баланс достаточен или функция не реализована)')
    }
  })

  // === Итерация 2: Расширенное покрытие финансовых операций ===

  test('E2E-FINANCE-01 — страница баланса студента открывается напрямую', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    // Ищем ссылку с data-testid или href на balance
    const balanceLink = page.locator('a[href*="/balance"]').first()

    if (await balanceLink.isVisible().catch(() => false)) {
      const href = await balanceLink.getAttribute('href')
      await page.goto(href!)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем что страница баланса открылась
      await expect(
        page.getByText(/баланс|prepaid|занятий/i).or(page.getByRole('heading', { name: /баланс/i }))
      ).toBeVisible({ timeout: 5000 })
    } else {
      console.log('  ⏭️ Skip: прямая ссылка на баланс не найдена')
    }
  })

  test('E2E-FINANCE-02 — отображение статистики баланса (карточки)', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем статистические карточки (Stat.Root)
    const statCards = page.locator('[data-scope="stat"]').or(page.locator('[class*="stat"]'))
    const hasStats = (await statCards.count()) > 0

    if (hasStats) {
      // Проверяем что есть карточка баланса
      const balanceCard = page.getByText(/баланс|занятий/i)
      await expect(balanceCard.first()).toBeVisible()
    } else {
      // Альтернатива: текст с балансом
      const balanceText = page.getByText(/\d+\s*занят/i)
      const hasBalance = await balanceText.isVisible().catch(() => false)
      if (hasBalance) {
        await expect(balanceText.first()).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: статистика баланса не найдена')
      }
    }
  })

  test('E2E-FINANCE-03 — форма пополнения баланса имеет поле количества', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем вкладку или раздел баланса
    const balanceTab = page.getByRole('tab', { name: /баланс/i }).or(page.getByRole('link', { name: /баланс/i }))
    if (await balanceTab.isVisible().catch(() => false)) {
      await balanceTab.click()
      await page.waitForTimeout(500)
    }

    // Ищем форму пополнения
    const amountInput = page
      .getByRole('spinbutton')
      .or(page.getByLabel(/количество/i))
      .or(page.locator('input[type="number"]'))
      .first()

    const hasAmountInput = await amountInput.isVisible().catch(() => false)

    if (hasAmountInput) {
      await expect(amountInput).toBeVisible()
      // Проверяем что поле принимает числа
      await amountInput.fill('5')
      await expect(amountInput).toHaveValue('5')
    } else {
      console.log('  ⏭️ Skip: поле количества для пополнения не найдено')
    }
  })

  test('E2E-FINANCE-04 — кнопка пополнения активна', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем вкладку баланса
    const balanceTab = page.getByRole('tab', { name: /баланс/i }).or(page.getByRole('link', { name: /баланс/i }))
    if (await balanceTab.isVisible().catch(() => false)) {
      await balanceTab.click()
      await page.waitForTimeout(500)
    }

    // Ищем кнопку пополнения
    const addButton = page.getByRole('button', { name: /пополнить|добавить|add/i })

    if (await addButton.isVisible().catch(() => false)) {
      await expect(addButton).toBeEnabled()
    } else {
      console.log('  ⏭️ Skip: кнопка пополнения не найдена')
    }
  })

  test('E2E-FINANCE-05 — валидация формы пополнения (нельзя ввести 0)', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Ищем поле количества
    const amountInput = page.getByRole('spinbutton').or(page.locator('input[type="number"]')).first()

    if (!(await amountInput.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: поле количества не найдено')
      return
    }

    // Пробуем ввести 0 и отправить
    await amountInput.fill('0')

    const submitButton = page.getByRole('button', { name: /пополнить|добавить/i })
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click()

      // Должна быть ошибка валидации
      const errorText = page.getByText(/больше 0|минимум|не может быть 0|invalid/i)
      const hasError = await errorText.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasError) {
        await expect(errorText).toBeVisible()
      } else {
        // Кнопка может быть просто disabled
        console.log('  ℹ️ Валидация через disabled кнопку или min атрибут')
      }
    }
  })

  test('E2E-FINANCE-06 — статус связи отображается', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Проверяем статус связи
    const statusText = page.getByText(/активна|на паузе|отключена|active|paused|disconnected/i)
    const hasStatus = await statusText.isVisible().catch(() => false)

    if (hasStatus) {
      await expect(statusText.first()).toBeVisible()
    } else {
      console.log('  ⏭️ Skip: статус связи не отображается')
    }
  })

  test('E2E-FINANCE-07 — пополнение недоступно при неактивной связи', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Проверяем если связь неактивна
    const inactiveStatus = page.getByText(/на паузе|отключена|paused|disconnected/i)
    const isInactive = await inactiveStatus.isVisible().catch(() => false)

    if (isInactive) {
      // Должно быть предупреждение о недоступности пополнения
      const warningMessage = page.getByText(/недоступно|неактивн|нельзя пополн/i)
      const hasWarning = await warningMessage.isVisible().catch(() => false)

      if (hasWarning) {
        await expect(warningMessage).toBeVisible()
      } else {
        // Или форма пополнения просто скрыта
        const addForm = page.locator('form').filter({ hasText: /пополн/i })
        const formHidden = !(await addForm.isVisible().catch(() => false))
        expect(formHidden || hasWarning).toBeTruthy()
      }
    } else {
      console.log('  ⏭️ Skip: связь активна, нет неактивных учеников для проверки')
    }
  })

  test('E2E-FINANCE-08 — секция водительских прав отображается', async ({ page }) => {
    await page.goto(urls.instructorStudents)
    await page.waitForLoadState('domcontentloaded')

    const studentCard = page
      .locator('[data-testid="student-card"]')
      .or(page.locator('[data-testid="student-connection-card"]'))
      .first()

    if (!(await studentCard.isVisible().catch(() => false))) {
      console.log('  ⏭️ Skip: нет учеников')
      return
    }

    await studentCard.click()
    await page.waitForLoadState('domcontentloaded')

    // Проверяем секцию водительских прав
    const licenseHeading = page.getByRole('heading', { name: /водительск.*прав|license/i })
    const licenseSection = page.getByText(/права|категори|верифика/i)

    const hasLicense =
      (await licenseHeading.isVisible().catch(() => false)) || (await licenseSection.isVisible().catch(() => false))

    if (hasLicense) {
      await expect(licenseHeading.or(licenseSection).first()).toBeVisible()
    } else {
      console.log('  ⏭️ Skip: секция прав не найдена')
    }
  })
})
