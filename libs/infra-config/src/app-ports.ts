/**
 * Сверка dev-порта приложения между независимыми источниками, которые про него знают.
 *
 * Порт приложения объявлен минимум в трёх местах, и ни одно из них не читает остальные:
 *
 *   1. **само приложение** — `apps/<app>/.env`, `.env.local` или CLI-команда в `project.json`
 *      (`next dev -p 3008`). Это ЕДИНСТВЕННЫЙ источник истины: по нему поднимается dev-сервер;
 *   2. **командный файл** `.claude/commands/<app>.md` — строка `**Порт:** <N>`. Её читает агент,
 *      когда открывает приложение, и по ней же ходит в браузер;
 *   3. **seed Ключницы** `apps/auth-hub/prisma/seed.ts` — `http://localhost:<N>/...` в
 *      `redirectUrls` OIDC-клиента. По нему Better Auth валидирует redirect при локальном входе.
 *
 * Расхождение молчаливое: приложение поднимается, командный файл врёт, а вход по OIDC падает
 * с `invalid redirect_uri` — причём далеко от места правки и только локально, так что на прод
 * это не выходит и живёт месяцами. Прецедент: `studio` переехал 3020 → 3024 (3020 занял
 * `form-docs`), но seed Ключницы и командный файл остались на 3020 — локальный вход в студию
 * был сломан до обнаружения вручную (`apps/studio/PLAN.md` §11.11а).
 *
 * Дрейф ловит guard-тест `app-ports.guard.spec.ts`.
 *
 * ⚠️ Парсинг `.env`/`project.json` продублирован в `libs/generators/src/utils/ports.ts` —
 * там он работает поверх виртуального Nx `Tree` (генератор правит ещё не записанные на диск
 * файлы), здесь — поверх реального диска. **При правке регулярок меняй оба файла** — расхождение
 * регулярок ловит `port-parser.guard.spec.ts` рядом. Дрейф самого `extractPorts` он не поймает:
 * сверяются только литералы регулярок.
 *
 * Схлопнуть в один модуль нельзя — проверено запуском (2026-07-29, PLAN-INFRA.md §34.2 п.4):
 * `libs/generators` — Nx-плагин, и импорт `@letar/*` из него падает в рантайме
 * (`Cannot find module`), потому что `node_modules/@letar/` в воркспейсе не существует, а
 * загрузчик плагинов регистрирует `tsconfig-paths` против корневого `tsconfig.base.json`, где
 * `paths` для `@letar/*` нет. Типами это не ловится: `typecheck` на таком импорте зелёный.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Нижняя граница диапазона dev-портов монорепо (3000 — дефолт `next dev` без `-p`). */
const MIN_DEV_PORT = 3000

/** Верхняя граница: всё вне 3xxx (например `react-native --port 8083`) — не dev-порт приложения. */
const MAX_DEV_PORT = 3999

/** Файлы окружения, где может лежать `PORT=<число>`. `.env.local` не коммитится, но порт часто только там. */
const ENV_FILES = ['.env', '.env.local']

/** `PORT=3005` в .env-файле. Якорь `^` с флагом `m` обязателен — иначе матчится `SOCKET_PORT=4003`. */
const ENV_PORT_PATTERN = /^[ \t]*PORT[ \t]*=[ \t]*(\d+)/gm

/** Порт из CLI-команды в project.json: `next dev -p 3008`, `next start --port=3008`. */
const CLI_PORT_PATTERN = /(?<![\w-])(?:--port|-p)[ =]+(\d+)/g

/** Строка `**Порт:** 3024` в `.claude/commands/<app>.md`. */
const COMMAND_PORT_PATTERN = /\*\*Порт:\*\*\s*(\d+)/

/** `clientId: 'studio-prod'` в seed Ключницы — граница секции клиента. */
const SEED_CLIENT_ID_PATTERN = /clientId:\s*['"]([^'"]+)['"]/g

/** `http://localhost:3024/...` в redirectUrls. Только http — https-адреса это прод/стейдж. */
const SEED_LOCALHOST_PATTERN = /http:\/\/localhost:(\d+)/g

/** Суффиксы окружения в clientId Ключницы: `studio-prod` → приложение `studio`. */
const CLIENT_ID_SUFFIXES = ['-prod', '-stage', '-staging', '-dev', '-local']

/** Что каждый источник знает о порте одного приложения. */
export interface AppPortDeclaration {
  app: string
  /** Порты, объявленные самим приложением. Пусто — приложение не объявляет порт нигде. */
  declared: number[]
  /** Порт из `.claude/commands/<app>.md`, если файл есть и содержит строку `**Порт:**`. */
  commandPort?: number
  /** Уникальные localhost-порты из redirectUrls OIDC-клиента этого приложения. */
  oidcPorts: number[]
}

/** Источник, разошедшийся с объявлением приложения. */
export type PortDriftSource = 'command-file' | 'auth-hub-seed'

/** Одно расхождение: источник называет порт, которого приложение не объявляет. */
export interface PortDrift {
  app: string
  source: PortDriftSource
  /** Порт, записанный в разошедшемся источнике. */
  found: number
  /** Порты, которые объявляет само приложение (истина). */
  declared: number[]
  /** Файл, который нужно править. */
  file: string
}

function isDevPort(port: number): boolean {
  return Number.isInteger(port) && port >= MIN_DEV_PORT && port <= MAX_DEV_PORT
}

function extractPorts(content: string, pattern: RegExp): number[] {
  const ports: number[] = []
  for (const match of content.matchAll(pattern)) {
    const port = Number(match[1])
    if (isDevPort(port)) {
      ports.push(port)
    }
  }
  return ports
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf-8') : undefined
}

