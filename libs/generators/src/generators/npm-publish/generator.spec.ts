import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import npmPublishGenerator from './generator'

function seedLib(tree: Tree, pkg: object = {}) {
  tree.write(
    'libs/my-lib/package.json',
    JSON.stringify({ name: '@letar/my-lib', version: '0.1.0', description: 'Тест', ...pkg }),
  )
  tree.write('libs/my-lib/project.json', JSON.stringify({ name: '@letar/my-lib', targets: { test: {} } }))
}

describe('npm-publish generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('падает, если библиотеки нет', async () => {
    await expect(npmPublishGenerator(tree, { name: 'my-lib' })).rejects.toThrow('не найдена')
  })

  it('падает, если публикация уже заведена', async () => {
    seedLib(tree)
    tree.write('libs/my-lib/tsup.config.ts', '')
    await expect(npmPublishGenerator(tree, { name: 'my-lib' })).rejects.toThrow('уже есть')
  })

  it('создаёт файлы публикации и таргеты', async () => {
    seedLib(tree)
    await npmPublishGenerator(tree, { name: 'my-lib' })

    for (const f of ['tsup.config.ts', 'tsconfig.publish.json', 'package.publish.json', 'LICENSE']) {
      expect(tree.exists(`libs/my-lib/${f}`)).toBe(true)
    }
    const project = JSON.parse(tree.read('libs/my-lib/project.json', 'utf-8') ?? '{}')
    expect(project.targets['build:npm'].options.commands).toContain('node ../../scripts/write-publish-package-json.mjs')
    expect(project.targets['publish:npm'].options.command).toContain('--tag beta')
    expect(project.targets.test).toBeDefined()
  })

  it('package.publish.json без version, с beta; рабочий package.json — type module и @letar/* в dev', async () => {
    seedLib(tree, { dependencies: { 'to-words': '^5.3.0', '@letar/util': 'workspace:*' } })
    await npmPublishGenerator(tree, { name: 'my-lib', formsCorePeer: true })

    const publish = JSON.parse(tree.read('libs/my-lib/package.publish.json', 'utf-8') ?? '{}')
    expect(publish.version).toBeUndefined()
    expect(publish.publishConfig).toEqual({ access: 'public', tag: 'beta' })
    expect(publish.dependencies).toEqual({ 'to-words': '^5.3.0' })
    expect(publish.peerDependencies['@letar/forms-core']).toBe('>=0.28.0 <1')

    const pkg = JSON.parse(tree.read('libs/my-lib/package.json', 'utf-8') ?? '{}')
    expect(pkg.type).toBe('module')
    expect(pkg.dependencies).toEqual({ 'to-words': '^5.3.0' })
    expect(pkg.devDependencies['@letar/util']).toBe('workspace:*')
    expect(pkg.devDependencies['@letar/forms-core']).toBe('workspace:*')
  })
})
