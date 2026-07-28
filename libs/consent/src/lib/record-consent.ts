import { hashIp } from './hash-ip'

export interface ConsentLogInput {
  userId?: string | null
  anonymousId?: string | null
  acceptedAnalytics: boolean
  acceptedMarketing: boolean
  acceptedFunctional: boolean
  consentVersion: string
}

export interface ConsentLogData extends ConsentLogInput {
  ipHash: string
  userAgent: string | null
}

/** Собирает данные записи ConsentLog из входных полей и заголовков запроса. Чистая функция. */
export function buildConsentLogData(input: ConsentLogInput, request: Request): ConsentLogData {
  return {
    ...input,
    ipHash: hashIp(request),
    userAgent: request.headers.get('user-agent') ?? null,
  }
}

/**
 * Записывает согласие субъекта ПДн (152-ФЗ ст. 9).
 * Каждое приложение генерирует свою ZenStack-схему `ConsentLog`, поэтому запись в БД
 * остаётся на стороне вызывающего — `save` получает уже собранный `ConsentLogData`.
 */
export async function recordConsent(
  input: ConsentLogInput,
  request: Request,
  save: (data: ConsentLogData) => Promise<unknown>,
): Promise<void> {
  await save(buildConsentLogData(input, request))
}
