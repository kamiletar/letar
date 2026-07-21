/**
 * Общий helper для POST /api/alerts в dashboard — раньше был продублирован в `cron.ts`
 * (`notifyDashboardAlert`) и `email-canary.ts` (`notifyCanaryAlert`), каждый со своей
 * копией URL-конструирования и fetch-обвязки. Теперь единая точка.
 */

import { getAppUrl } from './app-registry'

export type DashboardAlertType =
  | 'CPU_HIGH'
  | 'MEMORY_HIGH'
  | 'DISK_HIGH'
  | 'CONTAINER_DOWN'
  | 'CONTAINER_RESTARTED'
  | 'DATABASE_DOWN'
  | 'DEPLOY_FAILED'
  | 'BACKUP_FAILED'
  | 'CRON_FAILED'

export type DashboardAlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface DashboardAlert {
  type: DashboardAlertType
  severity: DashboardAlertSeverity
  title: string
  message: string
  metadata?: Record<string, unknown>
}

/**
 * Уведомляет dashboard о проблеме (создаёт Alert, dashboard сам решает — слать ли в Telegram
 * по своим AlertSettings). Ошибки самого уведомления никогда не бросаются наружу — только
 * логируются, чтобы не ронять вызывающую задачу из-за недоступности dashboard.
 */
export async function postDashboardAlert(alert: DashboardAlert): Promise<void> {
  try {
    const url = getAppUrl('dashboard', '/api/alerts')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': process.env.CRON_SECRET || 'default-cron-secret',
      },
      body: JSON.stringify(alert),
      signal: controller.signal,
    })

    clearTimeout(timeout)
  } catch (error) {
    console.error('[DashboardAlert] Не удалось отправить alert в dashboard:', error)
  }
}
