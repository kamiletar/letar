/**
 * Юнит-тесты разбора production-порта на синтетических файлах.
 *
 * Отдельно от `app-ports-production.guard.spec.ts`: тот читает реальный монорепо и ловит дрейф
 * конфигурации, этот — регрессии самих регулярок (на реальном репо большинство веток не встречается).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  collectProductionPortDeclarations,
  extractComposeEnvPorts,
  extractDockerfileEnvPorts,
  extractTraefikServerPorts,
  findProductionPortDrift,
  formatProductionPortDrift,
} from './app-ports-production'

describe('extractTraefikServerPorts', () => {
  it('читает значение в одинарных и двойных кавычках', () => {
    const compose = [
      "      traefik.http.services.alpha.loadbalancer.server.port: '3002'",
      '      traefik.http.services.beta.loadbalancer.server.port: "3025"',
    ].join('\n')
    expect(extractTraefikServerPorts(compose, 'alpha')).toEqual([3002])
    expect(extractTraefikServerPorts(compose, 'beta')).toEqual([3025])
  })

  it('читает list-форму меток', () => {
    const compose = '    labels:\n      - "traefik.http.services.alpha.loadbalancer.server.port=3002"\n'
    expect(extractTraefikServerPorts(compose, 'alpha')).toEqual([3002])
  })

  it('метка сервиса с именем приложения приоритетнее меток соседних сервисов', () => {
    const compose = [
      "      traefik.http.services.alpha.loadbalancer.server.port: '3002'",
      "      traefik.http.services.alpha-ws.loadbalancer.server.port: '4002'",
    ].join('\n')
    expect(extractTraefikServerPorts(compose, 'alpha')).toEqual([3002])
  })

  it('нет метки с именем приложения — берутся все', () => {
    const compose = "      traefik.http.services.web.loadbalancer.server.port: '3002'"
    expect(extractTraefikServerPorts(compose, 'alpha')).toEqual([3002])
  })

  it('закомментированная метка порта не объявляет', () => {
    const compose = "      # traefik.http.services.alpha.loadbalancer.server.port: '3002'"
    expect(extractTraefikServerPorts(compose, 'alpha')).toEqual([])
  })

  it('переживает CRLF-окончания строк', () => {
    const compose = "      traefik.http.services.alpha.loadbalancer.server.port: '3002'\r\n      other: x\r\n"
    expect(extractTraefikServerPorts(compose, 'alpha')).toEqual([3002])
  })
})

describe('extractComposeEnvPorts', () => {
  it('берёт PORT, но не SOCKET_PORT и не SMTP_PORT', () => {
    const compose = [
      '      SOCKET_PORT: 3004',
      '      SMTP_PORT: ${SMTP_PORT:-587}',
      '      EMAIL_CANARY_SMTP_PORT: ${EMAIL_CANARY_SMTP_PORT}',
      '      PORT: 3003',
    ].join('\n')
    expect(extractComposeEnvPorts(compose)).toEqual([3003])
  })

  it('читает list-форму и значение в кавычках', () => {
    expect(extractComposeEnvPorts('      - PORT=3100')).toEqual([3100])
    expect(extractComposeEnvPorts('      PORT: "3100"')).toEqual([3100])
  })

  it('игнорирует комментарий и интерполяцию', () => {
    expect(extractComposeEnvPorts('      # PORT: 3000')).toEqual([])
    expect(extractComposeEnvPorts('      PORT: ${PORT:-3100}')).toEqual([])
  })

  it('допускает комментарий в конце строки', () => {
    expect(extractComposeEnvPorts('      PORT: 3100 # порт контейнера')).toEqual([3100])
  })
})

describe('extractDockerfileEnvPorts', () => {
  it('читает ENV PORT=… и не путает SOCKET_PORT', () => {
    const dockerfile = 'FROM node\nENV SOCKET_PORT=4003\nENV PORT=3003\nEXPOSE 3003\n'
    expect(extractDockerfileEnvPorts(dockerfile)).toEqual([3003])
  })

  it('читает несколько переменных в одной ENV-строке и продолжения через обратный слэш', () => {
    expect(extractDockerfileEnvPorts('ENV NODE_ENV=production PORT=3003')).toEqual([3003])
    expect(extractDockerfileEnvPorts('ENV NODE_ENV=production \\\n    PORT=3003\n')).toEqual([3003])
  })

  it('читает устаревшую форму без «=»', () => {
    expect(extractDockerfileEnvPorts('ENV PORT 3003')).toEqual([3003])
  })

  it('PORT вне ENV-строки (в RUN или комментарии) не считается', () => {
    expect(extractDockerfileEnvPorts('# ENV PORT=3000\nRUN echo PORT=3000\n')).toEqual([])
  })
})

describe('findProductionPortDrift', () => {
  const ok = { kind: 'traefik-label' as const, file: 'apps/alpha/docker-compose.production.yml' }

  it('совпадение — без дрейфа, источник без порта расхождением не считается', () => {
    const drift = findProductionPortDrift([{
      app: 'alpha',
      expected: 3002,
      sources: [
        { ...ok, ports: [3002] },
        { kind: 'compose-env', file: ok.file, ports: [] },
        { kind: 'dockerfile-env', file: 'apps/alpha/Dockerfile.production', ports: [] },
      ],
    }])
    expect(drift).toEqual([])
  })

  it('называет источник и файл разошедшегося порта', () => {
    const drift = findProductionPortDrift([{
      app: 'alpha',
      expected: 3002,
      sources: [
        { ...ok, ports: [3002] },
        { kind: 'dockerfile-env', file: 'apps/alpha/Dockerfile.production', ports: [3003] },
      ],
    }])
    expect(drift).toEqual([
      { app: 'alpha', kind: 'dockerfile-env', expected: 3002, found: [3003], file: 'apps/alpha/Dockerfile.production' },
    ])
  })

  it('порт только в Dockerfile — unverifiable: compose сверить не с чем', () => {
    const drift = findProductionPortDrift([{
      app: 'alpha',
      expected: 3002,
      sources: [
        { ...ok, ports: [] },
        { kind: 'compose-env', file: ok.file, ports: [] },
        { kind: 'dockerfile-env', file: 'apps/alpha/Dockerfile.production', ports: [3002] },
      ],
    }])
    expect(drift.map((d) => d.kind)).toEqual(['unverifiable'])
    expect(formatProductionPortDrift(drift)).toContain('alpha')
  })
})

describe('collectProductionPortDeclarations', () => {
  let root: string

  function write(relativePath: string, content: string): void {
    const path = join(root, relativePath)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content, 'utf-8')
  }

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'letar-app-ports-production-'))
    write(
      'apps/alpha/docker-compose.production.yml',
      "      traefik.http.services.alpha.loadbalancer.server.port: '3002'\n",
    )
    write('apps/alpha/Dockerfile.production', 'ENV PORT=3002\n')
    // У beta есть только compose (без Dockerfile), у gamma нет ничего — приватный submodule не выкачан.
    write('apps/beta/docker-compose.production.yml', '      PORT: 3100\n')
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('сверяет приложения с compose-файлом, остальные складывает в skipped', () => {
    const { declarations, skipped } = collectProductionPortDeclarations(root, {
      alpha: 3002,
      beta: 3100,
      gamma: 3005,
    })
    expect(declarations.map((d) => d.app)).toEqual(['alpha', 'beta'])
    expect(skipped).toEqual(['gamma'])
    expect(findProductionPortDrift(declarations)).toEqual([])
  })

  it('ловит расхождение канона с compose', () => {
    const { declarations } = collectProductionPortDeclarations(root, { alpha: 3999 })
    expect(findProductionPortDrift(declarations).map((d) => d.kind)).toEqual(['traefik-label', 'dockerfile-env'])
  })
})
