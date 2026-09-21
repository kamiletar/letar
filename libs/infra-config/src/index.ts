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
 * История: прежний s1 выведен из эксплуатации 2026-06-20. С 2026-09-19 имя `s1` снова занято —
 * новым сервером (сборка, staging, e2e, registry). Настоящий s3 (хранилище, media, IPFS,
 * GlitchTip) dashboard-agent не запускает и в этот реестр не входит: раньше роль «staging»
 * называлась `s3` по имени старого сервера, переименована в `s1` (PLAN-INFRA-6.md §188).
 */

import { hostname } from 'node:os'

/** Серверы, на которых крутятся приложения/агенты letar. */
export type InfraServer = 's1' | 's2'

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
   * на хосте занят (на s1 порт 3100 может быть занят → агент опубликован на 13103).
   */
  hostPort: number
  /** Роль сервера: production обслуживает боевой трафик, staging — предпрод/e2e. */
  role: 'production' | 'staging'
}

/** Реестр серверов. */
export const SERVERS: Record<InfraServer, ServerInfo> = {
  s1: {
    // Роль «staging + e2e-раннер» на сервере s1 (185.56.162.213). Ключ `s3` из реестра убран
    // намеренно: настоящий s3 (185.130.251.234) — хранилище без dashboard-agent, `deploy_app`/
    // `deploy_infra`/`run_e2e` на него не ходят (media-server, kubo и GlitchTip там обновляются
    // вручную по SSH). Порт 13103 — как был у staging-агента (compose и туннель не менялись).
    host: 's1.letar.best',
    sshUser: 'deploy',
    agentPort: 3100,
    hostPort: 13103,
    role: 'staging',
  },
  s2: {
    host: 's2.letar.best',
    sshUser: 'deploy',
    agentPort: 3100,
    hostPort: 3100,
    role: 'production',
  },
}

/**
 * Канонический маппинг «production-приложение → сервер».
 *
 * s1 сюда НЕ входит: это не сервер приложений, а staging-раннер. Резолвинг на s1
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
  domwellbes: 's2',
}

/** Сервер, обслуживающий приложение в production. Fallback — s2. */
export function getServerForApp(app: string): InfraServer {
  return SERVER_APPS[app] ?? 's2'
}

/**
 * Приложения, подключённые к staging e2e-гейту (PLAN.md §18.7 Тираж M).
 *
 * Для каждого: `deploy_app(staging)` → `run_e2e` → зелёный прогон против реального
 * staging-контейнера (не placeholder/локальный dev-сервер).
 *
 * Читается `evaluateE2eGate` в `libs/deploy-mcp` (§126 PLAN-INFRA-4.md, закрыто 2026-08-28):
 * `deploy_app(production)` проверяет e2e-статус ТОЛЬКО для приложений из этого списка — у
 * остальных нет staging-инфры, и предупреждение было бы чистым шумом. Warn-only: приложения
 * из этого списка (кроме `HARD_GATED_APPS`) не блокируются жёстче, чем отсутствие проверки —
 * единственный fail-closed механизм — `HARD_GATED_APPS` ниже, строгое подмножество этого списка.
 */
export const E2E_GATED_APPS: string[] = [
  'grandslamcup',
  'time',
  'aboi',
  'aira-web',
  'aprel8008',
  'domwellbes',
  'kami',
  'form-example',
  'svoichuzhie',
  'dsperevod',
  'archetest',
  'auth-hub',
  'driving-school',
  // studio добавлен 2026-08-28 задним числом: в HARD_GATED_APPS он с 2026-08-06, а сюда его
  // тогда не внесли — реестр молча врал, что staging-e2e у него нет, хотя инфраструктура
  // (`docker-compose.staging.yml`, порты s1 3032/5465) заведена и прогон 16/16 был зелёный.
  // Расхождение держалось три недели, потому что константу не читает никакой код.
  'studio',
  // mandala добавлен 2026-09-01: docker-compose.staging.yml + порты s1 заведены давно,
  // но полный прогон 123/123 без единого unexpected впервые получен только сейчас —
  // apps/mandala/PLAN_COMPLETED.md § Раунд 7—8 (accountId в seed, ненадёжный сид согласия
  // баннеров, гонка гидратации при клике по SSR-ссылкам).
  'mandala',
]

