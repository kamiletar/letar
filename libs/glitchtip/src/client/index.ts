import * as Sentry from '@sentry/browser'
import { scrubPii } from '../lib/scrub-event'

export interface InitClientOptions {
  /** DSN проекта GlitchTip, например из NEXT_PUBLIC_GLITCHTIP_DSN. Не секрет — предназначен для клиентского бандла. */
  dsn: string | undefined
  environment: string
}

/** Вызывать из instrumentation-client.ts на верхнем уровне (см. доку Next.js по этому файлу). */
export function initClient({ dsn, environment }: InitClientOptions): void {
  if (!dsn) { return }

  Sentry.init({
    dsn,
    environment,
    beforeSend: (event) => scrubPii(event),
  })
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
