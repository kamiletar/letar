/**
 * Конфигурация серверов
 * Единый источник маппинга приложений на серверы и определения текущего сервера
 *
 * s1 выведен из эксплуатации (2026-06-20, сервер больше не принадлежит letar).
 * s2 — s2.letar.best (все production-приложения)
 * s3 — 188.127.235.141: e2e-раннер + staging (управляется через deploy-mcp, не входит в SERVER_APPS)
 */

import { hostname } from 'os'

/** Сервер на котором выполняется задача */
export type CronServer = 's2' | 's3'

/** Полный маппинг приложений на серверы */
export const SERVER_APPS: Record<string, CronServer> = {
  'dashboard-agent': 's2',
  dashboard: 's2',
  'driving-school': 's2',
  archetest: 's2',
  'auth-hub': 's2',
  time: 's2',
  'form-example': 's2',
  'form-docs': 's2',
  grandslamcup: 's2',
  dsperevod: 's2',
  mandala: 's2',
  kami: 's2',
  pravda: 's2',
  'animatrona-landing': 's2',
  'animatrona-tracker': 's2',
  umami: 's2',
  aboi: 's2',
  svoichuzhie: 's2',
  aprel8008: 's2',
  'kami-key-the-landing': 's2',
  'letar-landing': 's2',
}

/** Получить сервер для приложения */
export function getServerForApp(app: string): CronServer {
  return SERVER_APPS[app] ?? 's2'
}

/**
 * Определяет текущий сервер: env SERVER_NAME → hostname → fallback s2
 */
export function getCurrentServer(): CronServer {
  // Приоритет: переменная окружения > hostname
  if (process.env.SERVER_NAME?.includes('s3')) {
    return 's3'
  }
  if (process.env.SERVER_NAME?.includes('s2')) {
    return 's2'
  }

  const host = hostname()
  if (host.includes('s3')) {
    return 's3'
  }
  if (host.includes('s2')) {
    return 's2'
  }

  console.warn(`[ServerConfig] Не удалось определить сервер из hostname "${host}", используем s2 по умолчанию`)
  return 's2'
}
