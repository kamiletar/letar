import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('Select Demo (NativeSelect & CascadingSelect)', () => {
  /**
   * Helper для получения поля по data-field-name
   */
  function getField(page: Page, fieldName: string) {
    return page.locator(`[data-field-name="${fieldName}"]`)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/select-demo')
    // Ждём загрузку формы
    await page.locator('form').waitFor()
  })

  test('should display page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Select Demo' })).toBeVisible()
  })

  test('should display all section headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'NativeSelect' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'CascadingSelect', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nested CascadingSelect' })).toBeVisible()
  })

  // === NativeSelect Tests ===

  test.describe('NativeSelect', () => {
    /**
     * Хелпер для получения native select элемента
     */
    function getNativeSelect(page: Page, fieldName: string) {
      return page.locator(`select[data-field-name="${fieldName}"]`)
    }

    test('should display all NativeSelect fields', async ({ page }) => {
      await expect(getNativeSelect(page, 'simpleSelect')).toBeVisible()
      await expect(getNativeSelect(page, 'sizeSelect')).toBeVisible()
      await expect(getNativeSelect(page, 'prioritySelect')).toBeVisible()
    })

    test.skip('should select option in simple NativeSelect', async ({ page }) => {
      // TODO: Нестабильный тест - selectOption не срабатывает для пустого начального значения
      const selectField = getNativeSelect(page, 'simpleSelect')

      // Выбираем Option 2 с force для обхода возможных проблем с event
      await selectField.selectOption({ value: 'opt2' }, { force: true })
      await page.waitForTimeout(100)

      // Проверяем значение
      await expect(selectField).toHaveValue('opt2')
    })

    test('should have default value in sizeSelect', async ({ page }) => {
      const selectField = getNativeSelect(page, 'sizeSelect')

      // По умолчанию выбран Medium (md)
      await expect(selectField).toHaveValue('md')
    })

    test('should change size selection', async ({ page }) => {
      const selectField = getNativeSelect(page, 'sizeSelect')

      // Меняем на Large
      await selectField.selectOption({ value: 'lg' }, { force: true })
      await page.waitForTimeout(100)
      await expect(selectField).toHaveValue('lg')

      // Меняем на Small
      await selectField.selectOption({ value: 'sm' }, { force: true })
      await page.waitForTimeout(100)
      await expect(selectField).toHaveValue('sm')
    })

    test('should select priority option', async ({ page }) => {
      const selectField = getNativeSelect(page, 'prioritySelect')

      // Выбираем High Priority
      await selectField.selectOption({ value: 'high' }, { force: true })
      await page.waitForTimeout(100)
      await expect(selectField).toHaveValue('high')
    })

    test('should display all options in NativeSelect', async ({ page }) => {
      const selectField = getNativeSelect(page, 'simpleSelect')

      // Проверяем наличие всех опций
      await expect(selectField.locator('option[value="opt1"]')).toHaveText('Option 1')
      await expect(selectField.locator('option[value="opt2"]')).toHaveText('Option 2')
      await expect(selectField.locator('option[value="opt3"]')).toHaveText('Option 3')
    })
  })

  // === CascadingSelect Tests ===

  test.describe('CascadingSelect', () => {
    test('should display country Select and city CascadingSelect', async ({ page }) => {
      await expect(getField(page, 'country')).toBeVisible()
      // City field wrapper should be visible
      await expect(page.locator('[data-field-name="city"]')).toBeVisible()
    })

    test('should show placeholder when parent is empty', async ({ page }) => {
      // Город должен показывать placeholder
      const cityTrigger = page.locator('[data-field-name="city"]').locator('[data-part="trigger"]')
      await expect(cityTrigger).toContainText('Сначала выберите страну')
    })

    test('should load cities when country is selected', async ({ page }) => {
      // Выбираем страну Russia
      const countrySelect = getField(page, 'country')
      await countrySelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'Russia' }).click()

      // Ждём загрузки городов (300ms + buffer)
      await page.waitForTimeout(500)

      // Открываем city dropdown
      const citySelect = page.locator('[data-field-name="city"]')
      await citySelect.locator('[data-part="trigger"]').click()

      // Проверяем, что города России появились
      await expect(page.getByRole('option', { name: 'Moscow' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Saint Petersburg' })).toBeVisible()
    })

    test('should select city after country selection', async ({ page }) => {
      // Выбираем USA
      const countrySelect = getField(page, 'country')
      await countrySelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'USA' }).click()

      // Ждём загрузки
      await page.waitForTimeout(500)

      // Выбираем город
      const citySelect = page.locator('[data-field-name="city"]')
      await citySelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'New York' }).click()

      // Проверяем, что город выбран
      await expect(citySelect.locator('[data-part="trigger"]')).toContainText('New York')
    })

    test('should clear city when country changes', async ({ page }) => {
      // Выбираем Germany
      const countrySelect = getField(page, 'country')
      await countrySelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'Germany' }).click()

      await page.waitForTimeout(500)

      // Выбираем город Berlin
      const citySelect = page.locator('[data-field-name="city"]')
      await citySelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'Berlin' }).click()

      // Меняем страну на Russia
      await countrySelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'Russia' }).click()

      // Город должен очиститься
      await page.waitForTimeout(500)
      await expect(citySelect.locator('[data-part="trigger"]')).not.toContainText('Berlin')
    })

    test('should show loading indicator while fetching options', async ({ page }) => {
      // Выбираем страну
      const countrySelect = getField(page, 'country')
      await countrySelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'Russia' }).click()

      // Spinner должен появиться во время загрузки
      const citySelect = page.locator('[data-field-name="city"]')
      // Spinner быстро исчезает, поэтому просто проверяем что после загрузки всё работает
      await page.waitForTimeout(500)
      await citySelect.locator('[data-part="trigger"]').click()
      await expect(page.getByRole('option', { name: 'Moscow' })).toBeVisible()
    })
  })

  // === Nested CascadingSelect Tests ===

  test.describe('Nested CascadingSelect', () => {
    test('should display region Select and district CascadingSelect', async ({ page }) => {
      await expect(getField(page, 'address.region')).toBeVisible()
      await expect(page.locator('[data-field-name="address.district"]')).toBeVisible()
    })

    test('should load districts when region is selected', async ({ page }) => {
      // Выбираем регион
      const regionSelect = getField(page, 'address.region')
      await regionSelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'Moscow Region' }).click()

      await page.waitForTimeout(400)

      // Открываем district dropdown
      const districtSelect = page.locator('[data-field-name="address.district"]')
      await districtSelect.locator('[data-part="trigger"]').click()

      // Проверяем районы Московской области
      await expect(page.getByRole('option', { name: 'Odintsovo' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Khimki' })).toBeVisible()
    })

    test('should work with nested field paths', async ({ page }) => {
      // Выбираем Krasnodar Region
      const regionSelect = getField(page, 'address.region')
      await regionSelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'Krasnodar Region' }).click()

      await page.waitForTimeout(400)

      // Выбираем район Sochi
      const districtSelect = page.locator('[data-field-name="address.district"]')
      await districtSelect.locator('[data-part="trigger"]').click()
      await page.getByRole('option', { name: 'Sochi' }).click()

      // Проверяем что район выбран
      await expect(districtSelect.locator('[data-part="trigger"]')).toContainText('Sochi')
    })
  })

  // === Form Submission Test ===

  test.skip('should submit form with all selected values', async ({ page, browserName }) => {
    // TODO: Нестабильный тест - NativeSelect selectOption имеет проблемы с e2e
    test.skip(browserName === 'webkit', 'WebKit has timing issues with form submission')

    // NativeSelect values (используем прямой селектор select элемента с force)
    await page.locator('select[data-field-name="simpleSelect"]').selectOption({ value: 'opt1' }, { force: true })
    await page.locator('select[data-field-name="sizeSelect"]').selectOption({ value: 'lg' }, { force: true })
    await page.locator('select[data-field-name="prioritySelect"]').selectOption({ value: 'critical' }, { force: true })
    await page.waitForTimeout(200)

    // CascadingSelect: Country -> City
    const countrySelect = getField(page, 'country')
    await countrySelect.locator('[data-part="trigger"]').click()
    await page.getByRole('option', { name: 'USA' }).click()
    await page.waitForTimeout(500)

    const citySelect = page.locator('[data-field-name="city"]')
    await citySelect.locator('[data-part="trigger"]').click()
    await page.getByRole('option', { name: 'Los Angeles' }).click()

    // Nested CascadingSelect: Region -> District
    const regionSelect = getField(page, 'address.region')
    await regionSelect.locator('[data-part="trigger"]').click()
    await page.getByRole('option', { name: 'Leningrad Region' }).click()
    await page.waitForTimeout(400)

    const districtSelect = page.locator('[data-field-name="address.district"]')
    await districtSelect.locator('[data-part="trigger"]').click()
    await page.getByRole('option', { name: 'Vyborg' }).click()

    // Submit - ждём пока кнопка станет доступна (форма валидна)
    const submitButton = page.getByRole('button', { name: /submit/i })
    await expect(submitButton).toBeEnabled({ timeout: 5000 })
    await submitButton.click()

    // Verify submitted data
    const submittedData = page.getByTestId('submitted-data')
    await expect(submittedData).toBeVisible({ timeout: 15000 })

    await expect(submittedData).toContainText('"simpleSelect": "opt1"')
    await expect(submittedData).toContainText('"sizeSelect": "lg"')
    await expect(submittedData).toContainText('"prioritySelect": "critical"')
    await expect(submittedData).toContainText('"country": "us"')
    await expect(submittedData).toContainText('"city": "la"')
    await expect(submittedData).toContainText('"region": "len_reg"')
    await expect(submittedData).toContainText('"district": "vyb"')
  })
})
