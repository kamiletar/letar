/**
 * Jobs Observer Routes
 * Наблюдатель за `@letar/jobs`-задачами приложений тиража §75 (PLAN-INFRA-4.md).
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { getJobsObserverState, runJobsObserverCheck } from '../lib/jobs-observer'
import type { ApiResponse } from '../types'

export async function jobsObserverRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/jobs-observer-check — прогон опроса (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/jobs-observer-check', runJobsObserverCheck)

  /**
   * GET /api/cron/jobs-observer-check/status — текущее состояние без запуска нового опроса
   */
  fastify.get(
    '/api/cron/jobs-observer-check/status',
    async (): Promise<ApiResponse<ReturnType<typeof getJobsObserverState>>> => {
      return {
        success: true,
        data: getJobsObserverState(),
        timestamp: new Date().toISOString(),
      }
    },
  )
}
