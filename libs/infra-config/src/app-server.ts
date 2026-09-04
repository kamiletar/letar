/**
 * Сверка production-сервера приложения между командным файлом агента и каноном `SERVER_APPS`.
 *
 * Сервер приложения объявлен минимум в двух местах, и ни одно из них не читает другое:
 *
 *   1. **канон** — `SERVER_APPS` в `libs/infra-config/src/index.ts`. Источник истины: по нему
 *      резолвится `deploy_app`/`resolveDeployServer`, то есть реальный деплой идёт именно туда;
 *   2. **командный файл** `.claude/commands/<app>.md` — строка `**Сервер:** sN (...)`. Её читает
 *      агент, когда открывает приложение, и ей же верит при диагностике/ручных SSH-действиях.
 *
 * Расхождение молчаливое: деплой продолжает идти на актуальный сервер (канон не трогается),
 * а командный файл просто врёт агенту, который по его тексту делает выводы или ходит руками.
 * Прецедент: после вывода s1 из эксплуатации (2026-06-20) шесть командных файлов (`aboi`,
 * `animatrona-landing`, `letar-landing`, `kami-key-the-landing`, `dashboard-agent`, `umami`)
 * продолжали называть его текущим сервером приложения — найдено только ручным аудитом
 * 2026-09-04, не автоматической проверкой.
 *
 * Дрейф ловит guard-тест `app-server.guard.spec.ts`.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getServerForApp, type InfraServer } from './index'

/**
 * Строка `**Сервер:** s2 (185.28.85.195) — s1 выведен из эксплуатации ...` в
 * `.claude/commands/<app>.md`. Берём ПЕРВОЕ вхождение `sN` сразу после заголовка — оно называет
 * актуальный сервер приложения. Всё, что идёт дальше в той же строке (адрес в скобках,
 * историческое примечание про выведенный из эксплуатации сервер) — не должно матчиться.
 */
const COMMAND_SERVER_PATTERN = /\*\*Сервер:\*\*\s*(s\d+)/

/** Известные серверы монорепо — то же множество, что `InfraServer` в `index.ts`. */
const KNOWN_SERVERS = new Set<InfraServer>(['s2', 's3'])

function isKnownServer(value: string): value is InfraServer {
  return KNOWN_SERVERS.has(value as InfraServer)
}

/** Что командный файл знает о сервере одного приложения. */
export interface AppServerDeclaration {
  app: string
  /** Сервер из `.claude/commands/<app>.md`, если файл есть и содержит строку `**Сервер:**`. */
  commandServer?: InfraServer
  /** Канонический сервер приложения — `getServerForApp(app)`. */
  canonicalServer: InfraServer
}

/** Одно расхождение: командный файл называет сервер, не совпадающий с каноном. */
export interface ServerDrift {
  app: string
  /** Сервер, записанный в командном файле. */
  found: InfraServer
  /** Сервер из канона `SERVER_APPS`. */
  canonical: InfraServer
  /** Файл, который нужно править. */
  file: string
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf-8') : undefined
}

/** Сервер из командного файла агента, если он там объявлен и распознан. */
export function readCommandServer(workspaceRoot: string, app: string): InfraServer | undefined {
  const content = readIfExists(join(workspaceRoot, '.claude', 'commands', `${app}.md`))
  const match = content?.match(COMMAND_SERVER_PATTERN)
  const server = match?.[1]
  return server !== undefined && isKnownServer(server) ? server : undefined
}

/**
 * Что командный файл знает о сервере — по всем приложениям монорепо, для которых
 * `.claude/commands/<app>.md` вообще объявляет `**Сервер:**`.
 *
 * `listApps` переиспользуется из `app-ports.ts`, чтобы не дублировать обход `apps/*` —
 * критерий «это приложение» (каталог с `project.json`) один и тот же для обеих проверок.
 */
export function collectServerDeclarations(
  workspaceRoot: string,
  apps: string[],
): AppServerDeclaration[] {
  const declarations: AppServerDeclaration[] = []

  for (const app of apps) {
    const commandServer = readCommandServer(workspaceRoot, app)
    if (commandServer !== undefined) {
      declarations.push({ app, commandServer, canonicalServer: getServerForApp(app) })
    }
  }

  return declarations
}

/**
 * Расхождения между командным файлом и каноном.
 *
 * Приложения без строки `**Сервер:**` в командном файле пропускаются ещё на этапе
 * `collectServerDeclarations` — это некоммерческие/локальные утилиты без деплоя, сверять не
 * с чем (тот же принцип, что `declared.length === 0` в `findPortDrift`).
 */
export function findServerDrift(declarations: AppServerDeclaration[]): ServerDrift[] {
  const drift: ServerDrift[] = []

  for (const { app, commandServer, canonicalServer } of declarations) {
    if (commandServer !== undefined && commandServer !== canonicalServer) {
      drift.push({
        app,
        found: commandServer,
        canonical: canonicalServer,
        file: `.claude/commands/${app}.md`,
      })
    }
  }

  return drift
}

/** Человекочитаемый отчёт о дрейфе — для сообщения об ошибке guard-теста. */
export function formatServerDrift(drift: ServerDrift[]): string {
  return drift
    .map(
      ({ app, found, canonical, file }) => `${app}: ${file} указывает ${found}, канон SERVER_APPS — ${canonical}`,
    )
    .join('\n')
}
