import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import electronAppGenerator from './generator'

function writeRootPackageJson(tree: Tree, deps: Record<string, string> = {}, devDeps: Record<string, string> = {}) {
  tree.write(
    'package.json',
    JSON.stringify({
      name: '@letar/source',
      dependencies: deps,
      devDependencies: devDeps,
    })
  )
}

describe('electron-app generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
    writeRootPackageJson(tree, { electron: '^42.6.1' }, { 'electron-builder': '^26.15.3' })
  })

  it('падает, если приложение уже существует', async () => {
    tree.write('apps/my-app/package.json', '{}')
    await expect(electronAppGenerator(tree, { name: 'my-app' })).rejects.toThrow('уже существует')
  })

  it('падает, если в корневом package.json нет electron/electron-builder', async () => {
    writeRootPackageJson(tree)
    await expect(electronAppGenerator(tree, { name: 'my-app' })).rejects.toThrow('Не найдены electron/electron-builder')
  })

  it('создаёт полный набор файлов приложения', async () => {
    await electronAppGenerator(tree, { name: 'my-app' })

    for (const file of [
      'apps/my-app/main/background.ts',
      'apps/my-app/main/preload.ts',
      'apps/my-app/main/ipc/index.ts',
      'apps/my-app/main/ipc/app.handlers.ts',
      'apps/my-app/main/webpack.config.js',
      'apps/my-app/renderer/app/page.tsx',
      'apps/my-app/renderer/app/layout.tsx',
      'apps/my-app/renderer/app/_components/providers.tsx',
      'apps/my-app/renderer/types/electron.d.ts',
      'apps/my-app/renderer/next.config.js',
      'apps/my-app/renderer/tsconfig.json',
      'apps/my-app/resources/icon.svg',
      'apps/my-app/scripts/dev.js',
      'apps/my-app/scripts/generate-icons.mjs',
      'apps/my-app/package.json',
      'apps/my-app/project.json',
      'apps/my-app/tsconfig.json',
      'apps/my-app/electron-builder.yml',
      'apps/my-app/nextron.config.js',
      'apps/my-app/.gitignore',
      'apps/my-app/README.md',
      'apps/my-app/PLAN.md',
      'apps/my-app/PLAN_TESTING.md',
    ]) {
      expect(tree.exists(file)).toBe(true)
    }
  })

  it('пиннит версию electron/electron-builder (убирает ^) в package.json и electron-builder.yml', async () => {
    await electronAppGenerator(tree, { name: 'my-app' })

    const pkg = JSON.parse(tree.read('apps/my-app/package.json', 'utf-8') ?? '{}')
    expect(pkg.devDependencies.electron).toBe('42.6.1')
    expect(pkg.devDependencies['electron-builder']).toBe('26.15.3')

    const builderYml = tree.read('apps/my-app/electron-builder.yml', 'utf-8')
    expect(builderYml).toContain('electronVersion: 42.6.1')
  })

  it('выводит displayName из kebab-case name, если не передан явно', async () => {
    await electronAppGenerator(tree, { name: 'my-cool-app' })

    const layout = tree.read('apps/my-cool-app/renderer/app/layout.tsx', 'utf-8')
    expect(layout).toContain('My Cool App')
  })

  it('явные displayName/description переопределяют дефолты', async () => {
    await electronAppGenerator(tree, {
      name: 'my-app',
      displayName: 'Моё Приложение',
      description: 'Тестовое описание',
    })

    const layout = tree.read('apps/my-app/renderer/app/layout.tsx', 'utf-8')
    expect(layout).toContain('Моё Приложение')
    expect(layout).toContain('Тестовое описание')

    const readme = tree.read('apps/my-app/README.md', 'utf-8')
    expect(readme).toContain('Моё Приложение')
  })

  it('package.json содержит правильное имя пакета', async () => {
    await electronAppGenerator(tree, { name: 'my-app' })

    const pkg = JSON.parse(tree.read('apps/my-app/package.json', 'utf-8') ?? '{}')
    expect(pkg.name).toBe('@letar/my-app')
    expect(pkg.nx.name).toBe('my-app')
  })

  it('.gitignore исключает node_modules и build output', async () => {
    await electronAppGenerator(tree, { name: 'my-app' })

    const gitignore = tree.read('apps/my-app/.gitignore', 'utf-8')
    expect(gitignore).toContain('node_modules/')
    expect(gitignore).toContain('/dist/')
    expect(gitignore).toContain('/renderer/out/')
  })
})
