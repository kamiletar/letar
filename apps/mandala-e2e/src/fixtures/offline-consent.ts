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
 *
 * ⚠️ Пишет через `page.evaluate()` на уже загруженной странице — если баннер к этому моменту
 * уже смонтирован, он согласие не увидит (см. `seedOfflineConsentBeforeNavigation` ниже) и
 * потребует `page.reload()`, который сам по себе создаёт гонку гидратации для клика сразу после
 * (найдено 2026-09-01, `05-full-checkout.guest.spec.ts`). Предпочитай
 * `seedOfflineConsentBeforeNavigation`, если ещё не переходили на страницу.
 */
export async function seedOfflineConsent(page: Page): Promise<void> {
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value)
    },
    [OFFLINE_CONSENT_STORAGE_KEY, OFFLINE_CONSENT_VALUE] as const,
  )
}

/**
 * Проставляет отказ от оффлайн-режима ДО первой навигации — через `page.addInitScript`,
 * которое выполняется перед любым скриптом страницы при каждой следующей загрузке документа в
 * этом page/context. Баннер с самого первого рендера получает `shouldShowBanner === false` —
 * не нужен ни `reload()`, ни расчёт тайминга гонки с `delayMs`.
 *
 * Вызывать ДО `page.goto(...)` (а не после) — иначе `addInitScript` зарегистрируется, но
 * текущий уже загруженный документ он не затронет.
 */
export async function seedOfflineConsentBeforeNavigation(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value)
    },
    [OFFLINE_CONSENT_STORAGE_KEY, OFFLINE_CONSENT_VALUE] as const,
  )
}
