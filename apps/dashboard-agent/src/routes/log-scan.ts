/**
 * Log Scan Routes
 * Проактивное сканирование логов контейнеров на ошибки (Backlog «Улучшения сбора метрик»)
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { runLogScan } from '../lib/log-scan'

export async function logScanRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/log-scan — прогон сканирования (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/log-scan', runLogScan)
}