/**
 * Приложения с ЖЁСТКИМ (fail-closed) pre-deploy e2e-гейтом (PLAN-INFRA.md §18.7,
 * инцидент archetest 2026-07-28, тред agent-mail `e2e-gate-hard-scope-5-commercial`).
 *
 * Отличие от `E2E_GATED_APPS` выше: это не тираж-реестр, а активный блокирующий список —
 * `deploy_app(production)` в `libs/deploy-mcp` ОТКАЗЫВАЕТ в деплое любого приложения
 * из этого списка, если e2e на staging не прошёл/не прогонялся/устарел/не на том коммите.
 * Владелец решил применить сразу ко всем пяти активным коммерческим приложениям, без
 * warn-only периода — реакция на прод-инцидент archetest v0.25.5 (сломанный рендер,
 * не пойманный HTTP-проверками деплоя). `studio` добавлен позже (2026-08-06) — тоже
 * коммерческое приложение (тайм-трекинг и инвойсы владельца), изначально пропущено.
 *
 * `auth-hub` добавлен 2026-08-28 и выпадает из логики «коммерческое приложение»: это
 * Ключница, SSO для всех остальных. Сломанный деплой здесь не роняет одно приложение, а
 * закрывает вход во все сразу — то есть цена ошибки выше, чем у любого приложения из
 * списка, хотя выручки за ним нет. К моменту включения он уже был в `E2E_GATED_APPS`
 * (warn-only), имеет 18 тестов в четырёх spec-файлах, свой `docker-compose.staging.yml`
 * и зелёный последний прогон.
 *
 * Инвариант «этот список — подмножество `E2E_GATED_APPS`» закреплён тестом в `index.spec.ts`.
 * Без теста он уже разъезжался: `studio` три недели был здесь, но не там.
 */
export const HARD_GATED_APPS: string[] = [
  'archetest',
  'dsperevod',
  'svoichuzhie',
  'aboi',
  'aprel8008',
  'studio',
  'auth-hub',
]

/**
 * Определяет текущий сервер по env `SERVER_NAME` или hostname. Fallback — s2.
 * Ищет `s1` раньше `s2`; `s3` не распознаётся — на нём dashboard-agent не запускается.
 */
export function getCurrentServer(): InfraServer {
  const name = process.env.SERVER_NAME ?? ''
  if (name.includes('s1')) {
    return 's1'
  }
  if (name.includes('s2')) {
    return 's2'
  }
  const host = hostname()
  if (host.includes('s1')) {
    return 's1'
  }
  if (host.includes('s2')) {
    return 's2'
  }
  return 's2'
}

/**
 * Приложения, у которых production-СБОРКА идёт на s1, а на s2 выполняется только релиз
 * (PLAN-INFRA-6.md §157): `deploy-affected.sh --remote-release` на s1 собирает образ, пушит его в
 * registry и по ограниченному SSH-каналу зовёт `deploy-release-entry.sh` на s2.
 *
 * Список — переходный механизм (strangler): приложение включается после успешного пилота, откат —
 * убрать имя из списка. Когда в списке окажутся все приложения с `Dockerfile.production`, старый
 * однохостовый путь в `deploy-affected.sh` удаляется вместе с самим списком.
 *
 * ⚠️ `dashboard` и `dashboard-agent` сюда не входят и не могут входить: они перезапускают сами себя
 * (канал деплоя идёт через их же контейнер), release-фаза на s2 такие приложения отвергает.
 * ⚠️ Запуск СЕРВИСА остаётся на s2 (`SERVER_APPS` не меняется) — s1 только собирает.
 */
export const BUILD_ON_S1_APPS: string[] = []

/** Собирается ли приложение в production на s1 (см. `BUILD_ON_S1_APPS`). */
export function isBuiltOnS1(app: string): boolean {
  return BUILD_ON_S1_APPS.includes(app)
}

/** Цель деплоя: боевой сервер или staging. */
export type DeployTarget = 'production' | 'staging'

/**
 * Резолвит сервер, КОТОРОМУ отправляется запрос деплоя, с учётом target.
 * staging → всегда s1; production → s1 для приложений из `BUILD_ON_S1_APPS` (там идёт сборка и
 * оттуда запускается релиз на s2), иначе сервер приложения из SERVER_APPS.
 */
export function resolveDeployServer(app: string, target: DeployTarget = 'production'): InfraServer {
  if (target === 'staging' || isBuiltOnS1(app)) {
    return 's1'
  }
  return getServerForApp(app)
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
  time: 3013,
  svoichuzhie: 3021,
  dsperevod: 3019,
  aboi: 3018,
  studio: 3024,
  domwellbes: 3025,
  'dashboard-agent': 3100,
  'auth-hub': 3010,
  'animatrona-tracker': 3010,
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
  time: 'time-app',
  svoichuzhie: 'svoichuzhie-app',
  dsperevod: 'dsperevod-app',
  aboi: 'aboi-app',
  studio: 'studio-app',
  domwellbes: 'domwellbes-app',
  'dashboard-agent': 'dashboard-agent',
  'auth-hub': 'auth-hub-app',
  'animatrona-tracker': 'animatrona-tracker-app',
}

/** Docker container name/alias приложения из канона. Fallback — `localhost` (dev-режим). */
export function getAppHost(app: string): string {
  return APP_HOSTS[app] ?? 'localhost'
}
