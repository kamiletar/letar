/**
 * Cron Secret
 *
 * Проверка заголовка X-Cron-Secret, которым dashboard-agent авторизует вызовы
 * cron-эндпоинтов приложений (`executeJob` шлёт POST + X-Cron-Secret на расписании).
 */

import { verifySharedSecret } from './shared-secret'

/**
 * Возвращает true, если заголовок `X-Cron-Secret` запроса совпадает с `CRON_SECRET`
 * из окружения. `CRON_SECRET` не задан → всегда false (fail-closed).
 */
export function verifyCronSecret(request: Request): boolean {
  return verifySharedSecret(request, { envVar: 'CRON_SECRET', header: 'x-cron-secret' })
}
