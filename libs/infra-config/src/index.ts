/**
 * @letar/infra-config — единый источник инфраструктурной конфигурации монорепо.
 *
 * Здесь живёт канонический маппинг «приложение → сервер», адреса серверов и порты
 * агентов. Импортируется:
 *   - libs/deploy-mcp (резолвинг сервера по приложению и target)
 *   - косвенно — apps/dashboard-agent через ЛОКАЛЬНУЮ копию `src/lib/server-config.ts`
 *     (его Dockerfile.production изолирован от монорепо и не видит libs/, поэтому
 *     импортировать этот пакет напрямую он не может — вместо этого копия сверяется с
 *     каноном guard-тестом `src/lib/server-config.guard.spec.ts`).
 *
 * ⚠️ Bash-скрипт `deploy-affected.sh` держит СВОЙ список серверных приложений
 * (`S2_APPS`, строка ~107). Он НЕ импортирует этот файл (bash ≠ TS). При изменении
 * `SERVER_APPS` синхронизируй оба вручную — дрейф ловится на ревью.
 *
 * История: s1 выведен из эксплуатации 2026-06-20 (сервер больше не принадлежит letar).
 */

import { hostname } from 'node:os'

/** Серверы, на которых крутятся приложения/агенты letar. */
export type InfraServer = 's2' | 's3'

/**
 * Обратная совместимость с прежним именем типа в dashboard-agent.
 * @deprecated используй `InfraServer`
 */
export type CronServer = InfraServer

/** Метаданные сервера. */
export interface ServerInfo {
  /** Хост для SSH и внутренних обращений. */
  host: string
  /** SSH-пользователь для деплой-операций. */
  sshUser: string
  /** Порт dashboard-agent (REST API) на этом сервере. */
  agentPort: number
  /** Роль сервера: production обслуживает боевой трафик, staging — предпрод/e2e. */
  role: 'production' | 'staging'
}

/** Реестр серверов. */
export const SERVERS: Record<InfraServer, ServerInfo> = {
  s2: {
    host: 's2.letar.best',
    sshUser: 'deploy',
    agentPort: 3100,
    role: 'production',
  },
  s3: {
    // 188.127.235.141 — e2e-раннер + staging
    host: 's3.letar.best',
    sshUser: 'deploy',
    agentPort: 3100,
    role: 'staging',
  },
}

/**
 * Канонический маппинг «production-приложение → сервер».
 *
 * s3 сюда НЕ входит: это не сервер приложений, а staging-раннер. Резолвинг на s3
 * происходит по target='staging' в `resolveDeployServer()`, а не по этому маппингу.
 */
export const SERVER_APPS: Record<string, InfraServer> = {
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
  'premium-rosstil': 's2',
  imot: 's2',
}

/** Сервер, обслуживающий приложение в production. Fallback — s2. */
export function getServerForApp(app: string): InfraServer {
  return SERVER_APPS[app] ?? 's2'
}

/**
 * Определяет текущий сервер по env `SERVER_NAME` или hostname. Fallback — s2.
 * (Раньше fallback был s1 — сервер выведен из эксплуатации.)
 */
export function getCurrentServer(): InfraServer {
  const name = process.env.SERVER_NAME ?? ''
  if (name.includes('s3')) {
    return 's3'
  }
  if (name.includes('s2')) {
    return 's2'
  }
  const host = hostname()
  if (host.includes('s3')) {
    return 's3'
  }
  if (host.includes('s2')) {
    return 's2'
  }
  return 's2'
}

/** Цель деплоя: боевой сервер или staging. */
export type DeployTarget = 'production' | 'staging'

/**
 * Резолвит сервер для деплоя приложения с учётом target.
 * production → сервер приложения из SERVER_APPS; staging → всегда s3.
 */
export function resolveDeployServer(app: string, target: DeployTarget = 'production'): InfraServer {
  return target === 'staging' ? 's3' : getServerForApp(app)
}
