/**
 * Staging Idle Shutdown Route
 * Плановая остановка простаивающих staging-контейнеров на s3, см. `lib/staging-idle-shutdown.ts`
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { runStagingIdleShutdown } from '../lib/staging-idle-shutdown'

export async function stagingIdleShutdownRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/staging-idle-shutdown — прогон остановки (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/staging-idle-shutdown', runStagingIdleShutdown)
}
