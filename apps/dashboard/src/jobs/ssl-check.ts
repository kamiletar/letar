/**
 * Проверка сроков действия SSL сертификатов в Nginx Proxy Manager — алерт `SSL_EXPIRING` с
 * Telegram-уведомлением при истечении/скором истечении (см. `lib/ssl-monitor.ts`).
 *
 * Раньше это была ручка `/api/cron/ssl-check`, которую по расписанию дёргал `dashboard-agent`
 * (`DEFAULT_CRON_JOBS`) — перенесено на `@letar/jobs` (PLAN-INFRA-4.md §75).
 */
import { checkSslCertificates } from '@/lib/ssl-monitor'
import { defineJob } from '@letar/jobs'

export const sslCheckJob = defineJob({
  id: 's2-ssl-check',
  name: 'SSL Certificate Expiry Check',
  description: 'Проверка сроков SSL сертификатов в NPM, алерт SSL_EXPIRING (см. lib/ssl-monitor.ts)',
  schedule: '0 8 * * *',
  handler: async () => {
    await checkSslCertificates()
  },
})
