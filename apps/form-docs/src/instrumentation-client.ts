// Ложное срабатывание @nx/enforce-module-boundaries — см. PLAN-INFRA.md §70 п.7.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { initClient } from '@letar/glitchtip/client'

initClient({
  dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,
  environment: process.env.NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT ?? 'development',
})
