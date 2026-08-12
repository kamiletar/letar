import type { Instrumentation } from 'next'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initServer } = await import('@letar/glitchtip/server')
    initServer({
      dsn: process.env.GLITCHTIP_DSN,
      environment: process.env.GLITCHTIP_ENVIRONMENT ?? 'development',
    })
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { captureRequestError } = await import('@letar/glitchtip/server')
    await captureRequestError(...args)
  }
}
