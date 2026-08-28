/**
 * Login Canary Routes
 * Синтетическая проверка входа во все приложения с credential-входом (см. `lib/login-canary.ts`).
 */

import type { FastifyInstance } from 'fastify'
import { type LoginCanaryCheckResult, runLoginCanaryCheck } from '../lib/login-canary'
import type { ApiResponse } from '../types'

export async function loginCanaryRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/login-canary-check — прогон проверки (вызывается планировщиком cron.ts)
   */
  fastify.post(
    '/api/cron/login-canary-check',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<LoginCanaryCheckResult>> => {
      try {
        const result = await runLoginCanaryCheck()
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
