import { expect, type Page, test } from '@playwright/test'

/**
 * E2E: кабинет психолога целиком (Фаза 4, пул 2026-09-24, волна 6).
 *
 * Сценарий на двух пользователях в двух контекстах браузера:
 * 1. психолог входит и нажимает «Я специалист» — кабинет пуст;
 * 2. клиент в настройках привязывает психолога по email;
 * 3. психолог видит клиента в списке, открывает карточку и добавляет заметку.
 *
 * Сессии — через `/api/auth/dev-session` (как в `safety-net.spec.ts`): нужен
 * `DEV_SESSION_TOKEN` в окружении раннера и `ALLOW_DEV_SESSION=true` у приложения.
 *
 * Email уникальный на каждый прогон: staging-БД персистентна, а связь клиент↔психолог
 * и роль PSYCHOLOGIST — состояние, которое с фиксированной identity копилось бы между
 * прогонами (см. `.claude/docs/persistent-e2e-user-resource-exhaustion.md`).
 */

const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const PSY_EMAIL = `e2e-cabinet-psy-${RUN}@archetest.test`
const CLIENT_EMAIL = `e2e-cabinet-client-${RUN}@archetest.test`

async function signIn(page: Page, email: string): Promise<void> {
  const token = process.env['DEV_SESSION_TOKEN']
  if (!token) {
    throw new Error('DEV_SESSION_TOKEN не задан в окружении e2e-раннера — dev-session вернёт 403')
  }
  await page.goto(`/api/auth/dev-session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
}

test.describe('кабинет психолога', () => {
  test('привязка клиента, карточка клиента, заметка', async ({ browser }) => {
    test.setTimeout(180_000)
    const psy = await (await browser.newContext()).newPage()
    const client = await (await browser.newContext()).newPage()

    // 1. Психолог назначает себя специалистом
    await signIn(psy, PSY_EMAIL)
    await psy.goto('/ru/cabinet')
    await psy.getByRole('button', { name: 'Я специалист' }).click()
    await expect(psy.getByText('Пока нет привязанных клиентов')).toBeVisible({ timeout: 30_000 })

    // 2. Клиент привязывает психолога по email
    await signIn(client, CLIENT_EMAIL)
    await client.goto('/ru/settings')
    await client.getByPlaceholder('Email психолога').fill(PSY_EMAIL)
    await client.getByRole('button', { name: 'Привязать' }).click()
    await expect(client.getByText(PSY_EMAIL).first()).toBeVisible({ timeout: 30_000 })

    // 3. Психолог видит клиента и добавляет заметку
    await psy.reload()
    // Ссылка на карточку — на имени клиента; строку находим по email (он в соседней ячейке)
    const clientRow = psy.getByRole('row').filter({ hasText: CLIENT_EMAIL })
    await expect(clientRow).toBeVisible({ timeout: 30_000 })
    await expect(clientRow.getByText('Активен')).toBeVisible()
    await clientRow.getByRole('link').click()
    await expect(psy).toHaveURL(/\/cabinet\/[^/]+$/, { timeout: 30_000 })

    const note = `Первая встреча ${RUN}`
    await psy.getByPlaceholder('Текст заметки...').fill(note)
    await psy.getByRole('button', { name: 'Добавить заметку' }).click()
    await expect(psy.getByText(note)).toBeVisible({ timeout: 30_000 })

    // Заметка переживает перезагрузку — она в БД, а не только в состоянии компонента
    await psy.reload()
    await expect(psy.getByText(note)).toBeVisible({ timeout: 30_000 })

    // 4. Клиент отзывает доступ — кабинет психолога показывает связь как отозванную, без ссылки.
    //    Регрессия: политика User скрывает от психолога неактивных клиентов, и include клиента
    //    приходил null — список падал целиком
    await client.getByRole('button', { name: 'Отозвать доступ' }).click()
    await client.getByRole('dialog').getByRole('button', { name: 'Отозвать', exact: true }).click()
    await expect(client.getByRole('button', { name: 'Отозвать доступ' })).toHaveCount(0, { timeout: 30_000 })

    await psy.goto('/ru/cabinet')
    const revokedRow = psy.getByRole('row').filter({ hasText: CLIENT_EMAIL })
    await expect(revokedRow.getByText('Отозван')).toBeVisible({ timeout: 30_000 })
    await expect(revokedRow.getByRole('link')).toHaveCount(0)
  })
})
