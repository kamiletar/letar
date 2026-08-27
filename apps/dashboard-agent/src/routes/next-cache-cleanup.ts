/**
 * Next.js Build Cache Cleanup Route
 * Плановая чистка `.next/cache` в чекауте репозитория, см. `lib/next-cache-cleanup.ts`
 */

import type { FastifyInstance } from 'fastify'
import { type NextCacheCleanupResult, runNextCacheCleanup } from '../lib/next-cache-cleanup'
import type { ApiResponse } from '../types'

export async function nextCacheCleanupRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/next-cache-cleanup — прогон чистки (вызывается планировщиком cron.ts)
   */
  fastify.post(
    '/api/cron/next-cache-cleanup',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<NextCacheCleanupResult>> => {
      try {
        const result = await runNextCacheCleanup()
        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )
}
