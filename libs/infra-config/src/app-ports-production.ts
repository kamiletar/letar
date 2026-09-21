/**
 * Сверка `APP_PORTS` с реальным production-портом контейнера.
 *
 * `APP_PORTS` (`index.ts`) хранит порт **production-контейнера** приложения, но значения ведутся
 * вручную, а сам порт объявлен ещё в трёх местах, ни одно из которых `APP_PORTS` не читает:
 *
 *   1. **traefik-метка** `traefik.http.services.<app>.loadbalancer.server.port` в
 *      `apps/<app>/docker-compose.production.yml` — на этот порт Traefik проксирует трафик;
 *   2. **`PORT` в `environment:`** того же compose-файла — так, например, порт задаёт
 *      `dashboard-agent`, у которого traefik-меток нет вовсе;
 *   3. **`ENV PORT=` в `apps/<app>/Dockerfile.production`** — порт, на котором стартует standalone.
 *
 * Расхождение молчаливое: запись в `APP_PORTS` расходится с контейнером, и health-check dashboard
 * и межконтейнерные вызовы dashboard-agent ходят в закрытый порт — далеко от места правки.
 * Прецедент пропусков: `domwellbes` и `auth-hub` долго вообще не были в `APP_PORTS`
 * (PLAN-INFRA-6.md, `apps/domwellbes/CHANGELOG_2026_08_24.md`).
 *
 * Дрейф ловит guard-тест `app-ports-production.guard.spec.ts`. Соседний `app-ports.guard.spec.ts`
 * сверяет ДРУГОЕ — dev-порты (`apps/<app>/.env`, командные файлы, seed Ключницы).
 *
 * Парсинг — регулярками, без YAML-зависимости (как в `app-ports.ts`). Ловушки, ради которых
 * регулярки якорятся на начало строки и на точное имя ключа:
 *
 *   - `SOCKET_PORT: 3004` (driving-school) и `SMTP_PORT: ${SMTP_PORT:-587}` — не порт приложения;
 *     матчится только ключ ровно `PORT`;
 *   - значение traefik-метки бывает в одинарных (`'3002'`) и двойных (`"3025"`) кавычках, а
 *     метка — и в виде `key: value`, и в виде `- "key=value"`;
 *   - закомментированная строка (`# PORT: 3000`) порта не объявляет.
 *
 * ⚠️ `PORT: ${PORT:-3002}` (интерполяция) не распознаётся — числа в строке нет. Если так объявлены
 * ВСЕ порты compose-файла, приложение попадёт в `unverifiable`, а не пройдёт молча.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Откуда прочитан порт. */
export type ProductionPortSourceKind = 'traefik-label' | 'compose-env' | 'dockerfile-env'

/** Хвост строки: пробелы, необязательный комментарий, `\r` от CRLF-чекаута на Windows. */
const LINE_END = String.raw`[ \t]*(?:#.*)?\r?$`

/**
 * `traefik.http.services.<имя>.loadbalancer.server.port: '3002'` или `- "…port=3002"`.
 * Группа 1 — имя traefik-сервиса, группа 2 — порт.
 */
const TRAEFIK_PORT_PATTERN = new RegExp(
  String.raw`^[ \t]*(?:-[ \t]*)?['"]?traefik\.http\.services\.([\w-]+)\.loadbalancer\.server\.port['"]?`
    + String.raw`[ \t]*[:=][ \t]*['"]?(\d+)['"]?`
    + LINE_END,
  'gm',
)

/** `PORT: 3002` / `- PORT=3002` в `environment:`. Ключ ровно `PORT` — не `SOCKET_PORT`/`SMTP_PORT`. */
const COMPOSE_ENV_PORT_PATTERN = new RegExp(
  String.raw`^[ \t]*(?:-[ \t]*)?['"]?PORT['"]?[ \t]*[:=][ \t]*['"]?(\d+)['"]?` + LINE_END,
  'gm',
)

/** Строка `ENV …` Dockerfile целиком (продолжения через `\` склеиваются заранее). */
const DOCKERFILE_ENV_LINE_PATTERN = /^[ \t]*ENV[ \t]+(.*)$/gim

/** `PORT=3002` или устаревшее `PORT 3002` внутри `ENV`-строки; `SOCKET_PORT` отсекает lookbehind. */
const DOCKERFILE_PORT_PATTERN = /(?<![\w-])PORT(?:[ \t]*=[ \t]*|[ \t]+)(\d+)/g

/** Что один источник говорит о порте. */
export interface ProductionPortSource {
  kind: ProductionPortSourceKind
  /** Путь относительно корня воркспейса — что править при расхождении. */
  file: string
  /** Найденные порты. Пусто — источник существует, но порт в нём не объявлен. */
  ports: number[]
}

/** Всё, что известно о production-порте одного приложения из `APP_PORTS`. */
export interface ProductionPortDeclaration {
  app: string
  /** Порт из канона `APP_PORTS`. */
  expected: number
  sources: ProductionPortSource[]
}

/** Результат сбора: сверяемые приложения и те, у кого compose-файла нет в чекауте. */
export interface ProductionPortScan {
  declarations: ProductionPortDeclaration[]
  /** Приложения из канона без `docker-compose.production.yml` — приватный submodule не выкачан. */
  skipped: string[]
}

