/**
 * Конфигурация серверов
 * Единый источник маппинга приложений на серверы и определения текущего сервера
 */

import { hostname } from 'os'

/**
 * Сервер на котором выполняется задача
 * s1 — s1.letar.best (premium-rosstil, imot, mandala, kami, pravda, animatrona-landing, animatrona-tracker, umami)
 * s2 — s2.letar.best (dashboard, driving-school, archetest, auth-hub, grandslamcup, time, form-example, form-docs)
 */
export type CronServer = 's1' | 's2'

/** Полный маппинг приложений на серверы */
export const SERVER_APPS: Record<string, CronServer> = {
  'premium-rosstil': 's1',
  imot: 's1',
  mandala: 's1',
  kami: 's1',
  pravda: 's1',
  'animatrona-landing': 's1',
  'dashboard-agent': 's1',
  umami: 's1',
  'animatrona-tracker': 's1',
  dashboard: 's2',
  'driving-school': 's2',
  archetest: 's2',
  'auth-hub': 's2',
  time: 's2',
  'form-example': 's2',
  'form-docs': 's2',
  grandslamcup: 's2',
  dsperevod: 's2',
}

/** Получить сервер для приложения */
export function getServerForApp(app: string): CronServer {
  return SERVER_APPS[app] ?? 's1'
}

/**
 * Определяет текущий сервер: env SERVER_NAME → hostname → fallback
 */
export function getCurrentServer(): CronServer {
  // Приоритет: переменная окружения > hostname
  if (process.env.SERVER_NAME?.includes('s1')) {
    return 's1'
  }
  if (process.env.SERVER_NAME?.includes('s2')) {
    return 's2'
  }

  const host = hostname()
  if (host.includes('s1')) {
    return 's1'
  }
  if (host.includes('s2')) {
    return 's2'
  }

  // Dashboard-agent обычно на s1
  console.warn(`[ServerConfig] Не удалось определить сервер из hostname "${host}", используем s1 по умолчанию`)
  return 's1'
}
