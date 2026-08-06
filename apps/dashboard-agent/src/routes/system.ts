/**
 * System Metrics Routes
 * API для получения системных метрик
 */

import type { FastifyInstance } from 'fastify'
import type { HistoryData } from '../lib/history'
import { getHistory } from '../lib/history'
import {
  getCPUInfo,
  getDiskInfo,
  getMemoryInfo,
  getNetworkInfo,
  getSystemInfo,
  getSystemUptime,
  getTopProcesses,
} from '../lib/system'
import type { ApiResponse } from '../types'

export async function systemRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/system/cpu — информация о CPU
   */
  fastify.get('/api/system/cpu', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getCPUInfo>>>> => {
    try {
      const data = await getCPUInfo()
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
   * GET /api/system/memory — информация о памяти
   */
  fastify.get('/api/system/memory', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getMemoryInfo>>>> => {
    try {
      const data = await getMemoryInfo()
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
   * GET /api/system/disk — информация о дисках
   */
  fastify.get('/api/system/disk', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getDiskInfo>>>> => {
    try {
      const data = await getDiskInfo()
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
   * GET /api/system/network — информация о сети
   */
  fastify.get('/api/system/network', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getNetworkInfo>>>> => {
    try {
      const data = await getNetworkInfo()
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
   * GET /api/system/uptime — uptime системы
   */
  fastify.get('/api/system/uptime', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getSystemUptime>>>> => {
    try {
      const data = await getSystemUptime()
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
   * GET /api/system/info — общая информация о системе
   */
  fastify.get('/api/system/info', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getSystemInfo>>>> => {
    try {
      const data = await getSystemInfo()
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
   * GET /api/system/processes — топ процессов по памяти
   */
  fastify.get<{ Querystring: { limit?: string } }>(
    '/api/system/processes',
    async (request): Promise<ApiResponse<Awaited<ReturnType<typeof getTopProcesses>>>> => {
      try {
        const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20
        const data = await getTopProcesses(limit)
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
   * GET /api/system/history — история метрик (ring buffer)
   */
  fastify.get<{ Querystring: { hours?: string } }>(
    '/api/system/history',
    async (request): Promise<ApiResponse<HistoryData>> => {
      try {
        const hours = request.query.hours ? parseInt(request.query.hours, 10) : 24
        const data = getHistory(hours)
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
   * GET /api/system/all — все метрики сразу (для SSE)
   */
  fastify.get(
    '/api/system/all',
    async (): Promise<
      ApiResponse<{
        cpu: Awaited<ReturnType<typeof getCPUInfo>>
        memory: Awaited<ReturnType<typeof getMemoryInfo>>
        disk: Awaited<ReturnType<typeof getDiskInfo>>
      }>
    > => {
      try {
        const [cpu, memory, disk] = await Promise.all([getCPUInfo(), getMemoryInfo(), getDiskInfo()])

        return {
          success: true,
          data: { cpu, memory, disk },
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
