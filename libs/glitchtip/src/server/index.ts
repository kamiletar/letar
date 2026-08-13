import * as Sentry from '@sentry/node'
import type { Instrumentation } from 'next'
import { isIgnorableRequestError } from '../lib/ignore-noise'
import { scrubPii } from '../lib/scrub-event'

export interface InitServerOptions {
  /** DSN проекта GlitchTip, например из GLITCHTIP_DSN. Пусто/undefined — SDK не инициализируется. */
  dsn: string | undefined
  /** 'production' | 'staging' — тег окружения в GlitchTip, не NODE_ENV (см. env-files.md). */
  environment: string
}

/**
 * Вызывать из instrumentation.ts → register(), только при NEXT_RUNTIME === 'nodejs'
 * (см. node_modules/next/dist/docs — edge-рантайм не поддерживает @sentry/node).
 */
export function initServer({ dsn, environment }: InitServerOptions): void {
  if (!dsn) { return }

  Sentry.init({
    dsn,
    environment,
    beforeSend: (event) => scrubPii(event),
  })
}

/**
 * Прокидывается как `export const onRequestError` из instrumentation.ts — Next.js вызывает её
 * при любой серверной ошибке (см. Instrumentation.onRequestError в доках Next.js).
 */
export const captureRequestError: Instrumentation.onRequestError = async (err) => {
  if (isIgnorableRequestError(err)) { return }
  Sentry.captureException(err)
}

/**
 * Для не-Next.js бэкендов (Fastify/Express/CLI) — вызывать из своего error-хука после
 * initServer(). Next.js-приложения используют captureRequestError, не эту функцию.
 */
export function captureException(err: unknown): void {
  Sentry.captureException(err)
}

export { scrubPii }
