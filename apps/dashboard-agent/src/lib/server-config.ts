/**
 * Конфигурация серверов + реестр приложений dashboard-agent
 * Единый источник: сервер каждого приложения, и (для тех, кого dashboard-agent
 * вызывает по HTTP) порт/host — ОДИН объект `APP_REGISTRY` вместо трёх параллельных
 * Record'ов (`SERVER_APPS` + `APP_PORTS` + `APP_HOSTS`, история — PLAN.md Backlog
 * «Регистрация нового приложения разбросана по 3 местам»). `APP_PORTS`/`APP_HOSTS`
 * ниже — производные экспорты для обратной совместимости (`app-registry.ts`,
 * guard-тесты), сам объект правится в одном месте.
 *
 * s1 выведен из эксплуатации (2026-06-20, сервер больше не принадлежит letar).
 * s2 — s2.letar.best (все production-приложения)
 * s3 — 188.127.235.141: e2e-раннер + staging (управляется через deploy-mcp, не входит в SERVER_APPS)
 *
 * `port`/`host` — ЛОКАЛЬНАЯ копия подмножества канона `APP_PORTS`/`APP_HOSTS` из
 * `@letar/infra-config` (только те приложения, кого dashboard-agent реально вызывает
 * по HTTP). Копия, а не импорт — см. заголовок `server-config.guard.spec.ts` рядом
 * (Dockerfile.production изолирован от монорепо). Дрейф значений от канона ловят
 * `server-config.guard.spec.ts` (сервер) и `app-registry.guard.spec.ts` (порт/host).
 */

import { hostname } from 'os'

/** Сервер на котором выполняется задача */
export type CronServer = 's2' | 's3'

interface AppRegistryEntry {
  server: CronServer
  /** Задан только для приложений, которых dashboard-agent вызывает по HTTP (cron/алерты). */
  port?: number
  /** Docker container name внутри `kami-network`. `dashboard-agent` — self-reference на localhost. */
  host?: string
}

/** Единый реестр приложений: сервер + (опционально) HTTP-адрес. */
const APP_REGISTRY: Record<string, AppRegistryEntry> = {
  'dashboard-agent': { server: 's2', port: 3100, host: 'localhost' },
  dashboard: { server: 's2', port: 3002, host: process.env.DASHBOARD_HOST ?? 'dashboard-app' },
  'driving-school': { server: 's2', port: 3003, host: process.env.DRIVING_SCHOOL_HOST ?? 'driving-school-app' },
  mandala: { server: 's2', port: 3004, host: process.env.MANDALA_HOST ?? 'mandala-app' },
  kami: { server: 's2', port: 3005, host: process.env.KAMI_HOST ?? 'kami-app' },
  dsperevod: { server: 's2', port: 3019, host: process.env.DSPEREVOD_HOST ?? 'dsperevod-app' },
  studio: { server: 's2', port: 3024, host: process.env.STUDIO_HOST ?? 'studio-app' },
  archetest: { server: 's2' },
  'auth-hub': { server: 's2' },
  time: { server: 's2' },
  'form-example': { server: 's2' },
  'form-docs': { server: 's2' },
  grandslamcup: { server: 's2' },
  pravda: { server: 's2' },
  'animatrona-landing': { server: 's2' },
  'animatrona-tracker': { server: 's2' },
  umami: { server: 's2' },
  aboi: { server: 's2', port: 3018, host: process.env.ABOI_HOST ?? 'aboi-app' },
  svoichuzhie: { server: 's2' },
  aprel8008: { server: 's2' },
  'kami-key-the-landing': { server: 's2' },
  'letar-landing': { server: 's2' },
  domwellbes: { server: 's2', port: 3025, host: process.env.DOMWELLBES_HOST ?? 'domwellbes-app' },
}

/** Полный маппинг приложений на серверы (производное от `APP_REGISTRY`). */
export const SERVER_APPS: Record<string, CronServer> = Object.fromEntries(
  Object.entries(APP_REGISTRY).map(([app, entry]) => [app, entry.server]),
)

/** Получить сервер для приложения */
export function getServerForApp(app: string): CronServer {
  return APP_REGISTRY[app]?.server ?? 's2'
}

/** Карта портов приложений, известных dashboard-agent (производное от `APP_REGISTRY`). */
export const APP_PORTS: Record<string, number> = Object.fromEntries(
  Object.entries(APP_REGISTRY)
    .filter((entry): entry is [string, AppRegistryEntry & { port: number }] => entry[1].port !== undefined)
    .map(([app, entry]) => [app, entry.port]),
)

/** Карта хостов приложений, известных dashboard-agent (производное от `APP_REGISTRY`). */
export const APP_HOSTS: Record<string, string> = Object.fromEntries(
  Object.entries(APP_REGISTRY)
    .filter((entry): entry is [string, AppRegistryEntry & { host: string }] => entry[1].host !== undefined)
    .map(([app, entry]) => [app, entry.host]),
)

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
