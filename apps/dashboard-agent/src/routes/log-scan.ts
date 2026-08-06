/**
 * Log Scan Routes
 * Проактивное сканирование логов контейнеров на ошибки (Backlog «Улучшения сбора метрик»)
 */

import type { FastifyInstance } from 'fastify'
import { type LogScanResult, runLogScan } from '../lib/log-scan'
import type { ApiResponse } from '../types'

export async function logScanRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/log-scan — прогон сканирования (вызывается планировщиком cron.ts)
   */
  fastify.post(
    '/api/cron/log-scan',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<LogScanResult>> => {
      try {
        const result = await runLogScan()
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
