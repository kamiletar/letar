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
  'aira-web': 's2',
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
  // pravda добавлен 2026-09-22 после первого подтверждённого прогона на staging (коммит
  // e61e2cbae, 223 passed / 9 failed / 5 flaky из 240). Все оставшиеся падения — в двух уже
  // принятых владельцем кластерах, не новые баги: RSC-навигация Firefox/WebKit (апстрим-баг
  // Next.js vercel/next.js#85374, включая bookmarks.spec.ts:132 — диагностирован как тот же
  // кластер) и скролл/прогресс-кластер (решение владельца 2026-09-01 не диагностировать и не
  // чинить). Разбор — apps/pravda/PLAN.md, тред agent-mail `pravda-e2e-first-run-failures`.
  'pravda',
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
 *
 * ⚠️ **2026-09-22: уравнен с `E2E_GATED_APPS` целиком** — владелец: «всё, что деплоится на
 * прод, должно перед этим проходить e2e», warn-only как постоянное состояние для приложения
 * с уже готовой staging-инфрой поэтому больше не держим. Добавлены `grandslamcup`, `time`,
 * `aira-web`, `domwellbes`, `kami`, `form-example`, `driving-school`, `mandala` — у каждого уже
 * есть `docker-compose.staging.yml` и как минимум один зелёный прогон на s1 (проверено перед
 * правкой через `e2e_status`, часть прогонов на 2026-09-19 и раньше, `aboi` — 2026-09-21).
 * Не значит «навсегда одним списком»: `HARD_GATED_APPS` остаётся строгим подмножеством
 * `E2E_GATED_APPS` по инварианту теста, просто сейчас оба списка совпадают буквально —
 * следующее приложение сначала попадает в `E2E_GATED_APPS` (набирает историю зелёных
 * прогонов), потом уже сюда, см. комментарий у `E2E_GATED_APPS` выше.
 *
 * Приложения БЕЗ staging-инфры/e2e-suite (пока не могут попасть ни в один из списков) —
 * `dashboard-agent`, `dashboard` (нет staging-compose и не может быть: перезапускают сами
 * себя), `umami` (сторонний продукт). Приложения с e2e-suite и docker-compose.staging.yml
 * (заведены 2026-09-22, коммит `11c63e014`), но БЕЗ подтверждённого зелёного прогона на s1 —
 * `form-docs`, `animatrona-landing`, `kami-key-the-landing`, `letar-landing`. `animatrona-tracker`
 * — есть e2e-suite, staging-compose не заведён (БД+Redis+Better Auth OIDC через Ключницу,
 * отдельная проработка). `pravda` зарегистрирован в `E2E_GATED_APPS` 2026-09-22 после первого
 * зелёного прогона (см. комментарий там) — в `HARD_GATED_APPS` не входит, ждёт истории прогонов.
 */
