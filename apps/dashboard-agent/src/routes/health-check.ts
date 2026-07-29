/**
 * Health Check Routes
 * Проверка порогов CPU/память/диск + статуса контейнеров/БД (Backlog «Алерты при
 * превышении порогов», P2)
 */

import type { FastifyInstance } from 'fastify'
import { type HealthCheckResult, runHealthCheck } from '../lib/health-check'
import type { ApiResponse } from '../types'

export async function healthCheckRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/health-check — прогон проверки (вызывается планировщиком cron.ts)
   */
  fastify.post(
    '/api/cron/health-check',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<HealthCheckResult>> => {
      try {
        const result = await runHealthCheck()
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
    }
  )
}
