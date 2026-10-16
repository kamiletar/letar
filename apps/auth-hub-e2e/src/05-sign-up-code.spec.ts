import { expect, test } from './fixtures/base-test'

// Отдельная регистрация заменена входом по ссылке; проверяем совместимость старых OIDC-ссылок.
// Верификация существующих аккаунтов и сброс пароля остаются в отдельных компонентах и спеках.
test('регистрация передаёт полный OIDC-запрос в единый вход', async ({ page }) => {
  const query = new URLSearchParams({
    client_id: 'kami-prod',
    response_type: 'code',
    redirect_uri: 'https://kami.letar.best/api/auth/callback/letar-auth',
    scope: 'openid profile email',
    state: 'signup-state',
    code_challenge: 'signup-pkce',
    code_challenge_method: 'S256',
  })
  await page.goto(`/sign-up?${query}`)
  await expect(page).toHaveURL(`/sign-in?${query}`)
  await page.getByRole('button', { name: 'Продолжить с почтой' }).click()
  await expect(page.getByRole('button', { name: 'Получить ссылку' })).toBeVisible()
})
