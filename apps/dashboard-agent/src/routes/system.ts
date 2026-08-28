/**
 * System Metrics Routes
 * API для получения системных метрик
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'
import { apiHandler } from '../lib/api-handler'
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

export async function systemRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/system/cpu — информация о CPU
   */
  fastify.get('/api/system/cpu', apiHandler(() => getCPUInfo()))

  /**
   * GET /api/system/memory — информация о памяти
   */
  fastify.get('/api/system/memory', apiHandler(() => getMemoryInfo()))

  /**
   * GET /api/system/disk — информация о дисках
   */
  fastify.get('/api/system/disk', apiHandler(() => getDiskInfo()))

  /**
   * GET /api/system/network — информация о сети
   */
  fastify.get('/api/system/network', apiHandler(() => getNetworkInfo()))

  /**
   * GET /api/system/uptime — uptime системы
   */
  fastify.get('/api/system/uptime', apiHandler(() => getSystemUptime()))

  /**
   * GET /api/system/info — общая информация о системе
   */
  fastify.get('/api/system/info', apiHandler(() => getSystemInfo()))

  /**
   * GET /api/system/processes — топ процессов по памяти
   */
  fastify.get<{ Querystring: { limit?: string } }>(
    '/api/system/processes',
    apiHandler(async (request: FastifyRequest<{ Querystring: { limit?: string } }>) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20
      return getTopProcesses(limit)
    }),
  )

  /**
   * GET /api/system/history — история метрик (ring buffer)
   */
  fastify.get<{ Querystring: { hours?: string } }>(
    '/api/system/history',
    apiHandler(async (request: FastifyRequest<{ Querystring: { hours?: string } }>): Promise<HistoryData> => {
      const hours = request.query.hours ? parseInt(request.query.hours, 10) : 24
      return getHistory(hours)
    }),
  )

  /**
   * GET /api/system/all — все метрики сразу (для SSE)
   */
  fastify.get(
    '/api/system/all',
    apiHandler(async () => {
      const [cpu, memory, disk] = await Promise.all([getCPUInfo(), getMemoryInfo(), getDiskInfo()])
      return { cpu, memory, disk }
    }),
  )
}
