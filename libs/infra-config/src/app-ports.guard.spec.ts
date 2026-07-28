/**
 * Guard-тест: dev-порт приложения не должен разъезжаться между источниками.
 *
 * Читает РЕАЛЬНЫЙ монорепо (не фикстуры) — смысл именно в этом: тест ловит дрейф, который
 * возникнет от правки `.env`, командного файла или seed Ключницы, а не регрессию собственной
 * логики парсинга. Логика парсинга проверяется отдельно, в `app-ports.spec.ts`.
 *
 * Мотивация и разбор источников — шапка `app-ports.ts`.
 */
import { describe, expect, it } from 'vitest'
import {
  collectPortDeclarations,
  findPortDrift,
  findWorkspaceRoot,
  formatPortDrift,
  type PortDriftSource,
} from './app-ports'

const workspaceRoot = findWorkspaceRoot()
const declarations = collectPortDeclarations(workspaceRoot)

/** Дрейф только по одному источнику — чтобы падение сразу называло виноватый файл. */
function driftFrom(source: PortDriftSource) {
  return findPortDrift(declarations).filter((d) => d.source === source)
}

describe('сверка dev-портов между источниками', () => {
  it('монорепо вообще просканировался (защита от молчаливо зелёного теста)', () => {
    expect(declarations.length).toBeGreaterThan(20)
    expect(declarations.filter((d) => d.declared.length > 0).length).toBeGreaterThan(15)
  })

  it('`**Порт:**` в .claude/commands/<app>.md совпадает с портом приложения', () => {
    const drift = driftFrom('command-file')
    expect(
      drift,
      `\n${formatPortDrift(drift)}\n\nПравь командный файл — истина в apps/<app>/.env (или project.json).\n`
    ).toEqual([])
  })

  it('localhost-redirect в seed Ключницы совпадает с портом приложения', () => {
    const drift = driftFrom('auth-hub-seed')
    expect(
      drift,
      `\n${formatPortDrift(drift)}\n\n` +
        'Правь apps/auth-hub/prisma/seed.ts. Учти: локальные приложения ходят в ПРОД-Ключницу,\n' +
        'поэтому после правки нужен re-seed боевого auth-hub (deploy_app с seed: true) — иначе\n' +
        'локальный вход продолжит падать с invalid redirect_uri.\n'
    ).toEqual([])
  })
})
