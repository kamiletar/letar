import { CookieConsentSchema } from './cookie-consent-schema'
import { type ConsentLogData, recordConsent } from './record-consent'

export interface CreateConsentRouteOptions {
  /** Извлекает id пользователя из сессии (или null для анонимного согласия). */
  getUserId: (request: Request) => Promise<string | null>
  /** Сохраняет запись в ConsentLog конкретного приложения (Prisma/ZenStack клиент). */
  saveConsentLog: (data: ConsentLogData) => Promise<unknown>
}

/**
 * Фабрика POST /api/consent — принимает `CookieConsentState` из `@letar/ui` `CookieBanner`,
 * валидирует и записывает согласие через `recordConsent`. Каждое приложение передаёт только
 * свой способ получить userId из сессии и свой Prisma/ZenStack клиент.
 */
export function createConsentRoute(options: CreateConsentRouteOptions) {
  return async function POST(request: Request): Promise<Response> {
    const body = await request.json().catch(() => null)
    const parsed = CookieConsentSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'invalid' }, { status: 400 })
    }

    const userId = await options.getUserId(request)

    await recordConsent(
      {
        userId,
        acceptedAnalytics: parsed.data.analytics,
        acceptedMarketing: parsed.data.marketing,
        acceptedFunctional: true,
        consentVersion: parsed.data.version,
      },
      request,
      options.saveConsentLog
    )

    return Response.json({ ok: true })
  }
}
