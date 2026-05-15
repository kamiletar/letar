'use server'

import { logFailure, logSuccess } from '@/lib/audit-log'
import { requireAdmin } from '@/lib/auth-utils'
import { getLocalClient } from '@/lib/server-client'

/**
 * Запускает Docker контейнер через локальный dashboard-agent
 * @requires ADMIN role
 */
export async function startContainer(containerId: string) {
  const user = await requireAdmin()
  try {
    const client = getLocalClient()
    await client.controlContainer(containerId, 'start')
    await logSuccess(user.username, user.role, 'CONTAINER_START', containerId)
    return { success: true, containerId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'CONTAINER_START', errorMsg, containerId)
    console.error('Error starting container:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Останавливает Docker контейнер через локальный dashboard-agent
 * @requires ADMIN role
 */
export async function stopContainer(containerId: string) {
  const user = await requireAdmin()
  try {
    const client = getLocalClient()
    await client.controlContainer(containerId, 'stop')
    await logSuccess(user.username, user.role, 'CONTAINER_STOP', containerId)
    return { success: true, containerId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'CONTAINER_STOP', errorMsg, containerId)
    console.error('Error stopping container:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Перезапускает Docker контейнер через локальный dashboard-agent
 * @requires ADMIN role
 */
export async function restartContainer(containerId: string) {
  const user = await requireAdmin()
  try {
    const client = getLocalClient()
    await client.controlContainer(containerId, 'restart')
    await logSuccess(user.username, user.role, 'CONTAINER_RESTART', containerId)
    return { success: true, containerId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'CONTAINER_RESTART', errorMsg, containerId)
    console.error('Error restarting container:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Удаляет Docker контейнер
 * @requires ADMIN role
 * @deprecated Не поддерживается через agent API — обратитесь к dashboard-agent напрямую
 */
export async function removeContainer(containerId: string, force = false) {
  const user = await requireAdmin()
  await logFailure(user.username, user.role, 'CONTAINER_REMOVE', 'Not supported via agent API', containerId, { force })
  return { success: false, error: 'Container removal not supported via agent API' }
}

/**
 * Очистка неиспользуемых Docker образов
 * @requires ADMIN role
 * @deprecated Не поддерживается через agent API
 */
export async function pruneImages() {
  const user = await requireAdmin()
  await logFailure(user.username, user.role, 'IMAGE_PRUNE', 'Not supported via agent API')
  return { success: false, error: 'Image pruning not supported via agent API' }
}

/**
 * Удаляет Docker образ
 * @requires ADMIN role
 * @deprecated Не поддерживается через agent API
 */
export async function removeImage(imageId: string, force = false) {
  const user = await requireAdmin()
  await logFailure(user.username, user.role, 'IMAGE_REMOVE', 'Not supported via agent API', imageId, { force })
  return { success: false, error: 'Image removal not supported via agent API' }
}