/** Вид расхождения: источник называет чужой порт либо порт не найден нигде. */
export type ProductionPortDriftKind = ProductionPortSourceKind | 'unverifiable'

/** Одно расхождение. */
export interface ProductionPortDrift {
  app: string
  kind: ProductionPortDriftKind
  /** Порт из канона `APP_PORTS`. */
  expected: number
  /** Порты, найденные в разошедшемся источнике (пусто для `unverifiable`). */
  found: number[]
  file: string
}

/**
 * Порты traefik-меток `server.port`.
 *
 * Метка с именем сервиса, равным имени приложения, приоритетна: остальные (если в compose
 * несколько сервисов) к порту приложения отношения не имеют. Нет такой — берутся все метки.
 */
export function extractTraefikServerPorts(compose: string, app: string): number[] {
  const labels = [...compose.matchAll(TRAEFIK_PORT_PATTERN)].map((m) => ({
    service: m[1] ?? '',
    port: Number(m[2]),
  }))
  const own = labels.filter((label) => label.service === app)
  return [...new Set((own.length > 0 ? own : labels).map((label) => label.port))]
}

/** Порты `PORT` из `environment:` compose-файла. */
export function extractComposeEnvPorts(compose: string): number[] {
  return [...new Set([...compose.matchAll(COMPOSE_ENV_PORT_PATTERN)].map((m) => Number(m[1])))]
}

/** Порты `ENV PORT=` из Dockerfile. */
export function extractDockerfileEnvPorts(dockerfile: string): number[] {
  const joined = dockerfile.replace(/\\\r?\n/g, ' ')
  const ports: number[] = []
  for (const line of joined.matchAll(DOCKERFILE_ENV_LINE_PATTERN)) {
    for (const match of (line[1] ?? '').matchAll(DOCKERFILE_PORT_PATTERN)) {
      ports.push(Number(match[1]))
    }
  }
  return [...new Set(ports)]
}

/**
 * Что compose и Dockerfile каждого приложения из канона говорят о production-порте.
 *
 * Приложение без `docker-compose.production.yml` попадает в `skipped`, а не в ошибку: приватные
 * submodule в CI не выкачиваются. Защита от молчаливо зелёного теста — забота вызывающего
 * (guard-тест требует минимум сверенных приложений).
 */
export function collectProductionPortDeclarations(
  workspaceRoot: string,
  appPorts: Record<string, number>,
): ProductionPortScan {
  const declarations: ProductionPortDeclaration[] = []
  const skipped: string[] = []

  for (const [app, expected] of Object.entries(appPorts)) {
    const composeFile = `apps/${app}/docker-compose.production.yml`
    const composePath = join(workspaceRoot, composeFile)
    if (!existsSync(composePath)) {
      skipped.push(app)
      continue
    }

    const compose = readFileSync(composePath, 'utf-8')
    const sources: ProductionPortSource[] = [
      { kind: 'traefik-label', file: composeFile, ports: extractTraefikServerPorts(compose, app) },
      { kind: 'compose-env', file: composeFile, ports: extractComposeEnvPorts(compose) },
    ]

    const dockerfile = `apps/${app}/Dockerfile.production`
    const dockerfilePath = join(workspaceRoot, dockerfile)
    if (existsSync(dockerfilePath)) {
      sources.push({
        kind: 'dockerfile-env',
        file: dockerfile,
        ports: extractDockerfileEnvPorts(readFileSync(dockerfilePath, 'utf-8')),
      })
    }

    declarations.push({ app, expected, sources })
  }

  return { declarations, skipped }
}

/**
 * Расхождения канона с источниками.
 *
 * Источник без порта (`ports` пуст) не считается расхождением — приложение вправе не задавать
 * `ENV PORT` в Dockerfile или не иметь traefik-меток. Но если ни compose-метка, ни `PORT` в
 * `environment:` порта не дали — сверять не с чем, и это отдельный вид `unverifiable`: тихо
 * пропустить такое приложение значило бы вернуть ровно ту слепоту, ради которой guard заведён.
 */
export function findProductionPortDrift(declarations: ProductionPortDeclaration[]): ProductionPortDrift[] {
  const drift: ProductionPortDrift[] = []

  for (const { app, expected, sources } of declarations) {
    const composeSources = sources.filter((s) => s.kind !== 'dockerfile-env')
    if (composeSources.every((s) => s.ports.length === 0)) {
      drift.push({ app, kind: 'unverifiable', expected, found: [], file: composeSources[0]?.file ?? '' })
    }

    for (const { kind, file, ports } of sources) {
      const wrong = ports.filter((port) => port !== expected)
      if (wrong.length > 0) {
        drift.push({ app, kind, expected, found: wrong, file })
      }
    }
  }

  return drift
}

/** Человекочитаемый отчёт о дрейфе — для сообщения об ошибке guard-теста. */
export function formatProductionPortDrift(drift: ProductionPortDrift[]): string {
  return drift
    .map(({ app, kind, expected, found, file }) =>
      kind === 'unverifiable'
        ? `${app}: в ${file} не найден ни traefik server.port, ни PORT — сверить APP_PORTS (${expected}) не с чем`
        : `${app}: ${file} (${kind}) указывает ${found.join(', ')}, APP_PORTS — ${expected}`
    )
    .join('\n')
}
