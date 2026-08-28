/**
 * Health Check Routes
 * Проверка порогов CPU/память/диск + статуса контейнеров/БД (Backlog «Алерты при
 * превышении порогов», P2)
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { runHealthCheck } from '../lib/health-check'

export async function healthCheckRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/health-check — прогон проверки (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/health-check', runHealthCheck)
}
