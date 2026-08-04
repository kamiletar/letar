/**
 * Cookie-согласие для e2e-контекстов
 *
 * `CookieBanner` из `@letar/ui` смонтирован в корневом layout mandala и рендерится
 * `position: fixed; bottom: 0; zIndex: 1000`. Submit-кнопка длинной формы после скролла
 * оказывается ровно под ним, и Playwright ретраит клик до таймаута с ошибкой
 * «<div class="chakra-stack …"> subtree intercepts pointer events» — падает окружение,
 * а не бизнес-логика.
 *
 * Проставляем согласие заранее: `CookieBanner` читает localStorage в `useEffect` и при
 * совпадении версии политики не рендерится вовсе (`shown === false`), так что баннер не
 * появляется ни в одном тесте — надёжнее, чем закрывать его в `beforeEach`.
 */
import type { Page } from '@playwright/test'

/**
 * Ключ localStorage: `${appKey}.consent.${policyVersion}`
 *
 * Формат задаёт `createConsentConfig()` в `libs/ui/src/lib/consent-types.ts`.
 * `appKey` — из `<CookieBanner appKey="mandala" />` в `apps/mandala/src/app/layout.tsx`,
 * версия — дефолтная `v1` (проп `policyVersion` не передаётся).
 *
 * Импортировать `createConsentConfig` из `@letar/ui` нельзя: barrel-файл тянет
 * React/Chakra-компоненты, которые в Node-раннере Playwright не грузятся.
 */
export const COOKIE_CONSENT_STORAGE_KEY = 'mandala.consent.v1'

/** Состояние согласия — форма `CookieConsentState` из `libs/ui/src/lib/consent-types.ts` */
export const COOKIE_CONSENT_VALUE = JSON.stringify({
  necessary: true,
  analytics: false,
  marketing: false,
  version: 'v1',
  acceptedAt: '2026-01-01T00:00:00.000Z',
})

/**
 * Записывает согласие в localStorage текущего origin страницы.
 *
 * Вызывать после первой навигации на baseURL — до неё origin ещё `about:blank`
 * и localStorage недоступен.
 */
export async function seedCookieConsent(page: Page): Promise<void> {
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value)
    },
    [COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_VALUE] as const,
  )
}
