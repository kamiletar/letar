/**
 * Согласие на оффлайн-режим для e2e-контекстов
 *
 * `OfflineConsentBanner` (`@letar/ui`, обёртка — `apps/mandala/src/app/_components/offline-consent-banner.tsx`)
 * смонтирован в корневом layout и появляется через `delayMs=2000` после гидратации как
 * `position: fixed` элемент у нижнего края экрана (тот же класс проблемы, что у `CookieBanner` —
 * см. `cookie-consent.ts` в этой же папке и `.claude/docs/sticky-actionbar-cookiebanner-zindex-race.md`).
 *
 * Гонка: если тест успевает кликнуть по контенту у нижнего края viewport (карточка товара в
 * последнем ряду `/shop`) быстрее этих 2 секунд — баннер ещё не смонтирован, клик проходит.
 * Если чуть медленнее (холодный кеш, накопленная задержка при serial-прогоне тестов) — баннер
 * успевает появиться и перехватывает pointer-events поверх статичного контента под собой.
 * Флаки недетерминирован по построению — часть прогонов проходит, часть падает с
 * `page.waitForURL: Test timeout of 30000ms exceeded` (клик не долетел до ссылки).
 *
 * Найдено 2026-09-01: `05-full-checkout.guest.spec.ts` — один и тот же клик по первой карточке
 * `/shop` есть в обоих тестах файла, упал только второй (накопленная задержка первого теста).
 *
 * Проставляем согласие заранее — так `OfflineConsentBanner` не рендерится вовсе
 * (`shouldShowBanner === false`), тем же приёмом, что и `seedCookieConsent`.
 */
import type { Page } from '@playwright/test'

/**
 * Ключ localStorage: см. `consentKey="mandala-offline-consent"` в
 * `apps/mandala/src/app/_components/offline-consent-banner.tsx`.
 *
 * Формат данных — `ConsentData` из `libs/hooks/src/lib/browser/use-offline-consent.ts`.
 */
export const OFFLINE_CONSENT_STORAGE_KEY = 'mandala-offline-consent'

/** `state: 'declined'` — баннер не показывается ближайшие 7 дней (см. `DECLINE_REMIND_DAYS`) */
export const OFFLINE_CONSENT_VALUE = JSON.stringify({
  state: 'declined',
  declinedAt: Date.now(),
})

/**
 * Записывает отказ от оффлайн-режима в localStorage текущего origin страницы.
 *
 * Вызывать после первой навигации на baseURL — до неё origin ещё `about:blank`
 * и localStorage недоступен.
 */
export async function seedOfflineConsent(page: Page): Promise<void> {
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value)
    },
    [OFFLINE_CONSENT_STORAGE_KEY, OFFLINE_CONSENT_VALUE] as const,
  )
}
