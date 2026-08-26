import * as Sentry from '@sentry/browser'
import { scrubPii } from '../lib/scrub-event'

export interface InitClientOptions {
  /** DSN проекта GlitchTip, например из NEXT_PUBLIC_GLITCHTIP_DSN. Не секрет — предназначен для клиентского бандла. */
  dsn: string | undefined
  environment: string
}

/**
 * Минимальный набор интеграций для отслеживания ошибок — без breadcrumbs/browserApiErrors/
 * httpContext/cultureContext/browserSession. Замер на domwellbes (`PLAN_PUBLIC_MOBILE.md` §12.52)
 * показал, что `requestIdleCallback` сам по себе не снижает TBT: длинная задача — это реальное
 * синхронное выполнение `Sentry.init()` (~3с throttled scripting), а не просто неудачный момент
 * запуска, и её нельзя устранить одним лишь переносом времени вызова. Полный
 * `getDefaultIntegrations()` навешивает monkey-patch на `console`/DOM-события/`history`/
 * `fetch`/`XMLHttpRequest` (`breadcrumbsIntegration`) и на `setTimeout`/`setInterval`/
 * `requestAnimationFrame`/`addEventListener` (`browserApiErrorsIntegration`) — это и есть
 * основной источник синхронной стоимости, а не сам факт инициализации SDK. Убранные интеграции
 * дают контекст (хлебные крошки, локаль, сессии), не сам факт поимки ошибки — `globalHandlers`/
 * `linkedErrors` продолжают ловить необработанные исключения и цепочки `error.cause`.
 */
const MINIMAL_INTEGRATIONS = [
  Sentry.inboundFiltersIntegration(),
  Sentry.functionToStringIntegration(),
  Sentry.dedupeIntegration(),
  Sentry.globalHandlersIntegration(),
  Sentry.linkedErrorsIntegration(),
]

/**
 * Вызывать из instrumentation-client.ts на верхнем уровне (см. доку Next.js по этому файлу) —
 * сам вызов `initClient()` синхронный, а тяжёлую инициализацию `Sentry.init()` откладываем до
 * простоя главного потока. `requestIdleCallback` откладывает инициализацию до момента, когда
 * браузер освободился — окно «до появления мониторинга ошибок» на практике доли секунды, а
 * `window.onerror`/`unhandledrejection`, которые ставит `Sentry.init()`, всё равно активны уже
 * после отложенного вызова, не раньше. `setTimeout` — фолбэк для Safari/старых браузеров без
 * `requestIdleCallback`.
 */
export function initClient({ dsn, environment }: InitClientOptions): void {
  if (!dsn) { return }

  const run = () => {
    Sentry.init({
      dsn,
      environment,
      integrations: MINIMAL_INTEGRATIONS,
      beforeSend: (event) => scrubPii(event),
    })
  }

  // `globalThis`-каст вместо прямой ссылки на `requestIdleCallback` — библиотека собирается с
  // `"types": ["node"]` (tsconfig.lib.json), DOM-типы не подключены, а добавлять их ради одного
  // браузерного API в общий tsconfig лишнее.
  const requestIdleCallback = (globalThis as {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void
  }).requestIdleCallback

  if (requestIdleCallback) {
    requestIdleCallback(run, { timeout: 2000 })
  } else {
    setTimeout(run, 0)
  }
}

/**
 * Для React error boundaries (Next.js `error.tsx`) — они перехватывают ошибку до того, как та
 * дойдёт до `window.onerror`, поэтому глобальные обработчики `@sentry/browser` её не видят без
 * явного вызова. Тот же принцип, что у серверного `captureException` — вызывать из тела
 * компонента-границы после `initClient()`.
 */
export function captureException(err: unknown): void {
  Sentry.captureException(err)
}

export { scrubPii }
