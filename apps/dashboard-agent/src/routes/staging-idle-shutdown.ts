/**
 * Staging Idle Shutdown Route
 * Плановая остановка простаивающих staging-контейнеров на s3, см. `lib/staging-idle-shutdown.ts`
 */

import type { FastifyInstance } from 'fastify'
import { runStagingIdleShutdown, type StagingIdleShutdownResult } from '../lib/staging-idle-shutdown'
import type { ApiResponse } from '../types'

export async function stagingIdleShutdownRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/staging-idle-shutdown — прогон остановки (вызывается планировщиком cron.ts)
   */
  fastify.post(
    '/api/cron/staging-idle-shutdown',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<StagingIdleShutdownResult>> => {
      try {
        const result = await runStagingIdleShutdown()
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
