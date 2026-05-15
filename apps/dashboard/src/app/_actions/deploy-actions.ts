'use server'

import { logFailure, logSuccess } from '@/lib/audit-log'
import { requireAdmin } from '@/lib/auth-utils'
import { getLocalClient } from '@/lib/server-client'

/**
 * Запускает деплой приложения через dashboard-agent
 * @requires ADMIN role
 */
export async function deployApp(app?: string, _dryRun = false) {
  const user = await requireAdmin()
  try {
    const client = getLocalClient()
    const result = await client.deployApp!(app || 'all')

    await logSuccess(user.username, user.role, 'DEPLOY_START', app || 'all', { started: result.started })
    return {
      success: true,
      ...result,
      message: `Deploy started${app ? ` for ${app}` : ''}`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'DEPLOY_START', errorMsg, app || 'all', {})
    console.error('Error deploying app:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Останавливает деплой через dashboard-agent
 * @requires ADMIN role
 */
export async function stopDeploy(_pid: number) {
  const user = await requireAdmin()
  try {
    const client = getLocalClient()
    const result = await client.cancelDeploy!()

    if (result.cancelled) {
      await logSuccess(user.username, user.role, 'DEPLOY_STOP', undefined, {})
    } else {
      await logFailure(user.username, user.role, 'DEPLOY_STOP', 'No running deploy found', undefined, {})
    }

    return {
      success: result.cancelled,
      message: result.cancelled ? 'Deploy stopped' : 'No running deploy found',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'DEPLOY_STOP', errorMsg, undefined, {})
    console.error('Error stopping deploy:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Получение affected приложений не поддерживается через агент
 */
export async function getAffectedApps() {
  return { success: false, error: 'Not supported via agent API', apps: [] as string[] }
}
