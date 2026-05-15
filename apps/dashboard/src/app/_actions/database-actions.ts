'use server'

import { logFailure, logSuccess } from '@/lib/audit-log'
import { requireAdmin } from '@/lib/auth-utils'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'

/**
 * Создает бэкап БД через dashboard-agent API
 */
export async function createBackup(dbName: string, _type: 'manual' | 'auto' = 'manual', serverId?: string | null) {
  const user = await requireAdmin()

  try {
    const { client } = await getClientByServerId(serverId ?? null)
    const result = await client.createBackup(dbName)

    if (result.summary.failed > 0) {
      const failedDb = result.results.find((r) => !r.success)
      await logFailure(user.username, user.role, 'BACKUP_CREATE', failedDb?.error ?? 'Backup failed')
      return { success: false, error: failedDb?.error ?? 'Бэкап не удался' }
    }

    await logSuccess(user.username, user.role, 'BACKUP_CREATE', `Backup created: ${dbName}`)
    return { success: true, data: result.results[0] }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'BACKUP_CREATE', message)
    return { success: false, error: message }
  }
}

/**
 * Восстанавливает БД из бэкапа
 * @deprecated Не поддерживается через agent API
 */
export async function restoreBackup(_dbName: string, _backupId: string) {
  const user = await requireAdmin()
  await logFailure(user.username, user.role, 'BACKUP_RESTORE', 'Not supported via agent API')
  return { success: false, error: 'Database restore not available via agent API.' }
}

/**
 * Удаляет бэкап
 * @deprecated Не поддерживается через agent API
 */
export async function removeBackup(_backupId: string) {
  const user = await requireAdmin()
  await logFailure(user.username, user.role, 'BACKUP_DELETE', 'Not supported via agent API')
  return { success: false, error: 'Backup deletion not available via agent API.' }
}

/**
 * Выполняет миграции БД для приложения
 * @deprecated Не поддерживается через agent API
 */
export async function executeMigrations(_appName: string, _serverId?: string | null) {
  const user = await requireAdmin()
  await logFailure(user.username, user.role, 'MIGRATION_RUN', 'Not supported via agent API')
  return { success: false, error: 'Migrations not available via agent API.' }
}
