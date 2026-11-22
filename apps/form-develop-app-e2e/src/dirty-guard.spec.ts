import { expect, type Page, test } from '@playwright/test'

const submitCountKey = 'fm026-submit-count'

async function openDirtyForm(page: Page) {
  await page.goto('/dirty-guard-demo')
  const link = page.getByTestId('guard-link')
  const form = page.locator('form').filter({ has: link })
  const title = form.getByRole('textbox')
  await title.click()
  await title.fill('Несохранённый черновик')
  await expect(title).toHaveValue('Несохранённый черновик')

  // Счётчик переживает SPA-переход и полную загрузку: случайный submit не потеряется.
  await form.evaluate((element, key) => {
    sessionStorage.setItem(key, '0')
    element.addEventListener('submit', () => {
      sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key)) + 1))
    }, { capture: true })
  }, submitCountKey)
  expect(await form.evaluate((element) => (element as unknown as { checkValidity: () => boolean }).checkValidity()))
    .toBe(true)
  return { link, title }
}

async function expectNoSubmit(page: Page) {
  expect(await page.evaluate((key) => sessionStorage.getItem(key), submitCountKey)).toBe('0')
}

test.describe('DirtyGuard: доступный диалог без случайного сохранения', () => {
  test('удерживает фокус, Escape и «Остаться» возвращают к ссылке без submit', async ({ page }) => {
    const { link, title } = await openDirtyForm(page)
    await link.focus()
    await link.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Уйти со страницы?' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog).toHaveAccessibleDescription(/unsaved|несохранён/i)
    const stay = dialog.getByRole('button', { name: 'Остаться', exact: true })
    const leave = dialog.getByRole('button', { name: 'Уйти', exact: true })
    await expect(stay).toBeFocused()

    await page.keyboard.press('Shift+Tab')
    await expect(leave).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(stay).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(leave).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(stay).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(link).toBeFocused()
    await expect(title).toHaveValue('Несохранённый черновик')
    await expectNoSubmit(page)

    await link.click()
    await expect(dialog).toBeVisible()
    await stay.click()
    await expect(dialog).toBeHidden()
    await expect(link).toBeFocused()
    await expect(title).toHaveValue('Несохранённый черновик')
    await expectNoSubmit(page)
  })

  test('«Уйти» продолжает переход Next Link и не отправляет валидную форму', async ({ page }) => {
    const { link } = await openDirtyForm(page)
    await link.click()
    const dialog = page.getByRole('dialog', { name: 'Уйти со страницы?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Уйти', exact: true }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 20000 })
    await expectNoSubmit(page)
  })

  test('обновление страницы по-прежнему вызывает native beforeunload', async ({ page }) => {
    const { title } = await openDirtyForm(page)
    const nativeDialogPromise = page.waitForEvent('dialog')
    await page.evaluate(() => {
      setTimeout(() => (globalThis as unknown as { location: { reload: () => void } }).location.reload(), 0)
    })
    const nativeDialog = await nativeDialogPromise
    expect(nativeDialog.type()).toBe('beforeunload')
    await nativeDialog.dismiss()
    await expect(page).toHaveURL(/\/dirty-guard-demo$/)
    await expect(title).toHaveValue('Несохранённый черновик')
    await expectNoSubmit(page)
  })
})
