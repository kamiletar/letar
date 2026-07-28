/**
 * Backup Freshness Routes
 * Проверка «есть ли свежий бэкап Maddy» (Этап 0.3 корневого PLAN.md)
 */

import type { FastifyInstance } from 'fastify'
import { type BackupFreshnessCheckResult, runBackupFreshnessCheck } from '../lib/backup-freshness'
import type { ApiResponse } from '../types'

export async function backupFreshnessRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/backup-freshness-check — прогон проверки (вызывается планировщиком cron.ts)
   */
  fastify.post(
    '/api/cron/backup-freshness-check',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<BackupFreshnessCheckResult>> => {
      try {
        const result = await runBackupFreshnessCheck()
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
