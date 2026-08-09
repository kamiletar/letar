# @letar/infra-config

Единый источник инфраструктурной конфигурации монорепо: канонический маппинг «приложение →
сервер», адреса серверов, порты агентов и HTTP-порты приложений (для health-check и
межконтейнерных вызовов). Никаких секретов — только статическая топология.

Потребители: `libs/deploy-mcp` (резолвинг сервера по приложению и `target`), `apps/dashboard`
(`app-metrics.ts` — health-check по `APP_PORTS`). `apps/dashboard-agent` не может импортировать
пакет напрямую — его `Dockerfile.production` изолирован от монорепо и не видит `libs/`, поэтому
там лежат ЛОКАЛЬНЫЕ копии (`src/lib/server-config.ts`, `src/lib/app-registry.ts`), сверяемые с
каноном guard-тестами (`server-config.guard.spec.ts`, `app-registry.guard.spec.ts`).

⚠️ Bash-скрипт `deploy-affected.sh` держит СВОЙ список серверных приложений (`S2_APPS`) — он
не импортирует этот файл (bash ≠ TS). При изменении `SERVER_APPS` синхронизируй оба вручную.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { getServerForApp, resolveDeployServer, SERVERS } from '@letar/infra-config'
```

## API

### Серверы

```typescript
export type InfraServer = 's2' | 's3'

export interface ServerInfo {
  host: string // хост для SSH и внутренних обращений
  sshUser: string
  agentPort: number // порт dashboard-agent внутри контейнера — всегда 3100
  hostPort: number // порт на ХОСТЕ сервера — цель SSH-туннеля, может отличаться от agentPort
  role: 'production' | 'staging'
}

export const SERVERS: Record<InfraServer, ServerInfo>
```

`s2` — production (`s2.letar.best`, `hostPort: 3100`). `s3` — staging + e2e-раннер
(`s3.letar.best`, `hostPort: 13103` — на хосте порт 3100 занят media-api).

### Маппинг приложений

```typescript
export const SERVER_APPS: Record<string, InfraServer>

/** Сервер, обслуживающий приложение в production. Fallback — s2. */
export function getServerForApp(app: string): InfraServer

/** production → сервер из SERVER_APPS; staging → всегда s3. */
export function resolveDeployServer(app: string, target: DeployTarget = 'production'): InfraServer
```

```typescript
// libs/deploy-mcp/src/config.ts
import { type InfraServer, SERVERS } from '@letar/infra-config'

export const TUNNEL_PORTS: Record<InfraServer, number> = {
  s2: 13100,
  s3: 13101,
}
```

`s3` в `SERVER_APPS` намеренно не входит — это не сервер приложений, а staging-раннер;
резолвинг на него идёт по `target === 'staging'` в `resolveDeployServer()`.

### e2e-гейты

```typescript
/** Реестр приложений на staging e2e-гейте. Warn-only, только реестр — не читается кодом гейта. */
export const E2E_GATED_APPS: string[]

/**
 * Fail-closed pre-deploy гейт: `deploy_app(production)` в libs/deploy-mcp ОТКАЗЫВАЕТ
 * в деплое приложения из этого списка, если e2e на staging не прошёл/не прогонялся/
 * устарел/не на том коммите.
 */
export const HARD_GATED_APPS: string[] // archetest, dsperevod, svoichuzhie, aboi, aprel8008, studio
```

### Текущий сервер (рантайм внутри контейнера)

```typescript
/** По env SERVER_NAME или hostname контейнера. Fallback — s2. */
export function getCurrentServer(): InfraServer
```

### HTTP-порты и Docker-имена контейнеров

```typescript
export const APP_PORTS: Record<string, number>
export function getAppPort(app: string): number | undefined

export const APP_HOSTS: Record<string, string> // container_name / network alias в kami-network
export function getAppHost(app: string): string // fallback — 'localhost' (dev-режим)
```

`APP_HOSTS` — как ДРУГИЕ контейнеры сети видят приложение (`localhost` внутри контейнера —
это сам контейнер, а не сосед по bridge-сети). Намеренно нет записи для самоссылки — какой
host правильный для «текущее приложение вызывает само себя» зависит от того, кто спрашивает,
поэтому self-reference каждый вызывающий решает сам.

```typescript
// apps/dashboard/src/lib/app-metrics.ts — health-check по каждому приложению из APP_PORTS
```

### Дрейф dev-портов (`app-ports.ts`)

Порт dev-сервера приложения объявлен минимум в трёх независимых местах (`.env`/`.env.local`/
CLI-команда в `project.json`, `.claude/commands/<app>.md`, `redirectUrls` OIDC-клиента в
`apps/auth-hub/prisma/seed.ts`), и ни одно не читает остальные — расхождение молчаливое,
ловится только вручную (прецедент: `studio` переехал 3020 → 3024, seed и командный файл не
обновились, локальный OIDC-вход был сломан). Эти функции сверяют источники между собой:

```typescript
/** Порты, которые объявляет само приложение (.env/.env.local/project.json). Источник истины. */
export function collectDeclaredPorts(workspaceRoot: string, app: string): number[]

/** Порт из .claude/commands/<app>.md. */
export function readCommandPort(workspaceRoot: string, app: string): number | undefined

/** localhost-порты из redirectUrls каждого OIDC-клиента Ключницы, сгруппированные по приложению. */
export function collectOidcLocalhostPorts(workspaceRoot: string): Map<string, number[]>

/** Список apps/* с project.json. */
export function listApps(workspaceRoot: string): string[]

/** Все декларации по всем приложениям монорепо. */
export function collectPortDeclarations(workspaceRoot: string): AppPortDeclaration[]

/** Расхождения между источниками (приложения без declared-портов пропускаются). */
export function findPortDrift(declarations: AppPortDeclaration[]): PortDrift[]

/** Человекочитаемый отчёт — для сообщения об ошибке guard-теста. */
export function formatPortDrift(drift: PortDrift[]): string
```

Дрейф ловит `app-ports.guard.spec.ts` (`nx test infra-config`).

⚠️ Парсинг `.env`/`project.json` продублирован в `libs/generators/src/utils/ports.ts` —
там он работает поверх виртуального Nx `Tree` (генератор правит ещё не записанные на диск
файлы), здесь — поверх реального диска. Схлопнуть в один модуль нельзя: `libs/generators` —
Nx-плагин, импорт `@letar/*` из него падает в рантайме (`node_modules/@letar/` в воркспейсе не
существует). При правке регулярок меняй оба файла — расхождение регулярок ловит
`port-parser.guard.spec.ts`.

## Команды

```bash
nx test infra-config
nx lint infra-config
nx typecheck:tsgo infra-config
```

## Подключение к приложению

Добавь `@letar/infra-config` в `nx.implicitDependencies` в `package.json` приложения.
Подробности и грабли с `paths`/`references` — [libs.md](/.claude/rules/libs.md#подключение-к-приложению).
