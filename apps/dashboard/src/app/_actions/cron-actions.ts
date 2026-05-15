'use server'

import { logFailure, logSuccess } from '@/lib/audit-log'
import { requireAdmin } from '@/lib/auth-utils'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'

/**
 * Запускает cron задачу вручную через dashboard-agent
 * @requires ADMIN role
 */
export async function runCronJob(jobId: string, serverId?: string | null) {
  const user = await requireAdmin()

  try {
    const { client, server } = await getClientByServerId(serverId)
    const { result } = await client.runCronJob(jobId)

    if (result.status === 'success') {
      await logSuccess(user.username, user.role, 'CRON_RUN', jobId, {
        server: server.name,
        duration: result.duration,
      })
      return { success: true, result }
    } else {
      await logFailure(user.username, user.role, 'CRON_RUN', result.error || 'Unknown error', jobId, {
        server: server.name,
      })
      return { success: false, error: result.error, result }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'CRON_RUN', errorMsg, jobId)
    return { success: false, error: errorMsg }
  }
}

/**
 * Переключает состояние задачи (enabled/disabled) через dashboard-agent
 * @requires ADMIN role
 */
export async function toggleCronJob(jobId: string, enabled: boolean, serverId?: string | null) {
  const user = await requireAdmin()

  try {
    const { client, server } = await getClientByServerId(serverId)
    const { job } = await client.updateCronJob(jobId, { enabled })

    await logSuccess(user.username, user.role, enabled ? 'CRON_ENABLE' : 'CRON_DISABLE', jobId, {
      server: server.name,
      jobName: job.name,
    })

    return { success: true, job }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'CRON_TOGGLE', errorMsg, jobId)
    return { success: false, error: errorMsg }
  }
}

/**
 * Обновляет расписание задачи через dashboard-agent
 * @requires ADMIN role
 */
export async function updateCronSchedule(jobId: string, schedule: string, serverId?: string | null) {
  const user = await requireAdmin()

  try {
    const { client, server } = await getClientByServerId(serverId)
    const { job } = await client.updateCronJob(jobId, { schedule })

    await logSuccess(user.username, user.role, 'CRON_UPDATE_SCHEDULE', jobId, {
      server: server.name,
      jobName: job.name,
      schedule,
    })

    return { success: true, job }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'CRON_UPDATE_SCHEDULE', errorMsg, jobId)
    return { success: false, error: errorMsg }
  }
}

/**
 * Управляет планировщиком (start/stop) через dashboard-agent
 * @requires ADMIN role
 */
export async function controlScheduler(action: 'start' | 'stop', serverId?: string | null) {
  const user = await requireAdmin()

  try {
    const { client, server } = await getClientByServerId(serverId)
    const result = await client.controlCronScheduler(action)

    await logSuccess(user.username, user.role, action === 'start' ? 'SCHEDULER_START' : 'SCHEDULER_STOP', undefined, {
      server: server.name,
    })

    return { success: true, message: result.message }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, action === 'start' ? 'SCHEDULER_START' : 'SCHEDULER_STOP', errorMsg)
    return { success: false, error: errorMsg }
  }
}
