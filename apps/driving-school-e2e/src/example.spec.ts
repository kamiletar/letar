import { expect, test } from './fixtures/base-test'

test.describe('Главная страница', () => {
  test('отображается корректно', async ({ page }) => {
    await page.goto('/')

    // Проверяем, что страница загрузилась (логотип или брендированный заголовок)
    await expect(page.getByText('НаПрава', { exact: true })).toBeVisible()
  })

  test('содержит ссылку на вход', async ({ page }) => {
    await page.goto('/')

    // Ищем кнопку входа (Button asChild с Link внутри рендерится как <a>)
    const signInLink = page.getByRole('link', { name: 'Войти' })
    await expect(signInLink).toBeVisible()
  })

  test('содержит ссылку на регистрацию', async ({ page }) => {
    await page.goto('/')

    // Ищем кнопку регистрации (desktop версия видна, mobile скрыта)
    const signUpLink = page.getByRole('link', { name: 'Регистрация' }).first()
    await expect(signUpLink).toBeVisible()
  })
})
