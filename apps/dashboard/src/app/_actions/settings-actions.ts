'use server'

import { type AlertSettings, getAlertSettings, saveAlertSettings } from '@/lib/alerts'
import { logFailure, logSuccess } from '@/lib/audit-log'
import { requireAdmin } from '@/lib/auth-utils'
import { type BackupSettings, getBackupSettings, saveBackupSettings } from '@/lib/backup-settings'

/**
 * Обновляет настройки алертов
 * @requires ADMIN role
 */
export async function updateAlertSettingsAction(settings: AlertSettings) {
  const user = await requireAdmin()

  try {
    await saveAlertSettings(settings)
    await logSuccess(user.username, user.role, 'SETTINGS_UPDATE', 'alert-settings')
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'SETTINGS_UPDATE', errorMsg, 'alert-settings')
    return { success: false, error: errorMsg }
  }
}

/**
 * Переключает состояние алертов (enabled/disabled)
 * @requires ADMIN role
 */
export async function toggleAlertsAction(enabled: boolean) {
  const user = await requireAdmin()

  try {
    const current = await getAlertSettings()
    await saveAlertSettings({ ...current, enabled })
    await logSuccess(user.username, user.role, enabled ? 'ALERTS_ENABLE' : 'ALERTS_DISABLE')
    return { success: true, enabled }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'ALERTS_TOGGLE', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Переключает Telegram уведомления
 * @requires ADMIN role
 */
export async function toggleTelegramAction(enabled: boolean) {
  const user = await requireAdmin()

  try {
    const current = await getAlertSettings()
    await saveAlertSettings({ ...current, telegramEnabled: enabled })
    await logSuccess(user.username, user.role, enabled ? 'TELEGRAM_ENABLE' : 'TELEGRAM_DISABLE')
    return { success: true, enabled }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'TELEGRAM_TOGGLE', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Обновляет настройки бэкапов
 * @requires ADMIN role
 */
export async function updateBackupSettingsAction(settings: BackupSettings) {
  const user = await requireAdmin()

  try {
    await saveBackupSettings(settings)
    await logSuccess(user.username, user.role, 'SETTINGS_UPDATE', 'backup-settings')
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'SETTINGS_UPDATE', errorMsg, 'backup-settings')
    return { success: false, error: errorMsg }
  }
}

/**
 * Переключает автоочистку бэкапов
 * @requires ADMIN role
 */
export async function toggleAutoCleanupAction(enabled: boolean) {
  const user = await requireAdmin()

  try {
    const current = await getBackupSettings()
    await saveBackupSettings({ ...current, autoCleanupEnabled: enabled })
    await logSuccess(user.username, user.role, enabled ? 'AUTO_CLEANUP_ENABLE' : 'AUTO_CLEANUP_DISABLE')
    return { success: true, enabled }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'AUTO_CLEANUP_TOGGLE', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Управляет мониторингом (start/stop/restart)
 * @requires ADMIN role
 */
export async function controlMonitoringAction(_action: 'start' | 'stop' | 'restart') {
  return { success: false, error: 'Monitoring control moved to dashboard-agent' }
}

/**
 * Тестирует Telegram уведомления
 * @requires ADMIN role
 */
export async function testTelegramAction() {
  const user = await requireAdmin()

  try {
    const settings = await getAlertSettings()

    if (!settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
      return { success: false, error: 'Telegram не настроен' }
    }

    // api.telegram.org заблокирован провайдером ДЦ на s1/s2 — проксируем через tg-proxy.letar.best
    // (mail сервер, NL). См. .claude/docs/deployment.md § «Telegram API — прокси через mail сервер».
    const telegramApiRoot = process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org'
    const response = await fetch(`${telegramApiRoot}/bot${settings.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegramChatId,
        text: '🔔 Тестовое уведомление от Dashboard\n\nЕсли вы видите это сообщение, Telegram уведомления работают корректно.',
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.description || 'Telegram API error')
    }

    await logSuccess(user.username, user.role, 'TELEGRAM_TEST')
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logFailure(user.username, user.role, 'TELEGRAM_TEST', errorMsg)
    return { success: false, error: errorMsg }
  }
}
