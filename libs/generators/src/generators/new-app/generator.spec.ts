import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import newAppGenerator from './generator'

describe('new-app generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('падает, если приложение уже существует', async () => {
    tree.write('apps/my-app/package.json', '{}')
    await expect(newAppGenerator(tree, { name: 'my-app' })).rejects.toThrow('уже существует')
  })

  it('берёт следующий за максимальным занятым 3xxx порт, если явно не передан', async () => {
    tree.write('apps/existing-a/.env', 'PORT=3003\n')
    tree.write('apps/existing-b/.env', 'PORT=3024\n')

    await newAppGenerator(tree, { name: 'my-app' })

    const env = tree.read('apps/my-app/.env', 'utf-8')
    expect(env).toContain('PORT=3025')
  })

  it('не откатывается в дырку последовательности (в том числе на дефолтный 3000)', async () => {
    // 3000–3009 свободны, но новое приложение продолжает ряд с конца
    tree.write('apps/existing/.env', 'PORT=3010\n')

    await newAppGenerator(tree, { name: 'my-app' })

    const env = tree.read('apps/my-app/.env', 'utf-8')
    expect(env).toContain('PORT=3011')
    expect(env).not.toContain('PORT=3000')
  })

  it('учитывает приложения, объявляющие порт вне .env (project.json, .env.local)', async () => {
    tree.write('apps/existing/.env', 'PORT=3005\n')
    tree.write(
      'apps/landing/project.json',
      JSON.stringify({ targets: { dev: { options: { command: 'next dev -p 3015' } } } })
    )
    tree.write('apps/dashboard/.env.local', 'PORT=3016\n')

    await newAppGenerator(tree, { name: 'my-app' })

    const env = tree.read('apps/my-app/.env', 'utf-8')
    expect(env).toContain('PORT=3017')
  })

  it('явный --port переопределяет автовычисление', async () => {
    await newAppGenerator(tree, { name: 'my-app', port: 3050 })

    const env = tree.read('apps/my-app/.env', 'utf-8')
    expect(env).toContain('PORT=3050')
  })

  it('стартует с 3001, если apps/ ещё пуст (3000 — дефолт Next.js, его не занимаем)', async () => {
    await newAppGenerator(tree, { name: 'first-app' })

    const env = tree.read('apps/first-app/.env', 'utf-8')
    expect(env).toContain('PORT=3001')
  })

  it('создаёт полный набор файлов приложения', async () => {
    await newAppGenerator(tree, { name: 'my-app' })

    expect(tree.exists('apps/my-app/package.json')).toBe(true)
    expect(tree.exists('apps/my-app/project.json')).toBe(true)
    expect(tree.exists('apps/my-app/tsconfig.json')).toBe(true)
    expect(tree.exists('apps/my-app/next.config.mjs')).toBe(true)
    // next-env.d.ts не генерируем: его создаёт сам Next при первом dev/build, и он под .gitignore
    expect(tree.exists('apps/my-app/next-env.d.ts')).toBe(false)
    expect(tree.exists('apps/my-app/eslint.config.mjs')).toBe(true)
    expect(tree.exists('apps/my-app/vitest.config.ts')).toBe(true)
    expect(tree.exists('apps/my-app/vitest.setup.tsx')).toBe(true)
    expect(tree.exists('apps/my-app/README.md')).toBe(true)
    expect(tree.exists('apps/my-app/PLAN.md')).toBe(true)
    expect(tree.exists('apps/my-app/PLAN_COMPLETED.md')).toBe(true)
    expect(tree.exists('apps/my-app/PLAN_TESTING.md')).toBe(true)
    expect(tree.exists('apps/my-app/CHANGELOG.md')).toBe(true)
    expect(tree.exists('apps/my-app/src/app/layout.tsx')).toBe(true)
    expect(tree.exists('apps/my-app/src/app/page.tsx')).toBe(true)
    expect(tree.exists('apps/my-app/src/app/_components/providers.tsx')).toBe(true)
    expect(tree.exists('apps/my-app/src/mdx-components.tsx')).toBe(true)
    expect(tree.exists('apps/my-app/src/theme/index.ts')).toBe(true)
    expect(tree.exists('apps/my-app/src/theme/tokens/colors.ts')).toBe(true)
    expect(tree.exists('apps/my-app/src/theme/semanticTokens/colors.ts')).toBe(true)
    expect(tree.exists('apps/my-app/public/.gitkeep')).toBe(true)
  })

  it('НЕ создаёт boilerplate-файлы, которые обычно приходится удалять руками', async () => {
    await newAppGenerator(tree, { name: 'my-app' })

    // global.css, .swcrc, api/hello и next.config.js (CJS) — то, что приходится чистить после
    // "сырого" `nx g @nx/next:application` (см. .claude/commands/create/new-app.md шаг 2)
    expect(tree.exists('apps/my-app/src/app/global.css')).toBe(false)
    expect(tree.exists('apps/my-app/.swcrc')).toBe(false)
    expect(tree.exists('apps/my-app/next.config.js')).toBe(false)
    expect(tree.exists('apps/my-app/src/app/api/hello/route.ts')).toBe(false)
  })

  it('layout.tsx не импортирует global.css и подключает UmamiScript', async () => {
    await newAppGenerator(tree, { name: 'my-app' })

    const layout = tree.read('apps/my-app/src/app/layout.tsx', 'utf-8') ?? ''
    expect(layout).not.toContain('global.css')
    expect(layout).toContain('UmamiScript')
  })

  it('package.json содержит имя с префиксом @letar/ и implicitDependencies', async () => {
    await newAppGenerator(tree, { name: 'my-app' })

    const pkg = JSON.parse(tree.read('apps/my-app/package.json', 'utf-8') ?? '{}')
    expect(pkg.name).toBe('@letar/my-app')
    expect(pkg.nx.implicitDependencies).toEqual(['chakra-provider', 'ui', 'analytics'])
  })

  it('--private кладёт .gitignore — корневой на submodule не действует', async () => {
    await newAppGenerator(tree, { name: 'my-app', private: true })

    const gitignore = tree.read('apps/my-app/.gitignore', 'utf-8') ?? ''
    expect(gitignore).toContain('node_modules/')
    expect(gitignore).toContain('dist/')
    expect(gitignore).toContain('*.tsbuildinfo')
    // .env с одним лишь PORT коммитится (см. .claude/rules/env-files.md) — игнорить его нельзя
    expect(gitignore).not.toMatch(/^\.env$/m)
  })

  it('публичному приложению .gitignore не создаётся — его закрывает корневой репо', async () => {
    await newAppGenerator(tree, { name: 'my-app' })

    expect(tree.exists('apps/my-app/.gitignore')).toBe(false)
  })

  it('displayName по умолчанию — Title Case от имени', async () => {
    await newAppGenerator(tree, { name: 'my-cool-app' })

    const layout = tree.read('apps/my-cool-app/src/app/layout.tsx', 'utf-8')
    expect(layout).toContain('My Cool App')
  })

  it('явный displayName/description переопределяют дефолты', async () => {
    await newAppGenerator(tree, { name: 'my-app', displayName: 'Моё приложение', description: 'Тестовое описание' })

    const layout = tree.read('apps/my-app/src/app/layout.tsx', 'utf-8')
    expect(layout).toContain('Моё приложение')
    expect(layout).toContain('Тестовое описание')
  })

  it('project.json — sourceRoot и projectType application', async () => {
    await newAppGenerator(tree, { name: 'my-app' })

    const project = JSON.parse(tree.read('apps/my-app/project.json', 'utf-8') ?? '{}')
    expect(project.sourceRoot).toBe('apps/my-app/src')
    expect(project.projectType).toBe('application')
    expect(project.targets.test.options.config).toBe('apps/my-app/vitest.config.ts')
  })
})
