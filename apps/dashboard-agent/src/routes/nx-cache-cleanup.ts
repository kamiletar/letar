/**
 * Nx Cache Cleanup Route
 * Плановая чистка `.nx/cache` в чекауте репозитория, см. `lib/nx-cache-cleanup.ts`
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { runNxCacheCleanup } from '../lib/nx-cache-cleanup'

export async function nxCacheCleanupRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/nx-cache-cleanup — прогон чистки (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/nx-cache-cleanup', runNxCacheCleanup)
}
