import { initClient } from '@letar/glitchtip/client'

initClient({
  dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,
  environment: process.env.NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT ?? 'development',
  release: process.env.NEXT_PUBLIC_GLITCHTIP_RELEASE,
})
