/**
 * Юнит-тесты парсинга портов на синтетическом воркспейсе во временном каталоге.
 *
 * Отдельно от `app-ports.guard.spec.ts`: тот читает реальный монорепо и ловит дрейф конфигурации,
 * этот — регрессии самой логики разбора (на реальном репо большинство веток просто не встречается).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  collectDeclaredPorts,
  collectOidcLocalhostPorts,
  findPortDrift,
  findWorkspaceRoot,
  listApps,
  readCommandPort,
} from './app-ports'

let root: string

/** Создаёт файл вместе с недостающими каталогами. */
function write(relativePath: string, content: string): void {
  const path = join(root, relativePath)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content, 'utf-8')
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'letar-app-ports-'))
  writeFileSync(join(root, 'nx.json'), '{}', 'utf-8')

  // Порт в .env — обычный случай. SOCKET_PORT рядом не должен попасть в результат.
  write('apps/alpha/project.json', '{"name":"alpha"}')
  write('apps/alpha/.env', 'SOCKET_PORT=4003\nPORT=3001\n')
  write('.claude/commands/alpha.md', '**Порт:** 3001\n')

  // Порт только в CLI-команде project.json — так живут лендинги.
  write('apps/beta/project.json', '{"targets":{"dev":{"options":{"command":"next dev -p 3002"}}}}')
  write('.claude/commands/beta.md', '**Порт:** 3009\n')

  // Порт только в .env.local (не коммитится) — всё равно объявлен.
  write('apps/gamma/project.json', '{"name":"gamma"}')
  write('apps/gamma/.env.local', 'PORT=3003\n')

  // Каталог без project.json — не приложение.
  mkdirSync(join(root, 'apps/not-an-app'), { recursive: true })

  // Ключница: приложение без объявленного порта, зато с seed OIDC-клиентов.
  write('apps/auth-hub/project.json', '{"name":"auth-hub"}')
  write(
    'apps/auth-hub/prisma/seed.ts',
    [
      "  { clientId: 'alpha-prod', redirectUrls: [",
      "    'https://alpha.letar.best/sign-in',",
      "    'http://localhost:3001/sign-in',",
      "  ].join(',') },",
      "  { clientId: 'gamma-prod', redirectUrls: [",
      "    'http://localhost:3999/sign-in',",
      "  ].join(',') },",
    ].join('\n'),
  )
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('collectDeclaredPorts', () => {
  it('берёт PORT из .env и не путает его с SOCKET_PORT', () => {
    expect(collectDeclaredPorts(root, 'alpha')).toEqual([3001])
  })

  it('находит порт в CLI-команде project.json, когда .env нет', () => {
    expect(collectDeclaredPorts(root, 'beta')).toEqual([3002])
  })

  it('учитывает .env.local — у части приложений порт только там', () => {
    expect(collectDeclaredPorts(root, 'gamma')).toEqual([3003])
  })

  it('для приложения без объявлений возвращает пусто', () => {
    expect(collectDeclaredPorts(root, 'auth-hub')).toEqual([])
  })
})

describe('listApps', () => {
  it('считает приложением только каталог с project.json', () => {
    expect(listApps(root)).toEqual(['alpha', 'auth-hub', 'beta', 'gamma'])
  })
})

describe('readCommandPort', () => {
  it('читает `**Порт:**` из командного файла', () => {
    expect(readCommandPort(root, 'alpha')).toBe(3001)
  })

  it('без командного файла возвращает undefined', () => {
    expect(readCommandPort(root, 'gamma')).toBeUndefined()
  })
})

describe('collectOidcLocalhostPorts', () => {
  it('привязывает localhost-порт к приложению по clientId, отбрасывая суффикс окружения', () => {
    const ports = collectOidcLocalhostPorts(root)
    expect(ports.get('alpha')).toEqual([3001])
    expect(ports.get('gamma')).toEqual([3999])
  })

  it('не приписывает порт соседнему клиенту (границы секций по clientId)', () => {
    expect(collectOidcLocalhostPorts(root).get('alpha')).not.toContain(3999)
  })
})

describe('findPortDrift', () => {
  it('ловит расхождение командного файла с объявлением приложения', () => {
    const drift = findPortDrift([{ app: 'beta', declared: [3002], commandPort: 3009, oidcPorts: [] }])
    expect(drift).toEqual([
      { app: 'beta', source: 'command-file', found: 3009, declared: [3002], file: '.claude/commands/beta.md' },
    ])
  })

  it('ловит расхождение seed Ключницы', () => {
    const drift = findPortDrift([{ app: 'gamma', declared: [3003], oidcPorts: [3999] }])
    expect(drift).toEqual([
      { app: 'gamma', source: 'auth-hub-seed', found: 3999, declared: [3003], file: 'apps/auth-hub/prisma/seed.ts' },
    ])
  })

  it('молчит, когда всё сходится', () => {
    expect(findPortDrift([{ app: 'alpha', declared: [3001], commandPort: 3001, oidcPorts: [3001] }])).toEqual([])
  })

  it('пропускает приложения без объявленного порта — сверять не с чем', () => {
    expect(findPortDrift([{ app: 'delta', declared: [], commandPort: 3050, oidcPorts: [3051] }])).toEqual([])
  })
})

describe('findWorkspaceRoot', () => {
  it('поднимается до каталога с nx.json', () => {
    expect(findWorkspaceRoot(join(root, 'apps/alpha'))).toBe(root)
  })

  it('падает с внятной ошибкой, если nx.json нет нигде выше', () => {
    expect(() => findWorkspaceRoot(tmpdir())).toThrow(/nx\.json/)
  })
})
