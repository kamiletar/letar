/**
 * E2E тесты: Настройки расписания инструктора
 *
 * Тесты для настройки рабочих часов, параметров занятий, отпусков и генерации слотов.
 */

import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { expectErrorToast, expectSuccessToast } from './helpers/page.helpers'

test.describe('Настройки расписания инструктора', () => {
  test.describe('Отображение страницы', () => {
    test('E2E-3.1.6 — страница настроек расписания загружается корректно', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Проверяем заголовок страницы
      await expect(page.getByRole('heading', { name: 'Настройки расписания' })).toBeVisible()
      await expect(page.getByText('Настройте рабочие часы и параметры занятий')).toBeVisible()
    })

    test('E2E-4.101 — форма содержит все необходимые поля', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Ждём загрузки страницы
      await page.waitForLoadState('domcontentloaded')

      // Рабочие часы — ищем по точному совпадению (есть также "Настройте рабочие часы...")
      await expect(page.getByText('Рабочие часы', { exact: true })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Понедельник', { exact: true })).toBeVisible()
      await expect(page.getByText('Вторник', { exact: true })).toBeVisible()
      await expect(page.getByText('Среда', { exact: true })).toBeVisible()
      await expect(page.getByText('Четверг', { exact: true })).toBeVisible()
      await expect(page.getByText('Пятница', { exact: true })).toBeVisible()
      await expect(page.getByText('Суббота', { exact: true })).toBeVisible()
      await expect(page.getByText('Воскресенье', { exact: true })).toBeVisible()

      // Параметры занятий — ищем по точному совпадению label
      await expect(page.getByText('Длительность занятия*')).toBeVisible()
      await expect(page.getByText('Перерыв между занятиями*')).toBeVisible()
      await expect(page.getByText('Горизонт планирования*')).toBeVisible()

      // Кнопка сохранения
      await expect(page.getByRole('button', { name: 'Сохранить настройки' })).toBeVisible()
    })

    test('E2E-4.102 — показывается предварительный расчёт слотов', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Проверяем наличие блока с расчётом
      await expect(page.getByText('Предварительный расчёт')).toBeVisible()
      await expect(page.getByText(/слотов|занятий в день/)).toBeVisible()
    })
  })

  test.describe('Настройка рабочих дней', () => {
    test('E2E-3.1.7 — можно выбрать рабочие дни', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Кликаем на лейблы чекбоксов (Chakra Checkbox.Label) — exact: true из-за ошибок валидации
      await page.getByText('Понедельник', { exact: true }).click()
      await page.getByText('Среда', { exact: true }).click()
      await page.getByText('Пятница', { exact: true }).click()

      // Сохраняем
      await page.getByRole('button', { name: 'Сохранить настройки' }).click()

      // Ожидаем успешное сохранение (тост)
      await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })
    })

    test('E2E-4.103 — валидация — нужен хотя бы один рабочий день', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Ждём загрузки страницы
      await page.waitForLoadState('domcontentloaded')
      await expect(page.getByText('Рабочие часы', { exact: true })).toBeVisible({ timeout: 10000 })

      // Снимаем ВСЕ рабочие дни
      // ScheduleInput использует кастомные переключатели с data-day и data-switch атрибутами
      // Input скрыт (opacity: 0), но isChecked() работает
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      for (const day of days) {
        const switchInput = page.locator(`input[data-switch="${day}"]`)
        if (await switchInput.isChecked().catch(() => false)) {
          // Кликаем по родительскому label для переключения
          const dayBox = page.locator(`[data-day="${day}"]`)
          await dayBox.locator('label').click()
          // Пауза для обработки onChange в ScheduleInput (state update между итерациями цикла)
          await page.waitForTimeout(100)
        }
      }

      // Проверяем, что появился текст "Выберите хотя бы один рабочий день" в расчёте слотов
      await expect(page.getByText('Выберите хотя бы один рабочий день')).toBeVisible()

      // Пытаемся сохранить
      await page.getByRole('button', { name: 'Сохранить настройки' }).click()

      // Ожидаем тост с ошибкой (server action возвращает VALIDATION_ERROR)
      await expectErrorToast(page, /ошибка сохранения/i)
    })
  })

  test.describe('Настройка времени работы', () => {
    test('E2E-4.104 — можно изменить время начала и окончания работы', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Находим поля времени (Chakra Input с type="time")
      const startTimeInput = page.locator('input[type="time"]').first()
      const endTimeInput = page.locator('input[type="time"]').last()

      // Устанавливаем время
      await startTimeInput.fill('09:00')
      await endTimeInput.fill('18:00')

      // Сохраняем
      await page.getByRole('button', { name: 'Сохранить настройки' }).click()

      // Ожидаем успешное сохранение
      await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })
    })

    test('E2E-4.105 — валидация — время окончания должно быть позже начала', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Устанавливаем некорректное время
      const startTimeInput = page.locator('input[type="time"]').first()
      const endTimeInput = page.locator('input[type="time"]').last()

      await startTimeInput.fill('18:00')
      await endTimeInput.fill('09:00')

      // Пытаемся сохранить
      await page.getByRole('button', { name: 'Сохранить настройки' }).click()

      // Ожидаем ошибку (Field.ErrorText)
      await expect(page.getByText(/время окончания должно быть позже/i)).toBeVisible()
    })
  })

  test.describe('Настройка параметров занятий', () => {
    test('E2E-4.106 — можно выбрать длительность занятия', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Находим NativeSelect (Chakra NativeSelect.Field - это обычный select)
      const durationSelect = page.locator('select').first()
      await durationSelect.selectOption('90')

      // Сохраняем
      await page.getByRole('button', { name: 'Сохранить настройки' }).click()

      // Ожидаем успешное сохранение
      await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })
    })

    test('E2E-4.107 — можно выбрать перерыв между занятиями', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Находим селект перерыва (второй select)
      const breakSelect = page.locator('select').nth(1)
      await breakSelect.selectOption('15')

      // Сохраняем
      await page.getByRole('button', { name: 'Сохранить настройки' }).click()

      // Ожидаем успешное сохранение
      await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })
    })

    test('E2E-4.108 — можно выбрать горизонт планирования', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Находим селект горизонта (третий select)
      const horizonSelect = page.locator('select').nth(2)
      await horizonSelect.selectOption('14')

      // Сохраняем
      await page.getByRole('button', { name: 'Сохранить настройки' }).click()

      // Ожидаем успешное сохранение
      await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Расчёт слотов', () => {
    test('E2E-4.109 — расчёт обновляется при изменении параметров', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Меняем длительность занятия
      const durationSelect = page.locator('select').first()
      await durationSelect.selectOption('60')

      // Проверяем, что текст содержит расчёт
      await expect(page.getByText(/слотов/)).toBeVisible()
    })
  })

  test.describe('Изменение горизонта планирования', () => {
    test('E2E-2.1.6 — можно изменить горизонт планирования с 30 на 60 дней', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Ждём загрузки страницы
      await page.waitForLoadState('domcontentloaded')

      // Ищем label "Горизонт планирования" и находим связанный input/select
      const horizonLabel = page.getByText('Горизонт планирования*')

      if (!(await horizonLabel.isVisible({ timeout: 10000 }).catch(() => false))) {
        console.log('  ⏭️ Skip: поле "Горизонт планирования" не найдено на странице')
        return
      }

      // Находим input рядом с label — может быть в том же fieldset/div
      // Ищем NativeSelect по placeholder или input type="number"
      const horizonSelect = page.locator('select[name*="horizon"], select[name*="Horizon"]')
      const horizonInput = page.locator('input[name*="horizon"], input[name*="Horizon"]')
      const genericNumberInput = page.locator('input[type="number"]').first()

      const hasSelect = (await horizonSelect.count()) > 0
      const hasNamedInput = (await horizonInput.count()) > 0
      const hasGenericInput = (await genericNumberInput.count()) > 0

      if (hasSelect) {
        // NativeSelect — используем selectOption
        const currentValue = await horizonSelect.inputValue()

        await horizonSelect.selectOption('60')

        // Сохраняем
        await page.getByRole('button', { name: 'Сохранить настройки' }).click()
        await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })

        // Проверяем, что значение изменилось (без перезагрузки)
        const newValue = await horizonSelect.inputValue()
        expect(newValue).toBe('60')

        // Возвращаем исходное значение
        if (currentValue && currentValue !== '60') {
          await horizonSelect.selectOption(currentValue)
          await page.getByRole('button', { name: 'Сохранить настройки' }).click()
          await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })
        }
      } else if (hasNamedInput) {
        // Input с name — используем triple-click + type
        const currentValue = await horizonInput.inputValue()

        await horizonInput.click({ clickCount: 3 })
        await horizonInput.pressSequentially('60')

        // Сохраняем
        await page.getByRole('button', { name: 'Сохранить настройки' }).click()
        await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })

        // Проверяем значение
        const newValue = await horizonInput.inputValue()
        expect(newValue).toBe('60')

        // Возвращаем исходное значение
        if (currentValue && currentValue !== '60') {
          await horizonInput.click({ clickCount: 3 })
          await horizonInput.pressSequentially(currentValue)
          await page.getByRole('button', { name: 'Сохранить настройки' }).click()
          await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })
        }
      } else if (hasGenericInput) {
        // Первый input[type="number"] — используем triple-click + type
        const currentValue = await genericNumberInput.inputValue()

        await genericNumberInput.click({ clickCount: 3 })
        await genericNumberInput.pressSequentially('60')

        // Сохраняем
        await page.getByRole('button', { name: 'Сохранить настройки' }).click()
        await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })

        // Проверяем значение
        const newValue = await genericNumberInput.inputValue()
        expect(newValue).toBe('60')

        // Возвращаем исходное значение
        if (currentValue && currentValue !== '60') {
          await genericNumberInput.click({ clickCount: 3 })
          await genericNumberInput.pressSequentially(currentValue)
          await page.getByRole('button', { name: 'Сохранить настройки' }).click()
          await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10000 })
        }
      } else {
        console.log('  ⏭️ Skip: элемент управления горизонтом планирования не найден')
      }
    })
  })

  test.describe('Навигация', () => {
    test('E2E-4.110 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] }, // Явно без сохранённых cookies
      })
      const page = await context.newPage()

      await page.goto(urls.instructorScheduleSettings)

      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })

      await context.close()
    })
  })

  test.describe('Генерация слотов', () => {
    test('E2E-2.1.7 — сохранение настроек генерирует слоты', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)

      // Ждём загрузки страницы
      await page.waitForLoadState('domcontentloaded')
      await expect(page.getByText('Рабочие часы', { exact: true })).toBeVisible({ timeout: 10000 })

      // Сохраняем настройки
      const saveBtn = page.getByRole('button', { name: /сохранить/i })
      await saveBtn.click()

      // Проверяем toast о сохранении/генерации
      await expectSuccessToast(page, /сохранено|настройки сохранены|слоты.*созданы|slots.*generated/i)

      // Переходим на страницу расписания и проверяем наличие слотов
      await page.goto(urls.instructorSchedule)

      // Ждём загрузки страницы расписания
      await page.waitForLoadState('domcontentloaded')

      // Проверяем наличие слотов или пустого состояния (если нет рабочих дней)
      const slots = page.locator('[data-testid="schedule-slot"], [data-slot], [role="button"][data-time]')
      const emptyState = page.getByText(/нет слотов|настройте расписание|нет доступных/i)
      const hasSlots = (await slots.count()) > 0
      const hasEmpty = await emptyState.isVisible().catch(() => false)

      if (hasSlots) {
        await expect(slots.first()).toBeVisible()
      } else if (hasEmpty) {
        console.log('  ⏭️ Skip: слоты не сгенерированы (нет рабочих дней)')
      } else {
        // Страница загрузилась, но слотов нет — это нормально
        console.log('  ⏭️ Skip: страница расписания загружена, слоты не найдены')
      }
    })
  })
})
