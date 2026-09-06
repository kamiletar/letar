/**
 * Domwellbes Email Canary Routes
 * Per-app канареечный мониторинг доставки email domwellbes (см. lib/domwellbes-email-canary.ts)
 */

import type { FastifyInstance } from 'fastify'
import { apiHandler } from '../lib/api-handler'
import { defineCronRoute } from '../lib/cron-route'
import { getDomwellbesEmailCanaryState, runDomwellbesEmailCanaryCheck } from '../lib/domwellbes-email-canary'

export async function domwellbesEmailCanaryRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/domwellbes-email-canary-check — прогон проверки (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/domwellbes-email-canary-check', runDomwellbesEmailCanaryCheck)

  /**
   * GET /api/cron/domwellbes-email-canary-check/status — последнее состояние без нового прогона
   */
  fastify.get(
    '/api/cron/domwellbes-email-canary-check/status',
    apiHandler<ReturnType<typeof getDomwellbesEmailCanaryState>>(() =>
      Promise.resolve(getDomwellbesEmailCanaryState())
    ),
  )
}
