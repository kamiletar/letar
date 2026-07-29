/**
 * Разбор dev-портов приложения поверх виртуального Nx `Tree` — генератору нужно видеть файлы,
 * которых ещё нет на диске.
 *
 * ⚠️ Регулярки `ENV_PORT_PATTERN`/`CLI_PORT_PATTERN` и `extractPorts` продублированы в
 * `libs/infra-config/src/app-ports.ts` (там — поверх реального диска, для guard-теста).
 * **При правке регулярок меняй оба файла.**
 *
 * Вынести общее ядро в `@letar/infra-config` и импортировать его отсюда нельзя — проверено
 * запуском (2026-07-29, PLAN-INFRA.md §34.2 п.4). Этот файл грузится как часть Nx-плагина, и
 * любой импорт `@letar/*` роняет генератор в рантайме с `Cannot find module`: в воркспейсе нет
 * `node_modules/@letar/` (bun не раскладывает workspace-пакеты симлинками), а загрузчик плагинов
 * регистрирует `tsconfig-paths` против корневого `tsconfig.base.json`, где `paths` для `@letar/*`
 * нет — резолв построен на `exports` + `customConditions`, которые рантайм-`require` не видит.
 * `typecheck` при этом зелёный, так что проверять только реальным `nx g ... --dry-run`.
 */

import { joinPathFragments, type Tree } from '@nx/devkit'

/**
 * Нижняя граница dev-портов монорепо. 3000 намеренно не выдаём: это дефолт Next.js
 * (`next dev` без `-p`), и он не входит в принятую последовательность 3xxx.
 */
export const MIN_DEV_PORT = 3001

/** Верхняя граница диапазона — всё, что вне 3xxx (например `react-native --port 8083`), не dev-порт приложения */
const MAX_DEV_PORT = 3999

/**
 * Файлы окружения, где может лежать `PORT=<число>`.
 * `.env` коммитится (см. .claude/rules/env-files.md), `.env.local` — нет, но у части приложений
 * порт объявлен только там, и для подбора свободного порта он всё равно занят.
 */
const ENV_FILES = ['.env', '.env.local']

/**
 * `PORT=3005` в .env-файле. Якорь `^` с флагом `m` обязателен — иначе матчится `SOCKET_PORT=4003`.
 */
const ENV_PORT_PATTERN = /^[ \t]*PORT[ \t]*=[ \t]*(\d+)/gm

/**
 * Порт из CLI-команды в project.json: `next dev -p 3008`, `next start --port=3008`.
 * Lookbehind отсекает случаи, когда `-p` — хвост другого флага (`--port` матчится целиком).
 */
const CLI_PORT_PATTERN = /(?<![\w-])(?:--port|-p)[ =]+(\d+)/g

function isDevPort(port: number): boolean {
  return Number.isInteger(port) && port >= 3000 && port <= MAX_DEV_PORT
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

/**
 * Все dev-порты, которые объявляет `apps/<app>`: `.env`, `.env.local` и CLI-команды в `project.json`.
 *
 * Сканировать одну лишь `.env` недостаточно — часть приложений (лендинги) задаёт порт прямо в
 * `next dev -p <порт>` внутри project.json, а часть (dashboard) — только в `.env.local`.
 */
export function collectAppPorts(tree: Tree, app: string): number[] {
  const ports: number[] = []

  for (const envFile of ENV_FILES) {
    const envPath = joinPathFragments('apps', app, envFile)
    if (tree.exists(envPath)) {
      ports.push(...extractPorts(tree.read(envPath, 'utf-8') ?? '', ENV_PORT_PATTERN))
    }
  }

  const projectJsonPath = joinPathFragments('apps', app, 'project.json')
  if (tree.exists(projectJsonPath)) {
    ports.push(...extractPorts(tree.read(projectJsonPath, 'utf-8') ?? '', CLI_PORT_PATTERN))
  }

  return ports
}

/** Dev-порт конкретного приложения (первый объявленный) — например для baseURL e2e-сьюта */
export function resolveAppPort(tree: Tree, app: string): number | undefined {
  return collectAppPorts(tree, app)[0]
}

/**
 * Порт для нового приложения — следующий за максимальным занятым.
 *
 * Именно «продолжение последовательности», а не первая дырка в ней: свободные 3000–3002 остались
 * от приложений, которые давно переехали или объявляют порт вне `.env`, и повторно их занимать —
 * значит ловить конфликты с тем, что реально слушает эти порты локально.
 */
export function resolveNextFreePort(tree: Tree): number {
  const usedPorts = new Set<number>()

  if (tree.exists('apps')) {
    for (const app of tree.children('apps')) {
      for (const port of collectAppPorts(tree, app)) {
        usedPorts.add(port)
      }
    }
  }

  const highestUsed = usedPorts.size > 0 ? Math.max(...usedPorts) : 0
  let port = Math.max(MIN_DEV_PORT, highestUsed + 1)
  while (usedPorts.has(port)) {
    port++
  }
  return port
}
