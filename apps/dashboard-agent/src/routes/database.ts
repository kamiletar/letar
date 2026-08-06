/**
 * Database Routes
 * API для получения статуса и статистики PostgreSQL баз данных
 */

import type { FastifyInstance } from 'fastify'
import {
  backupAllDatabases,
  backupDatabase,
  type BackupInfo,
  type BackupResult,
  type DatabaseStatsResult,
  type DatabaseStatus,
  getAllDatabaseStats,
  getAllDatabaseStatuses,
  getBackupsList,
  getDbConfig,
} from '../lib/database'
import type { ApiResponse } from '../types'

export async function databaseRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/database/status — статус всех БД
   */
  fastify.get('/api/database/status', async (): Promise<ApiResponse<DatabaseStatus[]>> => {
    try {
      const data = await getAllDatabaseStatuses()
      return {
        success: true,
        data,
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

  /**
   * GET /api/database/stats — статистика всех БД
   * Query params:
   * - db?: string — фильтр по имени БД
   */
  fastify.get<{ Querystring: { db?: string } }>(
    '/api/database/stats',
    async (request): Promise<ApiResponse<DatabaseStatsResult[]>> => {
      try {
        const dbName = request.query.db
        const data = await getAllDatabaseStats(dbName)
        return {
          success: true,
          data,
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
   * POST /api/database/backup — бэкап БД
   * Query params:
   * - db?: string — имя конкретной БД (если не указано — бэкап всех)
   */
  fastify.post<{ Querystring: { db?: string } }>(
    '/api/database/backup',
    async (
      request,
    ): Promise<
      ApiResponse<{ results: BackupResult[]; summary: { total: number; success: number; failed: number } }>
    > => {
      try {
        const { db } = request.query

        let results: BackupResult[]

        if (db) {
          // Бэкап конкретной БД
          const dbConfig = getDbConfig(db)
          if (!dbConfig) {
            return {
              success: false,
              error: `Database config not found: ${db}`,
              timestamp: new Date().toISOString(),
            }
          }
          results = [await backupDatabase(dbConfig)]
        } else {
          // Бэкап всех БД
          results = await backupAllDatabases()
        }

        const summary = {
          total: results.length,
          success: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        }

        return {
          success: summary.failed === 0,
          data: { results, summary },
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
   * GET /api/database/backups — список бэкапов
   * Возвращает бэкапы только для БД доступных на этом сервере
   * Query params:
   * - db?: string — фильтр по имени БД
   */
  fastify.get<{ Querystring: { db?: string } }>(
    '/api/database/backups',
    async (request): Promise<ApiResponse<BackupInfo[]>> => {
      try {
        const dbName = request.query.db
        const backups = await getBackupsList(dbName)
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
    },
  )
}
