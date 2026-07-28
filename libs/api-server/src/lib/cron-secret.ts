/**
 * Cron Secret
 *
 * Проверка заголовка X-Cron-Secret, которым dashboard-agent авторизует вызовы
 * cron-эндпоинтов приложений (`executeJob` шлёт POST + X-Cron-Secret на расписании).
 */

/**
 * Возвращает true, если заголовок `X-Cron-Secret` запроса совпадает с `CRON_SECRET`
 * из окружения. `CRON_SECRET` не задан → всегда false (fail-closed).
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  const providedSecret = request.headers.get('x-cron-secret')

  return Boolean(cronSecret) && providedSecret === cronSecret
}
