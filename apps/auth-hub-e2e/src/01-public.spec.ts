import { expect, test } from './fixtures/base-test'

test.describe('Единый вход', () => {
  test.use({ storageState: undefined })

  test('первый экран предлагает способы входа без форм и отдельной регистрации', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: 'Вход в Letar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Продолжить с ВКонтакте' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Продолжить с Яндекс' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Продолжить с почтой' })).toBeVisible()
    await expect(page.locator('input')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Зарегистрироваться' })).toHaveCount(0)
    await page.screenshot({ path: '.claude/artifacts/auth-hub-methods-desktop.png', fullPage: true })
  })

  test('почта сохраняется при переключении способа и возврате назад', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('button', { name: 'Продолжить с почтой' }).click()
    await expect(page.getByRole('heading', { name: 'Вход по почте' })).toBeFocused()
    await expect(page.getByRole('tab', { name: 'По ссылке' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('input[data-field-name="password"]')).toHaveCount(0)
    await page.getByRole('textbox', { name: 'Почта' }).fill('person@example.com')
    await page.getByRole('tab', { name: 'С паролем' }).click()
    await expect(page.getByRole('textbox', { name: 'Почта' })).toHaveValue('person@example.com')
    await expect(page.locator('input[data-field-name="password"]')).toHaveAttribute('autocomplete', 'current-password')
    await page.getByRole('button', { name: 'Все способы входа' }).click()
    await expect(page.getByRole('button', { name: 'Продолжить с почтой' })).toBeFocused()
    await page.getByRole('button', { name: 'Продолжить с почтой' }).click()
    await expect(page.getByRole('textbox', { name: 'Почта' })).toHaveValue('person@example.com')
    await page.getByRole('tab', { name: 'По ссылке' }).click()
    await expect(page.getByRole('textbox', { name: 'Почта' })).toHaveValue('person@example.com')
    await expect(page.getByRole('textbox')).toHaveCount(1)
    await page.screenshot({ path: '.claude/artifacts/auth-hub-email-desktop.png', fullPage: true })
  })

  test('вкладки доступны с клавиатуры', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('button', { name: 'Продолжить с почтой' }).click()
    await page.getByRole('tab', { name: 'По ссылке' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'С паролем' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('input[data-field-name="password"]')).toBeVisible()
  })

  test('старый адрес регистрации сохраняет параметры продолжения', async ({ page }) => {
    const query = new URLSearchParams({
      callbackUrl: '/profile',
      state: 'original-state',
      code_challenge: 'original-pkce',
    })
    await page.goto(`/sign-up?${query}`)
    await expect(page).toHaveURL(`/sign-in?${query}`)
    await expect(page.getByRole('heading', { name: 'Вход в Letar' })).toBeVisible()
  })

  test('ошибка использованной ссылки видна, а её технический текст не выводится', async ({ page }) => {
    await page.goto('/sign-in?error=INVALID_TOKEN')
    const error = page.getByRole('main').getByRole('alert')
    await expect(error).toContainText('Ссылка могла устареть')
    await expect(error).not.toContainText('INVALID_TOKEN')
  })

  test('переход к восстановлению пароля сохраняет контекст', async ({ page }) => {
    await page.goto('/sign-in?callbackUrl=%2Fprofile')
    await page.getByRole('button', { name: 'Продолжить с почтой' }).click()
    await page.getByRole('tab', { name: 'С паролем' }).click()
    await expect(page.getByRole('link', { name: 'Забыли пароль?' })).toHaveAttribute(
      'href',
      '/forgot-password?callbackUrl=%2Fprofile',
    )
  })

  test('дополнительные способы скрыты до запроса и раскрываются по кнопке', async ({ page }) => {
    await page.goto('/sign-in')
    const passkey = page.getByRole('button', { name: /Face ID.*Ключ доступа/ })
    await expect(passkey).not.toBeVisible()
    for (const provider of ['Google', 'GitHub', 'Facebook']) {
      await expect(page.getByRole('button', { name: `Продолжить с ${provider}` })).not.toBeVisible()
    }
    await page.getByRole('button', { name: 'Другие способы' }).click()
    await expect(passkey).toBeVisible()
    await expect(page.getByRole('button', { name: 'Продолжить с ВКонтакте' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Продолжить с Яндекс' })).toBeVisible()
    await page.getByRole('button', { name: 'Другие способы' }).click()
    await expect(passkey).not.toBeVisible()
  })

  test('на узком экране формы доступны без горизонтальной прокрутки', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await page.goto('/sign-in')
    await expect(page.getByRole('button', { name: 'Продолжить с почтой' })).toBeInViewport()
    await page.screenshot({ path: '.claude/artifacts/auth-hub-methods-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Продолжить с почтой' }).click()
    await page.getByRole('tab', { name: 'С паролем' }).click()
    await expect(page.locator('input[data-field-name="password"]')).toBeVisible()
    const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(fitsViewport).toBe(true)
    await page.screenshot({ path: '.claude/artifacts/auth-hub-password-mobile.png', fullPage: true })
  })
})
