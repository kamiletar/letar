/**
 * Next.js Build Cache Cleanup Route
 * Плановая чистка `.next/cache` в чекауте репозитория, см. `lib/next-cache-cleanup.ts`
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { runNextCacheCleanup } from '../lib/next-cache-cleanup'

export async function nextCacheCleanupRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/next-cache-cleanup — прогон чистки (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/next-cache-cleanup', runNextCacheCleanup)
}
