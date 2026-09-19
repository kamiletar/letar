import { expect, type Page } from '@playwright/test'

/**
 * `page.goto` для страниц под авторизованной сессией (admin/fan storageState), который
 * возвращается только после того, как шапка применила сессию, — событие `load` ≠ готовность.
 *
 * ⚠️ Зачем. Header берёт сессию из `authClient.useSession()`: сервер отдаёт HTML с кнопкой
 * «Войти», а клиентский стор запрашивает `/api/auth/get-session` уже во время гидратации.
 * Клик или `fill`, попавшие в это окно (~0.5–1.5 с после `load`), ловят React error #418
 * (hydration mismatch): React пересобирает дерево на клиенте и теряет начатый `router.push()`
 * или введённое значение — тест видит «страница не сменилась» / «поле пустое». В трейсах упавших
 * прогонов клик приходился на 100–250 мс ДО `pageError #418`; в одиночном прогоне окно узкое,
 * а рядом с другими тестами (общий CPU) клик стабильно в него попадает.
 *
 * Сигнал готовности — ответ `get-session` получен и шапка отрисовала сессию: кнопки «Войти»
 * больше нет. Если `get-session` вернул не 2xx (например 429 от rate-limit), UI-проверка
 * пропускается: ответ всё равно пришёл, гонка за гидратацию закрыта, а «Войти» останется навсегда.
 *
 * На анонимных страницах не использовать: там нет сессии и ждать нечего.
 *
 * Сам дефект приложения (клик в окне гидратации теряется) этим не лечится — это дисциплина теста.
 */
export async function gotoHydrated(page: Page, url: string): Promise<void> {
  // waitForResponse регистрируем ДО goto: ответ приходит раньше, чем goto вернёт управление
  const sessionResponse = page.waitForResponse((r) => r.url().includes('/api/auth/get-session'), { timeout: 30_000 })
  await page.goto(url)
  const response = await sessionResponse
  if (response.ok()) {
    await expect(page.getByRole('banner').getByRole('button', { name: 'Войти' })).toHaveCount(0)
  }
}