/**
 * Корень воркспейса — ближайший вверх по дереву каталог с `nx.json`.
 *
 * Через `import.meta.url`, а не `process.cwd()`: vitest запускается из каталога библиотеки,
 * а Nx — из корня, и полагаться на cwd тут нельзя.
 */
export function findWorkspaceRoot(startDir: string = dirname(fileURLToPath(import.meta.url))): string {
  let dir = startDir
  while (!existsSync(join(dir, 'nx.json'))) {
    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error('[app-ports] не найден корень воркспейса (nx.json) вверх по дереву от ' + startDir)
    }
    dir = parent
  }
  return dir
}

/** Порты, которые объявляет само приложение: `.env`, `.env.local`, CLI-команды в `project.json`. */
export function collectDeclaredPorts(workspaceRoot: string, app: string): number[] {
  const appDir = join(workspaceRoot, 'apps', app)
  const ports: number[] = []

  for (const envFile of ENV_FILES) {
    const content = readIfExists(join(appDir, envFile))
    if (content !== undefined) {
      ports.push(...extractPorts(content, ENV_PORT_PATTERN))
    }
  }

  const projectJson = readIfExists(join(appDir, 'project.json'))
  if (projectJson !== undefined) {
    ports.push(...extractPorts(projectJson, CLI_PORT_PATTERN))
  }

  return [...new Set(ports)]
}

/** Порт из командного файла агента, если он там объявлен. */
export function readCommandPort(workspaceRoot: string, app: string): number | undefined {
  const content = readIfExists(join(workspaceRoot, '.claude', 'commands', `${app}.md`))
  const match = content?.match(COMMAND_PORT_PATTERN)
  const port = match ? Number(match[1]) : Number.NaN
  return isDevPort(port) ? port : undefined
}

/** Имя приложения из clientId Ключницы: `studio-prod` → `studio`. */
function appFromClientId(clientId: string): string {
  const suffix = CLIENT_ID_SUFFIXES.find((s) => clientId.endsWith(s))
  return suffix ? clientId.slice(0, -suffix.length) : clientId
}

/**
 * Localhost-порты из `redirectUrls` каждого OIDC-клиента Ключницы, сгруппированные по приложению.
 *
 * Разбор текстом, а не импортом модуля: seed при импорте требует секреты из окружения
 * (`requireSecret`) и подключение к БД — в guard-тесте это недопустимая цена.
 */
export function collectOidcLocalhostPorts(workspaceRoot: string): Map<string, number[]> {
  const byApp = new Map<string, number[]>()
  const content = readIfExists(join(workspaceRoot, 'apps', 'auth-hub', 'prisma', 'seed.ts'))
  if (content === undefined) {
    return byApp
  }

  // Секция клиента — от его clientId до clientId следующего (или до конца файла).
  const matches = [...content.matchAll(SEED_CLIENT_ID_PATTERN)]
  for (const [index, match] of matches.entries()) {
    const start = match.index ?? 0
    const end = matches[index + 1]?.index ?? content.length
    const app = appFromClientId(match[1] ?? '')
    const ports = extractPorts(content.slice(start, end), SEED_LOCALHOST_PATTERN)
    byApp.set(app, [...new Set([...(byApp.get(app) ?? []), ...ports])])
  }

  return byApp
}

/** Список приложений монорепо (каталоги `apps/*` с `project.json`). */
export function listApps(workspaceRoot: string): string[] {
  const appsDir = join(workspaceRoot, 'apps')
  if (!existsSync(appsDir)) {
    return []
  }
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(appsDir, entry.name, 'project.json')))
    .map((entry) => entry.name)
    .sort()
}

/** Что каждый источник знает о порте — по всем приложениям монорепо. */
export function collectPortDeclarations(workspaceRoot: string): AppPortDeclaration[] {
  const oidcPortsByApp = collectOidcLocalhostPorts(workspaceRoot)

  return listApps(workspaceRoot).map((app) => ({
    app,
    declared: collectDeclaredPorts(workspaceRoot, app),
    commandPort: readCommandPort(workspaceRoot, app),
    oidcPorts: oidcPortsByApp.get(app) ?? [],
  }))
}

/**
 * Расхождения между источниками.
 *
 * Приложения, которые не объявляют порт нигде (`declared` пуст), пропускаются: сверять не с чем,
 * и падать на них — значит требовать `.env` там, где его сознательно нет (см.
 * `.claude/rules/env-files.md`).
 */
export function findPortDrift(declarations: AppPortDeclaration[]): PortDrift[] {
  const drift: PortDrift[] = []

  for (const { app, declared, commandPort, oidcPorts } of declarations) {
    if (declared.length === 0) {
      continue
    }

    if (commandPort !== undefined && !declared.includes(commandPort)) {
      drift.push({
        app,
        source: 'command-file',
        found: commandPort,
        declared,
        file: `.claude/commands/${app}.md`,
      })
    }

    for (const port of oidcPorts) {
      if (!declared.includes(port)) {
        drift.push({
          app,
          source: 'auth-hub-seed',
          found: port,
          declared,
          file: 'apps/auth-hub/prisma/seed.ts',
        })
      }
    }
  }

  return drift
}

/** Человекочитаемый отчёт о дрейфе — для сообщения об ошибке guard-теста. */
export function formatPortDrift(drift: PortDrift[]): string {
  return drift
    .map(
      ({ app, found, declared, file }) =>
        `${app}: ${file} указывает ${found}, приложение объявляет ${declared.join(', ')}`,
    )
    .join('\n')
}
