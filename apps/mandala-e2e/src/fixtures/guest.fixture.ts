/**
 * Базовая фикстура для гостевых (не-admin) e2e-тестов mandala.
 *
 * Автоматически гасит bottom-anchored баннеры (cookie-согласие + offline-согласие) ДО первой
 * навигации через `page.addInitScript` — без этого клик по контенту у нижнего края viewport
 * (карточка товара в `/shop`) периодически попадает на баннер вместо цели: `CookieBanner`
 * появляется сразу, `OfflineConsentBanner` — через `delayMs=2000` после гидратации. Найдено
 * 2026-09-01 в `05-full-checkout.guest.spec.ts`, `03-cart.guest.spec.ts`,
 * `04-checkout.guest.spec.ts`, `01-public-pages.guest.spec.ts` — все используют один и тот же
 * `page.locator('a[href^="/shop/"]').first()` без предварительного гашения баннеров.
 *
 * Подробности механизма (почему `page.evaluate()` после навигации не работает без `reload()`,
 * и почему `reload()` создаёт отдельную гонку гидратации) — `offline-consent.ts`/`cookie-consent.ts`.
 */
import { test as base } from '@playwright/test'
import { seedCookieConsentBeforeNavigation } from './cookie-consent'
import { seedOfflineConsentBeforeNavigation } from './offline-consent'

export const test = base.extend({
  page: async ({ page }, use) => {
    await seedCookieConsentBeforeNavigation(page)
    await seedOfflineConsentBeforeNavigation(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
