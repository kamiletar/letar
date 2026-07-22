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
 */

import Fastify from 'fastify'
import { authMiddleware } from './lib/auth'
import { startScheduler } from './lib/cron'
import { startHistoryCollection } from './lib/history'
import { appsRoutes } from './routes/apps'
import { cronRoutes } from './routes/cron'
import { databaseRoutes } from './routes/database'
import { deployRoutes } from './routes/deploy'
import { dockerRoutes } from './routes/docker'
import { e2eRoutes } from './routes/e2e'
import { emailCanaryRoutes } from './routes/email-canary'
import { envRoutes } from './routes/env'
import { gitRoutes } from './routes/git'
import { healthRoutes } from './routes/health'
import { nginxRoutes } from './routes/nginx'
import { systemRoutes } from './routes/system'

const PORT = parseInt(process.env.PORT || '3100', 10)
const HOST = process.env.HOST || '0.0.0.0'

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
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
  await fastify.register(cronRoutes)
  await fastify.register(gitRoutes)
  await fastify.register(envRoutes)
  await fastify.register(emailCanaryRoutes)

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
