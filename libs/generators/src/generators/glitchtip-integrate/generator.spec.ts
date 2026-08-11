import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import glitchtipIntegrateGenerator from './generator'

function seedNextApp(tree: Tree, app: string, withSrc = true): void {
  tree.write(`apps/${app}/package.json`, JSON.stringify({ name: `@letar/${app}`, nx: { name: app } }))
  tree.write(`apps/${app}/next.config.js`, 'module.exports = {}\n')
  tree.write(
    `apps/${app}/tsconfig.json`,
    JSON.stringify({ extends: '../../tsconfig.next-app.json', compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
  )
  if (withSrc) {
    tree.write(`apps/${app}/src/app/page.tsx`, 'export default function Page() { return null }')
  }
}

describe('glitchtip-integrate generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('падает, если приложение не найдено', async () => {
    await expect(glitchtipIntegrateGenerator(tree, { app: 'nope', skipChecks: true })).rejects.toThrow('не найдено')
  })

  it('падает, если package.json без next', async () => {
    tree.write(`apps/legacy/package.json`, JSON.stringify({ name: '@letar/legacy' }))
    await expect(glitchtipIntegrateGenerator(tree, { app: 'legacy', skipChecks: true })).rejects.toThrow(
      'не похоже на Next.js',
    )
  })

  it('падает на приватном submodule без --allowPrivate', async () => {
    seedNextApp(tree, 'studio')
    tree.write(
      '.gitmodules',
      '[submodule "apps/studio"]\n\tpath = apps/studio\n\turl = git@github.com:kamiletar/letar-private-studio.git\n',
    )

    await expect(glitchtipIntegrateGenerator(tree, { app: 'studio', skipChecks: true })).rejects.toThrow(
      'приватный submodule',
    )
  })

  it('на приватном submodule с --allowPrivate проходит', async () => {
    seedNextApp(tree, 'studio')
    tree.write(
      '.gitmodules',
      '[submodule "apps/studio"]\n\tpath = apps/studio\n\turl = git@github.com:kamiletar/letar-private-studio.git\n',
    )

    await glitchtipIntegrateGenerator(tree, { app: 'studio', allowPrivate: true, skipChecks: true })

    expect(tree.exists('apps/studio/src/instrumentation.ts')).toBe(true)
  })

  it('создаёт instrumentation.ts и instrumentation-client.ts в src/', async () => {
    seedNextApp(tree, 'dashboard')

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const server = tree.read('apps/dashboard/src/instrumentation.ts', 'utf-8')
    expect(server).toContain(`import('@letar/glitchtip/server')`)
    expect(server).toContain('NEXT_RUNTIME')

    const client = tree.read('apps/dashboard/src/instrumentation-client.ts', 'utf-8')
    expect(client).toContain(`from '@letar/glitchtip/client'`)
  })

  it('пишет файлы в корень приложения, если нет src/', async () => {
    seedNextApp(tree, 'flatapp', false)

    await glitchtipIntegrateGenerator(tree, { app: 'flatapp', skipChecks: true })

    expect(tree.exists('apps/flatapp/instrumentation.ts')).toBe(true)
    expect(tree.exists('apps/flatapp/instrumentation-client.ts')).toBe(true)
  })

  it('не перезаписывает существующий instrumentation.ts с чужой логикой', async () => {
    seedNextApp(tree, 'dashboard')
    tree.write('apps/dashboard/src/instrumentation.ts', 'export async function register() { console.log("custom") }')

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const content = tree.read('apps/dashboard/src/instrumentation.ts', 'utf-8')
    expect(content).toContain('custom')
    expect(content).not.toContain('@letar/glitchtip')
  })

  it('идемпотентна на instrumentation.ts, уже подключающем glitchtip', async () => {
    seedNextApp(tree, 'dashboard')
    const already = `import '@letar/glitchtip/server'\n`
    tree.write('apps/dashboard/src/instrumentation.ts', already)

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    expect(tree.read('apps/dashboard/src/instrumentation.ts', 'utf-8')).toBe(already)
  })

  it('добавляет @letar/glitchtip в dependencies и nx.implicitDependencies', async () => {
    seedNextApp(tree, 'dashboard')

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const pkg = JSON.parse(tree.read('apps/dashboard/package.json', 'utf-8') ?? '{}')
    expect(pkg.dependencies['@letar/glitchtip']).toBe('workspace:*')
    expect(pkg.nx.implicitDependencies).toContain('@letar/glitchtip')
  })

  it('не дублирует implicitDependencies при повторном запуске', async () => {
    seedNextApp(tree, 'dashboard')

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })
    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const pkg = JSON.parse(tree.read('apps/dashboard/package.json', 'utf-8') ?? '{}')
    expect(pkg.nx.implicitDependencies.filter((d: string) => d === '@letar/glitchtip')).toHaveLength(1)
  })

  it('добавляет три пути в tsconfig.json (base, client, server)', async () => {
    seedNextApp(tree, 'dashboard')

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const tsconfig = JSON.parse(tree.read('apps/dashboard/tsconfig.json', 'utf-8') ?? '{}')
    expect(tsconfig.compilerOptions.paths['@letar/glitchtip']).toEqual(['../../libs/glitchtip/src/index.ts'])
    expect(tsconfig.compilerOptions.paths['@letar/glitchtip/client']).toEqual([
      '../../libs/glitchtip/src/client/index.ts',
    ])
    expect(tsconfig.compilerOptions.paths['@letar/glitchtip/server']).toEqual([
      '../../libs/glitchtip/src/server/index.ts',
    ])
  })

  it('создаёт .env.docker с 4 переменными, если файла не было', async () => {
    seedNextApp(tree, 'dashboard')

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const env = tree.read('apps/dashboard/.env.docker', 'utf-8') ?? ''
    expect(env).toContain('GLITCHTIP_DSN=')
    expect(env).toContain('GLITCHTIP_ENVIRONMENT=production')
    expect(env).toContain('NEXT_PUBLIC_GLITCHTIP_DSN=')
    expect(env).toContain('NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT=production')
  })

  it('дописывает переменные в .env.staging со значением "staging", если файл уже существует', async () => {
    seedNextApp(tree, 'time')
    tree.write('apps/time/.env.staging', 'AUTH_TRUST_HOST=true\n')

    await glitchtipIntegrateGenerator(tree, { app: 'time', skipChecks: true })

    const env = tree.read('apps/time/.env.staging', 'utf-8') ?? ''
    expect(env).toContain('AUTH_TRUST_HOST=true')
    expect(env).toContain('GLITCHTIP_ENVIRONMENT=staging')
    expect(env).toContain('NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT=staging')
  })

  it('не трогает .env.staging, если файла не было (не создаёт его)', async () => {
    seedNextApp(tree, 'time')

    await glitchtipIntegrateGenerator(tree, { app: 'time', skipChecks: true })

    expect(tree.exists('apps/time/.env.staging')).toBe(false)
  })

  it('дописывает недостающие переменные в существующий .env.docker, не трогая остальное', async () => {
    seedNextApp(tree, 'dashboard')
    tree.write('apps/dashboard/.env.docker', 'DB_PASSWORD=secret\n')

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const env = tree.read('apps/dashboard/.env.docker', 'utf-8') ?? ''
    expect(env).toContain('DB_PASSWORD=secret')
    expect(env).toContain('GLITCHTIP_DSN=')
  })

  it('не трогает .env.docker, если все 4 переменные уже есть', async () => {
    seedNextApp(tree, 'dashboard')
    const original =
      'GLITCHTIP_DSN=x\nGLITCHTIP_ENVIRONMENT=production\nNEXT_PUBLIC_GLITCHTIP_DSN=x\nNEXT_PUBLIC_GLITCHTIP_ENVIRONMENT=production\n'
    tree.write('apps/dashboard/.env.docker', original)

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    expect(tree.read('apps/dashboard/.env.docker', 'utf-8')).toBe(original)
  })

  it('вставляет ${VAR} в services.app.environment docker-compose.production.yml', async () => {
    seedNextApp(tree, 'dashboard')
    tree.write(
      'apps/dashboard/docker-compose.production.yml',
      [
        'services:',
        '  app:',
        '    image: dashboard:latest',
        '    environment:',
        '      NODE_ENV: production',
        '    networks:',
        '      - kami-network',
        '',
      ].join('\n'),
    )

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const compose = tree.read('apps/dashboard/docker-compose.production.yml', 'utf-8') ?? ''
    expect(compose).toContain('GLITCHTIP_DSN: ${GLITCHTIP_DSN}')
    expect(compose).toContain('NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT: ${NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT}')
    expect(compose).toContain('NODE_ENV: production')
  })

  it('не трогает docker-compose, если все 4 переменные уже вставлены', async () => {
    seedNextApp(tree, 'dashboard')
    const original = [
      'services:',
      '  app:',
      '    environment:',
      '      GLITCHTIP_DSN: ${GLITCHTIP_DSN}',
      '      GLITCHTIP_ENVIRONMENT: ${GLITCHTIP_ENVIRONMENT}',
      '      NEXT_PUBLIC_GLITCHTIP_DSN: ${NEXT_PUBLIC_GLITCHTIP_DSN}',
      '      NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT: ${NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT}',
      '',
    ].join('\n')
    tree.write('apps/dashboard/docker-compose.production.yml', original)

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    expect(tree.read('apps/dashboard/docker-compose.production.yml', 'utf-8')).toBe(original)
  })

  it('не вставляет в docker-compose, если сервис "app" не найден (не рискует испортить YAML)', async () => {
    seedNextApp(tree, 'dashboard')
    const original = ['services:', '  web:', '    image: dashboard:latest', ''].join('\n')
    tree.write('apps/dashboard/docker-compose.production.yml', original)

    await glitchtipIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    expect(tree.read('apps/dashboard/docker-compose.production.yml', 'utf-8')).toBe(original)
  })

  it('возвращает GeneratorCallback, если skipChecks не передан', async () => {
    seedNextApp(tree, 'dashboard')

    const callback = await glitchtipIntegrateGenerator(tree, { app: 'dashboard' })

    expect(typeof callback).toBe('function')
  })
})
