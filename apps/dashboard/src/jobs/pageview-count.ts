/**
 * Инкрементальный парсинг access-логов Nginx Proxy Manager в грубый счётчик hits/day/domain
 * без ПДн — см. `lib/pageview-counter.ts` за деталями (дополняет Umami там, где cookie-consent
 * gate не пропускает часть трафика).
 *
 * Раньше это была ручка `/api/cron/pageview-count`, которую по расписанию дёргал `dashboard-agent`
 * (`DEFAULT_CRON_JOBS`) — перенесено на `@letar/jobs` (PLAN-INFRA-4.md §75).
 */
import { updatePageViewCounts } from '@/lib/pageview-counter'
import { defineJob } from '@letar/jobs'

export const pageviewCountJob = defineJob({
  id: 's2-pageview-count',
  name: 'Page View Counter',
  description: 'Инкрементальный парсинг access-логов NPM в счётчик hits/day/domain (см. lib/pageview-counter.ts)',
  schedule: '*/10 * * * *',
  handler: async () => {
    await updatePageViewCounts()
  },
})
