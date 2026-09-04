/**
 * Guard-тест: production-сервер приложения в командном файле не должен расходиться с каноном.
 *
 * Читает РЕАЛЬНЫЙ монорепо (не фикстуры) — смысл именно в этом: тест ловит дрейф, который
 * возникнет от правки `SERVER_APPS` без обновления `.claude/commands/<app>.md` (или наоборот —
 * забытую строку после переноса приложения на другой сервер), а не регрессию собственной логики
 * парсинга.
 *
 * Мотивация и разбор источников — шапка `app-server.ts`.
 */
import { describe, expect, it } from 'vitest'
import { findWorkspaceRoot, listApps } from './app-ports'
import { collectServerDeclarations, findServerDrift, formatServerDrift } from './app-server'

const workspaceRoot = findWorkspaceRoot()
const declarations = collectServerDeclarations(workspaceRoot, listApps(workspaceRoot))

describe('сверка production-сервера между командным файлом и каноном', () => {
  it('монорепо вообще просканировался (защита от молчаливо зелёного теста)', () => {
    expect(declarations.length).toBeGreaterThan(10)
  })

  it('`**Сервер:**` в .claude/commands/<app>.md совпадает с SERVER_APPS', () => {
    const drift = findServerDrift(declarations)
    expect(
      drift,
      `\n${
        formatServerDrift(drift)
      }\n\nПравь командный файл — истина в SERVER_APPS (libs/infra-config/src/index.ts).\n`,
    ).toEqual([])
  })
})
