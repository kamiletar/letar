import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import e2eSuiteGenerator from './generator'

describe('e2e-suite generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
    tree.write('apps/my-app/.env', 'PORT=3099\n')
  })

  it('падает, если приложение не существует', async () => {
    await expect(e2eSuiteGenerator(tree, { app: 'no-such-app' })).rejects.toThrow('не найдено')
  })

  it('падает, если сьют уже существует', async () => {
    tree.write('apps/my-app-e2e/package.json', '{}')
    await expect(e2eSuiteGenerator(tree, { app: 'my-app' })).rejects.toThrow('уже существует')
  })

  it('падает, если порт не передан и не найден в .env', async () => {
    tree.write('apps/no-port-app/.env', 'BETTER_AUTH_SECRET=x\n')
    await expect(e2eSuiteGenerator(tree, { app: 'no-port-app' })).rejects.toThrow('Не удалось определить dev-порт')
  })

  it('берёт порт из apps/<app>/.env, если явно не передан', async () => {
    await e2eSuiteGenerator(tree, { app: 'my-app' })

    const playwrightConfig = tree.read('apps/my-app-e2e/playwright.config.ts', 'utf-8')
    expect(playwrightConfig).toContain('http://localhost:3099')
  })

  it('явный --port переопределяет .env', async () => {
    await e2eSuiteGenerator(tree, { app: 'my-app', port: 4000 })

    const playwrightConfig = tree.read('apps/my-app-e2e/playwright.config.ts', 'utf-8')
    expect(playwrightConfig).toContain('http://localhost:4000')
  })

  it('создаёт полный набор файлов сьюта', async () => {
    await e2eSuiteGenerator(tree, { app: 'my-app' })

    expect(tree.exists('apps/my-app-e2e/package.json')).toBe(true)
    expect(tree.exists('apps/my-app-e2e/project.json')).toBe(true)
    expect(tree.exists('apps/my-app-e2e/tsconfig.json')).toBe(true)
    expect(tree.exists('apps/my-app-e2e/eslint.config.mjs')).toBe(true)
    expect(tree.exists('apps/my-app-e2e/playwright.config.ts')).toBe(true)
    expect(tree.exists('apps/my-app-e2e/.gitignore')).toBe(true)
    expect(tree.exists('apps/my-app-e2e/src/homepage.spec.ts')).toBe(true)
  })

  it('project.json — явный executor @nx/playwright:playwright (не inferred createNodes) — иначе staging BASE_URL игнорируется, см. .claude/docs/e2e-testing.md', async () => {
    await e2eSuiteGenerator(tree, { app: 'my-app' })

    const project = JSON.parse(tree.read('apps/my-app-e2e/project.json', 'utf-8') ?? '{}')
    expect(project.targets.e2e.executor).toBe('@nx/playwright:playwright')
    expect(project.implicitDependencies).toEqual(['my-app'])
  })

  it('package.json содержит правильное имя пакета и implicitDependencies', async () => {
    await e2eSuiteGenerator(tree, { app: 'my-app' })

    const pkg = JSON.parse(tree.read('apps/my-app-e2e/package.json', 'utf-8') ?? '{}')
    expect(pkg.name).toBe('@letar/my-app-e2e')
    expect(pkg.nx.implicitDependencies).toEqual(['my-app'])
  })

  it('.gitignore исключает playwright/.auth и test-output', async () => {
    await e2eSuiteGenerator(tree, { app: 'my-app' })

    const gitignore = tree.read('apps/my-app-e2e/.gitignore', 'utf-8')
    expect(gitignore).toContain('playwright/.auth/')
    expect(gitignore).toContain('test-output/')
  })
})
