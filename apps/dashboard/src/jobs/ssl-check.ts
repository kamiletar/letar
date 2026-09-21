/**
 * Проверка сроков действия SSL/TLS-сертификатов — алерт `SSL_EXPIRING` с Telegram-уведомлением
 * при истечении/скором истечении (см. `lib/ssl-monitor.ts`).
 *
 * Раньше это была ручка `/api/cron/ssl-check`, которую по расписанию дёргал `dashboard-agent`
 * (`DEFAULT_CRON_JOBS`) — перенесено на `@letar/jobs` (PLAN-INFRA-4.md §75).
 */
import { checkSslCertificates } from '@/lib/ssl-monitor'
import { defineJob } from '@letar/jobs'

export const sslCheckJob = defineJob({
  id: 's2-ssl-check',
  name: 'SSL Certificate Expiry Check',
  description:
    'Проверка сроков TLS-сертификатов: прямое подключение к SSL_CHECK_TARGETS (по умолчанию mail.letar.best:993/465) + необязательно NPM. Алерт SSL_EXPIRING (см. lib/ssl-monitor.ts)',
  schedule: '0 8 * * *',
  handler: async () => {
    const result = await checkSslCertificates()
    // Недоступную цель нельзя списывать на «всё хорошо»: бросаем, чтобы прогон попал в журнал
    // задач как неудачный и его поймал наблюдатель jobs (CRON_FAILED). Раньше такая ошибка
    // возвращалась значением и обрабатывалась молча — так и пропустили истёкший сертификат почты.
    if (result.probeErrors.length > 0) {
      throw new Error(`Не удалось проверить сертификат: ${result.probeErrors.join('; ')}`)
    }
  },
})
