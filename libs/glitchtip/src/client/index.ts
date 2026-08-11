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

export { scrubPii }
