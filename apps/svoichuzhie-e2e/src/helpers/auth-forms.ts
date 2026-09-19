import type { Locator, Page } from '@playwright/test'

/**
 * Локаторы auth-форм svoichuzhie.
 *
 * Формы перенесены на @letar/forms: поля больше не имеют ручных id (`login-email`,
 * `join-email` и т.п.) — Form.Field.String отдаёт автоматический React-useId (`_R_…`) и пустой
 * `name`. Устойчивы только атрибут `autocomplete` (он задан в самой форме и семантически
 * привязан к роли поля) и видимая подпись. Поэтому форму находим по `autocomplete`:
 * - вход:           `current-password` (единственная форма с таким полем на /login);
 * - вступление:     `new-password` (форма «Стать своим» на /fanclub).
 * Рассылка в футере тоже содержит `input[type=email]` — привязка к форме с паролем
 * от неё отделяет.
 */

/** Форма входа на /login */
export function loginForm(page: Page): Locator {
  return page.locator('form:has(input[autocomplete="current-password"])')
}

/** Форма вступления в фан-клуб на /fanclub */
export function joinForm(page: Page): Locator {
  return page.locator('form:has(input[autocomplete="new-password"])')
}

/** Поле email внутри формы (honeypot «Website» — type=text, футерная рассылка — другая форма) */
export function emailField(form: Locator): Locator {
  return form.locator('input[type="email"]')
}

/** Поле пароля внутри формы */
export function passwordField(form: Locator): Locator {
  return form.locator('input[type="password"]')
}
