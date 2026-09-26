import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import newAppGenerator from './generator'

/** Корень монорепо: libs/generators/src/generators/new-app → ../../../../.. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')

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
      JSON.stringify({ targets: { dev: { options: { command: 'next dev -p 3015' } } } }),
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
    expect(tree.exists('apps/my-app/vitest.config.mts')).toBe(true)
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
    expect(pkg.nx.implicitDependencies).toEqual([
      'chakra-provider',
      'ui',
      'analytics',
      'forms',
      '@letar/env-load',
    ])
  })

  it('--private кладёт .gitignore — корневой на submodule не действует', async () => {
    await newAppGenerator(tree, { name: 'my-app', private: true })

    const gitignore = tree.read('apps/my-app/.gitignore', 'utf-8') ?? ''
    expect(gitignore).toContain('node_modules/')
    expect(gitignore).toContain('dist/')
    expect(gitignore).toContain('*.tsbuildinfo')
    // .env с одним лишь PORT коммитится (см. .claude/rules/env-files.md) — игнорить его нельзя
    expect(gitignore).not.toMatch(/^\.env$/m)
    // uploads/ — расхождение с корневым .gitignore монорепо (PLAN-INFRA.md §39): первый же
    // `git add .` на сервере иначе унесёт пользовательские загрузки в коммит submodule
    expect(gitignore).toContain('uploads/')
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
    expect(project.targets.test.options.config).toBe('vitest.config.mts')
  })

  it('без --withDb не создаёт ZenStack/Prisma-каркас', async () => {
    await newAppGenerator(tree, { name: 'my-app' })

    expect(tree.exists('apps/my-app/prisma.config.ts')).toBe(false)
    expect(tree.exists('apps/my-app/schema.zmodel')).toBe(false)

    const project = JSON.parse(tree.read('apps/my-app/project.json', 'utf-8') ?? '{}')
    expect(project.targets['zenstack:generate']).toBeUndefined()
    expect(project.targets['db:migrate']).toBeUndefined()
  })

  it('--withDb создаёт prisma.config.ts, schema.zmodel-заготовку и db-таргеты в project.json', async () => {
    await newAppGenerator(tree, { name: 'my-app', withDb: true })

    expect(tree.exists('apps/my-app/prisma.config.ts')).toBe(true)

    const schema = tree.read('apps/my-app/schema.zmodel', 'utf-8') ?? ''
    expect(schema).toContain('datasource db')
    expect(schema).toContain('generator client')
    expect(schema).toContain('plugin policy')
    expect(schema).toContain('plugin formSchema')

    const project = JSON.parse(tree.read('apps/my-app/project.json', 'utf-8') ?? '{}')
    expect(project.targets['zenstack:generate']).toBeDefined()
    expect(project.targets['db:generate']).toBeDefined()
    expect(project.targets['db:push']).toBeDefined()
    expect(project.targets['db:migrate']).toBeDefined()
    expect(project.targets['db:studio']).toBeDefined()
    expect(project.targets['db:migrate'].options.cwd).toBe('apps/my-app')
    // остальные таргеты (typecheck и т.д.) не затираются условным блоком
    expect(project.targets.typecheck).toBeDefined()
    expect(project.targets.test.options.config).toBe('vitest.config.mts')
  })

  it('--withDb --private добавляет src/generated/ в .gitignore приватного приложения', async () => {
    await newAppGenerator(tree, { name: 'my-app', withDb: true, private: true })

    const gitignore = tree.read('apps/my-app/.gitignore', 'utf-8') ?? ''
    expect(gitignore).toContain('src/generated/')
  })

  it('--private без --withDb не добавляет src/generated/ в .gitignore', async () => {
    await newAppGenerator(tree, { name: 'my-app', private: true })

    const gitignore = tree.read('apps/my-app/.gitignore', 'utf-8') ?? ''
    expect(gitignore).not.toContain('src/generated/')
  })

  describe('дефекты каркаса, найденные при заведении flora', () => {
    /** tsconfig.json — JSONC-подобный, но шаблон без комментариев: парсится как обычный JSON. */
    const readTsconfig = () => JSON.parse(tree.read('apps/my-app/tsconfig.json', 'utf-8') ?? '{}')

    it('tsconfig.json без references — иначе typecheck:tsgo падает с TS6305', async () => {
      await newAppGenerator(tree, { name: 'my-app' })

      expect(readTsconfig().references).toBeUndefined()
    })

    it('tsconfig.json содержит paths на ВСЕ subpath-экспорты forms, forms-core и forms-react', async () => {
      await newAppGenerator(tree, { name: 'my-app' })

      // Ожидание считаем по реальным `exports` библиотек, а не по зашитому списку: неполный набор
      // подпутей — мина замедленного действия (.claude/rules/libs.md, check-lib-subpath-paths).
      // Wildcard-ключ здесь невозможен: раскладка файлов подпутей не единообразна.
      const paths = readTsconfig().compilerOptions.paths as Record<string, string[]>
      for (const lib of ['forms', 'forms-core', 'forms-react']) {
        const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'libs', lib, 'package.json'), 'utf-8'))
        for (const subpath of Object.keys(pkg.exports as Record<string, unknown>)) {
          if (subpath === './package.json') {
            continue
          }
          const key = `@letar/${lib}${subpath === '.' ? '' : subpath.slice(1)}`
          expect(paths[key], key).toBeDefined()
        }
      }
    })

    it('providers.tsx импортирует FormI18nProvider из @letar/forms (paths обязаны это покрывать)', async () => {
      await newAppGenerator(tree, { name: 'my-app' })

      const providers = tree.read('apps/my-app/src/app/_components/providers.tsx', 'utf-8') ?? ''
      expect(providers).toContain("from '@letar/forms'")
      expect(readTsconfig().compilerOptions.paths['@letar/forms']).toBeDefined()
    })

    it('next.config.mjs фиксирует turbopack.root на корень монорепо — приватный submodule иначе не стартует', async () => {
      await newAppGenerator(tree, { name: 'my-app' })

      const config = tree.read('apps/my-app/next.config.mjs', 'utf-8') ?? ''
      expect(config).toContain('turbopack: { root: workspaceRoot }')
      expect(config).toContain("'../..'")
    })

    it('шаблоны не используют проп as= у Heading — только asChild с нативным элементом', async () => {
      await newAppGenerator(tree, { name: 'my-app' })

      const page = tree.read('apps/my-app/src/app/page.tsx', 'utf-8') ?? ''
      const mdx = tree.read('apps/my-app/src/mdx-components.tsx', 'utf-8') ?? ''
      for (const source of [page, mdx]) {
        expect(source).not.toMatch(/<Heading[^>]*\sas=/)
        expect(source).toContain('asChild')
      }
      expect(page).toMatch(/<Heading asChild[^>]*>\s*<h1>/)
      for (const level of ['h1', 'h2', 'h3', 'h4']) {
        expect(mdx).toContain(`<${level} {...props} />`)
      }
    })
  })

  it('документация соответствует documentation-guidelines: дата на момент запуска, Keep a Changelog', async () => {
    await newAppGenerator(tree, { name: 'my-app' })
    const read = (f: string) => tree.read(`apps/my-app/${f}`, 'utf-8') ?? ''
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

    const readme = read('README.md')
    expect(readme).toContain('## Документация')
    expect(readme).toContain('[CHANGELOG.md](CHANGELOG.md)')
    expect(readme).toContain(`**Последнее обновление:** ${today}`)
    expect(readme).toContain('nx run my-app:format')
    expect(readme).not.toContain('nx format my-app')

    const changelog = read('CHANGELOG.md')
    expect(changelog).toContain('[Keep a Changelog](https://keepachangelog.com/)')
    expect(changelog).toContain('## [Unreleased]')
    expect(changelog).toContain(`## [0.1.0] - ${today}`)
    expect(changelog).toContain('### Added')

    const testing = read('PLAN_TESTING.md')
    expect(testing).toContain('## Статистика')
    expect(testing).toContain('## Запуск тестов')
    expect(testing).toContain('nx test my-app')
    expect(testing).toContain('nx e2e my-app-e2e')

    const completed = read('PLAN_COMPLETED.md')
    expect(completed).toContain(`## v0.1.0 — Каркас приложения (${today})`)
    expect(completed).toContain(`**Последнее обновление:** ${today}`)

    for (const f of ['README.md', 'CHANGELOG.md', 'PLAN.md', 'PLAN_COMPLETED.md', 'PLAN_TESTING.md']) {
      expect(read(f)).not.toContain('<%')
    }
  })
})
