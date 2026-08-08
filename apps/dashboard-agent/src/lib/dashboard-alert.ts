/**
 * Общий helper для POST /api/alerts в dashboard — раньше был продублирован в `cron.ts`
 * (`notifyDashboardAlert`) и `email-canary.ts` (`notifyCanaryAlert`), каждый со своей
 * копией URL-конструирования и fetch-обвязки. Теперь единая точка.
 */

import { getAppUrl } from './app-registry'
import { getAppCronSecret } from './app-secrets'

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
 *
 * Возвращает `true`, только если dashboard подтвердил приём (2xx). Вызывающему это нужно, чтобы
 * отличить «уведомили» от «попытались уведомить»: §62 — канарейка 17 дней держала в состоянии
 * `alerted: true`, тогда как в БД dashboard не появилось ни одной записи Alert. Проглоченная
 * здесь ошибка выглядела снаружи неотличимо от успеха, поэтому повторять было некому.
 */
export async function postDashboardAlert(alert: DashboardAlert): Promise<boolean> {
  try {
    // Секрет `dashboard`, а не агента (PLAN-INFRA.md §52). Совпадение этих двух значений на
    // сегодня — историческая случайность, полагаться на неё нельзя: ротация секрета в dashboard
    // оборвала бы канал алертов целиком, причём молча — ошибки отсюда только логируются.
    const cronSecret = getAppCronSecret('dashboard')
    if (!cronSecret) {
      console.error(
        '[DashboardAlert] CRON_SECRET для dashboard недоступен (/secrets/dashboard.env) — alert не отправлен',
      )
      return false
    }

    const url = getAppUrl('dashboard', '/api/alerts')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': cronSecret,
      },
      body: JSON.stringify(alert),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    // Результат обязан быть проверен: это последний сторож в цепочке, и молчать ему нельзя.
    // Раньше ответ игнорировался — не-2xx уходил в тишину, неотличимую от успеха. Именно так
    // выглядела восьмидневная тишина §52: провалы cron были, а `CRON_FAILED` не появился ни разу,
    // и по логам нельзя было отличить «alert не отправляли» от «отправили, но его отвергли».
    if (!response.ok) {
      let body = ''
      try {
        body = (await response.text()).slice(0, 500)
      } catch {
        // Тело недоступно — статуса всё равно достаточно, чтобы отличить отказ от тишины
      }
      console.error(
        `[DashboardAlert] dashboard отверг alert ${alert.type}: HTTP ${response.status} ${response.statusText}. Ответ: ${body}`,
      )
      return false
    }

    return true
  } catch (error) {
    console.error('[DashboardAlert] Не удалось отправить alert в dashboard:', error)
    return false
  }
}
