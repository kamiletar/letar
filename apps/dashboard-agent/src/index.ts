/**
 * Dashboard Agent
 * Lightweight HTTP сервер для мониторинга удалённых серверов
 *
 * Запуск:
 *   nx dev dashboard-agent        # development (watch mode)
 *   nx build dashboard-agent      # build
 *   nx start dashboard-agent      # production
 *
 * Переменные окружения:
 *   PORT        — порт сервера (default: 3100)
 *   HOST        — хост сервера (default: 0.0.0.0)
 *   AGENT_TOKEN — токен авторизации (обязательно для production)
 *   ALLOWED_IPS — опционально: whitelist IP/CIDR через запятую (defence in depth поверх
 *                 AGENT_TOKEN, см. lib/ip-whitelist.ts). Не задан — проверка выключена.
 *                 ⚠️ Если включаешь — не забудь включить IP, с которого dashboard-agent
 *                 сам себе ходит по cron-задачам (app: 'dashboard-agent' в cron.ts,
 *                 обычно 127.0.0.1/localhost контейнера), иначе они начнут падать 403.
 */

import { captureException, initServer } from '@letar/glitchtip/server'
import Fastify from 'fastify'
import { authMiddleware } from './lib/auth'
import { rehydrateExecutionLogsFromRedis, startScheduler } from './lib/cron'
import { startHistoryCollection } from './lib/history'
import { ipWhitelistMiddleware } from './lib/ip-whitelist'
import { acmeDnsRoutes } from './routes/acme-dns'
import { appsRoutes } from './routes/apps'
import { backupFreshnessRoutes } from './routes/backup-freshness'
import { cronRoutes } from './routes/cron'
import { databaseRoutes } from './routes/database'
import { deployRoutes } from './routes/deploy'
import { dockerRoutes } from './routes/docker'
import { e2eRoutes } from './routes/e2e'
import { emailCanaryRoutes } from './routes/email-canary'
import { envRoutes } from './routes/env'
import { gitRoutes } from './routes/git'
import { healthRoutes } from './routes/health'
import { healthCheckRoutes } from './routes/health-check'
import { logScanRoutes } from './routes/log-scan'
import { metricsRoutes } from './routes/metrics'
import { nginxRoutes } from './routes/nginx'
import { systemRoutes } from './routes/system'
import { traefikRoutes } from './routes/traefik'

const PORT = parseInt(process.env.PORT || '3100', 10)
const HOST = process.env.HOST || '0.0.0.0'

async function main(): Promise<void> {
  initServer({
    dsn: process.env.GLITCHTIP_DSN,
    environment: process.env.GLITCHTIP_ENVIRONMENT ?? 'development',
  })

  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
        : undefined,
    },
  })

  // Разрешаем пустой body для application/json (для POST /run без body)
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const json = body ? JSON.parse(body as string) : {}
      done(null, json)
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  // CORS для локальной разработки
  await fastify.register(import('@fastify/cors'), {
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })

  // Rate limiting — глобальный лимит на IP, с запасом под легитимный polling
  // dashboard (кэши в system.ts/docker.ts — 2-15 сек) и собственные cron-вызовы агента
  // на себя же. Настраивается RATE_LIMIT_MAX/RATE_LIMIT_WINDOW_MS, не задано — дефолты ниже.
  await fastify.register(import('@fastify/rate-limit'), {
    max: Number(process.env.RATE_LIMIT_MAX) || 600,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    allowList: ['127.0.0.1', '::1'],
    errorResponseBuilder: () => ({
      success: false,
      error: 'Too many requests',
      timestamp: new Date().toISOString(),
    }),
  })

  // Отправка ошибок в GlitchTip — не подменяет ответ, только наблюдает (§70 PLAN-INFRA)
  fastify.addHook('onError', async (_request, _reply, error) => {
    captureException(error)
  })

  // IP whitelist (опционально, ALLOWED_IPS) — до аутентификации, см. lib/ip-whitelist.ts
  fastify.addHook('preHandler', ipWhitelistMiddleware)

  // Middleware аутентификации (кроме /health)
  fastify.addHook('preHandler', authMiddleware)

  // Регистрация роутов
  await fastify.register(healthRoutes)
  await fastify.register(appsRoutes)
  await fastify.register(systemRoutes)
  await fastify.register(dockerRoutes)
  await fastify.register(deployRoutes)
  await fastify.register(e2eRoutes)
  await fastify.register(databaseRoutes)
  await fastify.register(nginxRoutes)
  await fastify.register(acmeDnsRoutes)
  await fastify.register(traefikRoutes)
  await fastify.register(cronRoutes)
  await fastify.register(gitRoutes)
  await fastify.register(envRoutes)
  await fastify.register(emailCanaryRoutes)
  await fastify.register(backupFreshnessRoutes)
  await fastify.register(healthCheckRoutes)
  await fastify.register(logScanRoutes)
  await fastify.register(metricsRoutes)

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']
  for (const signal of signals) {
    process.on(signal, async () => {
      fastify.log.info(`Received ${signal}, shutting down...`)
      await fastify.close()
      process.exit(0)
    })
  }

  // Запуск сервера
  try {
    await fastify.listen({ port: PORT, host: HOST })
    fastify.log.info(`Dashboard Agent started on http://${HOST}:${PORT}`)

    if (!process.env.AGENT_TOKEN) {
      fastify.log.warn('AGENT_TOKEN not set. All requests will be rejected.')
      fastify.log.warn('Set AGENT_TOKEN environment variable for authentication.')
    }

    // Автозапуск cron планировщика (всегда, агент работает только в production)
    await rehydrateExecutionLogsFromRedis()
    fastify.log.info('Starting cron scheduler...')
    startScheduler()

    // Запуск сбора истории метрик
    startHistoryCollection()
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

main()
