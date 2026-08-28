/**
 * Email Canary Routes
 * Канареечный мониторинг доставки email (Этап 0.7 корневого PLAN.md)
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { getEmailCanaryState, runEmailCanaryCheck } from '../lib/email-canary'
import type { ApiResponse } from '../types'

export async function emailCanaryRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/email-canary-check — прогон канареечной проверки (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/email-canary-check', runEmailCanaryCheck)

  /**
   * GET /api/cron/email-canary-check/status — последнее состояние без запуска новой проверки
   */
  fastify.get(
    '/api/cron/email-canary-check/status',
    async (): Promise<ApiResponse<ReturnType<typeof getEmailCanaryState>>> => {
      try {
        return {
          success: true,
          data: getEmailCanaryState(),
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
