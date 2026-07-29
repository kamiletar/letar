/**
 * @letar/infra-config — единый источник инфраструктурной конфигурации монорепо.
 *
 * Здесь живёт канонический маппинг «приложение → сервер», адреса серверов, порты
 * агентов и HTTP-порты приложений (для health-check/межконтейнерных вызовов).
 * Импортируется:
 *   - libs/deploy-mcp (резолвинг сервера по приложению и target)
 *   - apps/dashboard напрямую (`app-metrics.ts` — APP_PORTS для health-check)
 *   - косвенно — apps/dashboard-agent через ЛОКАЛЬНЫЕ копии `src/lib/server-config.ts`
 *     и `src/lib/app-registry.ts` (его Dockerfile.production изолирован от монорепо и
 *     не видит libs/, поэтому импортировать этот пакет напрямую он не может — вместо
 *     этого копии сверяются с каноном guard-тестами `server-config.guard.spec.ts` и
 *     `app-registry.guard.spec.ts`).
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
  /** Порт dashboard-agent ВНУТРИ контейнера (REST API). Всегда 3100. */
  agentPort: number
  /**
   * Порт на ХОСТЕ сервера, на который опубликован dashboard-agent — цель SSH-туннеля
   * (`ssh -L <local>:localhost:<hostPort>`). Может отличаться от agentPort, если 3100
   * на хосте занят (на s3 его держит media-api → агент опубликован на 13103).
   */
  hostPort: number
  /** Роль сервера: production обслуживает боевой трафик, staging — предпрод/e2e. */
  role: 'production' | 'staging'
}

/** Реестр серверов. */
export const SERVERS: Record<InfraServer, ServerInfo> = {
  s2: {
    host: 's2.letar.best',
    sshUser: 'deploy',
    agentPort: 3100,
    hostPort: 3100,
    role: 'production',
  },
  s3: {
    // 188.127.235.141 — e2e-раннер + staging. host:3100 занят media-api (media-server),
    // поэтому dashboard-agent опубликован на 127.0.0.1:13103 (loopback — только SSH-туннель).
    host: 's3.letar.best',
    sshUser: 'deploy',
    agentPort: 3100,
    hostPort: 13103,
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
  studio: 's2',
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

/** Сервер, обслуживающий приложение в production. Fallback — s2. */
export function getServerForApp(app: string): InfraServer {
  return SERVER_APPS[app] ?? 's2'
}

/**
 * Приложения, подключённые к staging e2e-гейту (PLAN.md §18.7 Тираж M).
 *
 * Для каждого: `deploy_app(staging)` → `run_e2e` → зелёный прогон против реального
 * staging-контейнера (не placeholder/локальный dev-сервер). Сейчас используется только
 * как реестр (не читается кодом гейта — тот проверяет любое приложение). Warn-only:
 * приложения из этого списка не блокируются жёстче, чем не входящие в него — единственный
 * fail-closed механизм сейчас — `HARD_GATED_APPS` ниже.
 */
export const E2E_GATED_APPS: string[] = ['grandslamcup', 'time', 'aboi', 'aira-web', 'aprel8008']

/**
 * Приложения с ЖЁСТКИМ (fail-closed) pre-deploy e2e-гейтом (PLAN-INFRA.md §18.7,
 * инцидент archetest 2026-07-28, тред agent-mail `e2e-gate-hard-scope-5-commercial`).
 *
 * Отличие от `E2E_GATED_APPS` выше: это не тираж-реестр, а активный блокирующий список —
 * `deploy_app(production)` в `libs/deploy-mcp` ОТКАЗЫВАЕТ в деплое любого приложения
 * из этого списка, если e2e на staging не прошёл/не прогонялся/устарел/не на том коммите.
 * Владелец решил применить сразу ко всем пяти активным коммерческим приложениям, без
 * warn-only периода — реакция на прод-инцидент archetest v0.25.5 (сломанный рендер,
 * не пойманный HTTP-проверками деплоя).
 */
export const HARD_GATED_APPS: string[] = ['archetest', 'dsperevod', 'svoichuzhie', 'aboi', 'aprel8008']

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

/**
 * HTTP-порт, на котором приложение слушает запросы (dev/production — совпадают,
 * см. `.claude/rules/env-files.md`). Канон для двух ранее независимых копий:
 * `apps/dashboard/src/lib/app-metrics.ts` (health-check изнутри dashboard) и
 * `apps/dashboard-agent/src/lib/app-registry.ts` (межконтейнерные HTTP-вызовы cron/алертов).
 *
 * Список — union портов, известных обеим копиям на момент объединения (2026-07-30). Каждый
 * потребитель сам решает, какое подмножество приложений ему актуально опрашивать/вызывать —
 * этот реестр не диктует «кого включать», только «какой у кого порт».
 */
export const APP_PORTS: Record<string, number> = {
  dashboard: 3002,
  'driving-school': 3003,
  mandala: 3004,
  kami: 3005,
  'animatrona-landing': 3008,
  dsperevod: 3019,
  studio: 3024,
  'dashboard-agent': 3100,
}

/** HTTP-порт приложения из канона, если известен. */
export function getAppPort(app: string): number | undefined {
  return APP_PORTS[app]
}

/**
 * Docker container name (network alias в `kami-network`) приложения — то, как ДРУГИЕ контейнеры
 * сети видят это приложение. `localhost` внутри контейнера — это сам контейнер, а не хост и не
 * сосед по bridge-сети: `apps/dashboard/docker-compose.production.yml` подключает `dashboard-app`
 * к `kami-network` без `network_mode: host`, поэтому `fetch(http://localhost:<port>)` из
 * `app-metrics.ts` для любого приложения кроме самого dashboard молча возвращал
 * ECONNREFUSED/fetch failed (обнаружено 2026-07-30, проверено `docker exec dashboard-app`).
 *
 * Значения — либо фиксированный `container_name`, либо network alias из
 * `networks.kami-network.aliases` (rollout-профиль без `container_name`, см.
 * `.claude/docs/deployment.md`).
 *
 * ⚠️ Намеренно НЕТ записи для самоссылки (текущее приложение вызывает само себя): это
 * caller-specific случай — `dashboard` видит себя как `localhost` (тот же контейнер),
 * а `dashboard-agent` видит СЕБЯ тоже как `localhost`, но видит DASHBOARD как `dashboard-app`.
 * Единственно верный host для приложения зависит от того, кто спрашивает, поэтому канон хранит
 * только «истинное» сетевое имя контейнера; self-reference каждый вызывающий решает сам.
 */
export const APP_HOSTS: Record<string, string> = {
  dashboard: 'dashboard-app',
  'driving-school': 'driving-school-app',
  mandala: 'mandala-app',
  kami: 'kami-app',
  'animatrona-landing': 'animatrona-landing-app',
  dsperevod: 'dsperevod-app',
  studio: 'studio-app',
  'dashboard-agent': 'dashboard-agent',
}

/** Docker container name/alias приложения из канона. Fallback — `localhost` (dev-режим). */
export function getAppHost(app: string): string {
  return APP_HOSTS[app] ?? 'localhost'
}
