/**
 * Git API Routes
 * API для работы с git репозиторием
 */

import type { FastifyInstance } from 'fastify'
import { apiHandler } from '../lib/api-handler'
import { getGitStatus, getIncomingCommits, gitPull } from '../lib/git'
import type { ApiResponse } from '../types'

export async function gitRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/git/status — статус репозитория
   */
  fastify.get('/api/git/status', apiHandler(() => getGitStatus()))

  /**
   * GET /api/git/incoming — входящие коммиты
   */
  fastify.get('/api/git/incoming', apiHandler(() => getIncomingCommits()))

  /**
   * POST /api/git/pull — выполнить git pull
   */
  fastify.post('/api/git/pull', async (): Promise<ApiResponse<Awaited<ReturnType<typeof gitPull>>>> => {
    try {
      const data = await gitPull()
      return {
        success: data.success,
        data,
        error: data.success ? undefined : data.output,
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
