/**
 * acme-dns Routes
 * API для бэкапа acme-dns (PLAN-INFRA.md §48)
 */

import type { FastifyInstance } from 'fastify'
import {
  type AcmeDnsBackupInfo,
  type AcmeDnsBackupResult,
  backupAcmeDns,
  getAcmeDnsBackupsList,
} from '../lib/acme-dns-backup'
import type { ApiResponse } from '../types'

export async function acmeDnsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/acme-dns/backup — создать бэкап acme-dns
   * Архивирует базу выданных поддоменов + файл аккаунтов lego
   */
  fastify.post(
    '/api/acme-dns/backup',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<AcmeDnsBackupResult>> => {
      try {
        const result = await backupAcmeDns('auto')

        return {
          success: result.success,
          data: result,
          error: result.success ? undefined : result.error,
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

  /**
   * GET /api/acme-dns/backups — список бэкапов acme-dns
   */
  fastify.get('/api/acme-dns/backups', async (): Promise<ApiResponse<AcmeDnsBackupInfo[]>> => {
    try {
      const backups = await getAcmeDnsBackupsList()
      return {
        success: true,
        data: backups,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  })
}