export const HARD_GATED_APPS: string[] = [
  'archetest',
  'dsperevod',
  'svoichuzhie',
  'aboi',
  'aprel8008',
  'studio',
  'auth-hub',
  'grandslamcup',
  'time',
  'aira-web',
  'domwellbes',
  'kami',
  'form-example',
  'driving-school',
  'mandala',
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
 *
 * ⚠️ Форма записи — контракт. MCP `letar` (`deploy_app`) читает ЭТОТ файл текстом при каждом
 * production-деплое и разбирает массив как литерал строк (`libs/deploy-mcp/src/build-on-s1.ts`):
 * так добавление приложения действует сразу, без перезапуска процесса. Держи список литералом
 * `['app-a', 'app-b']` — spread, константы и вычисления разбор отвергнет, и `deploy_app` откажет с
 * пояснением (не откатится молча на s2). Охранный тест — `build-on-s1.spec.ts` в deploy-mcp.
 *
 * Пилот 3 (2026-09-22, пройден на 4-й попытке): `grandslamcup` — три страницы (`[citySlug]/donate`,
 * `/news`, `/rules`) + главная/`bracket`/`organizers`/`presenters`/`scorers` тянут `prisma.city.findMany`
 * в `generateStaticParams` без `force-dynamic`/`headers()`/`auth()` — доказано `●` SSG с реальными
 * путями `/moskva/...`/`/spb/...` в таблице маршрутов сборки на s1. `kami` (попытка 1) и `mandala`
 * (попытка 2) технически прошли, но критерий не подтвердили (динамический `/sitemap.xml` и
 * `force-dynamic` на кандидатных страницах соответственно) — обе остались в списке, но пилот
 * закрыт именно на grandslamcup. Разбор — `PLAN-INFRA-6.md` §157.
 * Пилот 4 (2026-09-22, пройден): `domwellbes` — первая живая проверка канала `dump`/
 * `prisma migrate deploy` через туннель s1→s2 на реально отложенной миграции. Прод-БД (`letar-db`,
 * `domwellbes-prod`) подтвердила непримененную миграцию заранее — гарантированно нашлось что
 * применить, не гипотеза по файловой системе. Лог подтвердил применение конкретной миграции.
 * Детали миграции — в приватном `apps/domwellbes/PLAN.md` (`public-repo-hygiene.md`).
 * Пилот 2 (2026-09-21, пройден): `time` — с БД, без пререндера из неё.
 * Пилот 1 (2026-09-21, пройден): `letar-landing` — приложение без БД. Аварийного однохостового пути нет:
 * при недоступности s1/registry деплой не выполняется, откат — убрать имя из списка.
 *
 * Все четыре канала (build/release, туннель к прод-БД, SSG-пререндер из БД, живая миграция)
 * подтверждены пилотами 1–4 — с этого момента список тиражируется на остальные приложения без
 * новых пилотов, только по критерию «чистый `typecheck:tsgo --skip-nx-cache` локально».
 *
 * Волна 1 тиража (2026-09-22): 8 приложений с подтверждённым чистым typecheck —
 * `aira-web`, `animatrona-landing`, `animatrona-tracker`, `driving-school`, `form-docs`,
 * `form-example`, `kami-key-the-landing`, `pravda`. `animatrona-tracker` потребовал
 * предварительного фикса TS2321 (коммит `ba8619f32`). Исключены из рассмотрения: Electron/React
 * Native приложения, `dashboard`/`dashboard-agent` (см. предупреждение выше), приложения без
 * `docker-compose.production.yml`.
 *
 * Волна 2 (2026-09-22, тот же день, отдельное решение владельца): «перенос сборки нужен для
 * всех приложений» — добавлены оставшиеся 7 с собственным `Dockerfile.production` —
 * `archetest`, `dsperevod`, `studio`, `aboi`, `svoichuzhie`, `aprel8008`, `auth-hub` (все семь —
 * `HARD_GATED_APPS`, typecheck чист у каждого, проверено перед добавлением). Тест
 * `index.spec.ts` — прежде закреплявший, что hard-gated приложения обязаны оставаться на
 * `SERVER_APPS`-хосте — сужен: защита остаётся для будущих hard-gated приложений, которые ещё
 * не прошли явное решение о переносе, а не для списка целиком (см. коммент у `HARD_GATED_APPS`
 * выше). Не перенесены: `dashboard`/`dashboard-agent` (технически не могут — перезапускают сами
 * себя по каналу деплоя), `umami` (стоковый образ `ghcr.io/umami-software/umami`, у нас нет
 * своего `Dockerfile.production` — переносить нечего).
 */
export const BUILD_ON_S1_APPS: string[] = [
  'letar-landing',
  'time',
  'kami',
  'mandala',
  'grandslamcup',
  'domwellbes',
  'aira-web',
  'archetest',
  'dsperevod',
  'studio',
  'aboi',
  'svoichuzhie',
  'aprel8008',
  'auth-hub',
  'animatrona-landing',
  'animatrona-tracker',
  'driving-school',
  'form-docs',
  'form-example',
  'kami-key-the-landing',
  'pravda',
]

/**
 * Собирается ли приложение в production на s1 (см. `BUILD_ON_S1_APPS`).
 * `buildOnS1Apps` — актуальный список вместо значения, вычисленного при импорте модуля: долгоживущий
 * процесс (MCP `letar`) передаёт сюда свежепрочитанный из файла, см. `libs/deploy-mcp/src/build-on-s1.ts`.
 */
export function isBuiltOnS1(app: string, buildOnS1Apps: readonly string[] = BUILD_ON_S1_APPS): boolean {
  return buildOnS1Apps.includes(app)
}

/** Цель деплоя: боевой сервер или staging. */
export type DeployTarget = 'production' | 'staging'

/**
 * Резолвит сервер, КОТОРОМУ отправляется запрос деплоя, с учётом target.
 * staging → всегда s1; production → s1 для приложений из `BUILD_ON_S1_APPS` (там идёт сборка и
 * оттуда запускается релиз на s2), иначе сервер приложения из SERVER_APPS.
 * `buildOnS1Apps` — см. `isBuiltOnS1`.
 */
export function resolveDeployServer(
  app: string,
  target: DeployTarget = 'production',
  buildOnS1Apps: readonly string[] = BUILD_ON_S1_APPS,
): InfraServer {
  if (target === 'staging' || isBuiltOnS1(app, buildOnS1Apps)) {
    return 's1'
  }
  return getServerForApp(app)
}

/**
 * HTTP-порт **production-контейнера** приложения — тот, на котором оно слушает внутри
 * `kami-network`. Это НЕ dev-порт: у большинства приложений они случайно совпадают, но не
 * обязаны (`animatrona-tracker` — dev 3009 в `.env`, контейнер 3010; `auth-hub` — dev 3014,
 * контейнер 3010). Dev-порт живёт в `apps/<app>/.env` (`.env.local`, CLI-команда в
 * `project.json`) и сверяется отдельно guard-тестом `app-ports.guard.spec.ts` — этот реестр
 * его не читает и для dev-адреса не годится.
 *
 * Канон для двух ранее независимых копий: `apps/dashboard/src/lib/app-metrics.ts`
 * (health-check изнутри dashboard) и `apps/dashboard-agent/src/lib/app-registry.ts`
 * (межконтейнерные HTTP-вызовы cron/алертов) — обе ходят в production-контейнер.
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
