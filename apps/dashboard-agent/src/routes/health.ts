/**
 * Health Check Route
 * GET /health — проверка доступности агента
 */

import type { FastifyInstance } from 'fastify'
import type { HealthResponse } from '../types'

const startTime = Date.now()
const VERSION = '0.1.0'

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (): Promise<HealthResponse> => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: VERSION,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    }
  })
}
