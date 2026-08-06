/**
 * Cron Routes
 * API для управления cron задачами
 */

import type { FastifyInstance } from 'fastify'
import {
  type CronExecutionLog,
  type CronJob,
  type CronJobStatus,
  executeJob,
  getAllJobStatuses,
  getJobLogs,
  getJobStatus,
  getScheduledCount,
  isSchedulerRunning,
  loadCronConfig,
  startScheduler,
  stopScheduler,
  updateJob,
} from '../lib/cron'
import type { ApiResponse } from '../types'

interface JobsResponse {
  isRunning: boolean
  scheduledCount: number
  totalCount: number
  jobs: CronJobStatus[]
}

interface SchedulerActionBody {
  action: 'start' | 'stop'
}

interface UpdateJobBody {
  enabled?: boolean
  schedule?: string
  description?: string
}

export async function cronRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/cron/jobs — список всех задач с статусами
   */
  fastify.get('/api/cron/jobs', async (): Promise<ApiResponse<JobsResponse>> => {
    try {
      const statuses = getAllJobStatuses()
      const isRunning = isSchedulerRunning()
      const scheduledCount = getScheduledCount()

      return {
        success: true,
        data: {
          isRunning,
          scheduledCount,
          totalCount: statuses.length,
          jobs: statuses,
        },
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
   * POST /api/cron/jobs — start/stop планировщика
   */
  fastify.post<{ Body: SchedulerActionBody }>(
    '/api/cron/jobs',
    async (request): Promise<ApiResponse<{ message: string; isRunning: boolean }>> => {
      try {
        const { action } = request.body

        if (action === 'start') {
          startScheduler()
          return {
            success: true,
            data: {
              message: 'Планировщик запущен',
              isRunning: true,
            },
            timestamp: new Date().toISOString(),
          }
        }

        if (action === 'stop') {
          stopScheduler()
          return {
            success: true,
            data: {
              message: 'Планировщик остановлен',
              isRunning: false,
            },
            timestamp: new Date().toISOString(),
          }
        }

        return {
          success: false,
          error: 'Invalid action. Use "start" or "stop"',
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
   * GET /api/cron/jobs/:id — информация о задаче
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/cron/jobs/:id',
    async (request): Promise<ApiResponse<CronJobStatus>> => {
      try {
        const { id } = request.params
        const status = getJobStatus(id)

        if (!status) {
          return {
            success: false,
            error: 'Job not found',
            timestamp: new Date().toISOString(),
          }
        }

        return {
          success: true,
          data: status,
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
   * PATCH /api/cron/jobs/:id — обновление задачи
   */
  fastify.patch<{ Params: { id: string }; Body: UpdateJobBody }>(
    '/api/cron/jobs/:id',
    async (request): Promise<ApiResponse<{ job: CronJob }>> => {
      try {
        const { id } = request.params
        const body = request.body

        // Разрешённые поля
        const updates: Partial<CronJob> = {}
        if (body.enabled !== undefined) {
          updates.enabled = body.enabled
        }
        if (body.schedule !== undefined) {
          updates.schedule = body.schedule
        }
        if (body.description !== undefined) {
          updates.description = body.description
        }

        const updatedJob = updateJob(id, updates)

        if (!updatedJob) {
          return {
            success: false,
            error: 'Job not found',
            timestamp: new Date().toISOString(),
          }
        }

        return {
          success: true,
          data: { job: updatedJob },
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
   * POST /api/cron/jobs/:id/run — ручной запуск задачи
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/cron/jobs/:id/run',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (request): Promise<ApiResponse<{ result: CronExecutionLog }>> => {
      try {
        const { id } = request.params

        const jobs = loadCronConfig()
        const job = jobs.find((j) => j.id === id)

        if (!job) {
          return {
            success: false,
            error: 'Job not found',
            timestamp: new Date().toISOString(),
          }
        }

        const result = await executeJob(job)

        return {
          success: result.status === 'success',
          data: { result },
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
   * GET /api/cron/jobs/:id/history — история выполнений
   */
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/api/cron/jobs/:id/history',
    async (request): Promise<ApiResponse<{ jobId: string; jobName: string; logs: CronExecutionLog[] }>> => {
      try {
        const { id } = request.params
        const limit = parseInt(request.query.limit || '20', 10)

        const status = getJobStatus(id)

        if (!status) {
          return {
            success: false,
            error: 'Job not found',
            timestamp: new Date().toISOString(),
          }
        }

        const logs = getJobLogs(id, limit)

        return {
          success: true,
          data: {
            jobId: id,
            jobName: status.job.name,
            logs,
          },
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
