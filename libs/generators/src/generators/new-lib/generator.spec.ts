import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import newLibGenerator from './generator'

describe('new-lib generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('падает, если библиотека уже существует', async () => {
    tree.write('libs/my-lib/package.json', '{}')
    await expect(newLibGenerator(tree, { name: 'my-lib' })).rejects.toThrow('уже существует')
  })

  it('создаёт полный набор файлов библиотеки', async () => {
    await newLibGenerator(tree, { name: 'my-lib' })

    expect(tree.exists('libs/my-lib/package.json')).toBe(true)
    expect(tree.exists('libs/my-lib/project.json')).toBe(true)
    expect(tree.exists('libs/my-lib/tsconfig.json')).toBe(true)
    expect(tree.exists('libs/my-lib/tsconfig.lib.json')).toBe(true)
    expect(tree.exists('libs/my-lib/tsconfig.spec.json')).toBe(true)
    expect(tree.exists('libs/my-lib/vitest.config.ts')).toBe(true)
    expect(tree.exists('libs/my-lib/eslint.config.mjs')).toBe(true)
    expect(tree.exists('libs/my-lib/README.md')).toBe(true)
    expect(tree.exists('libs/my-lib/src/index.ts')).toBe(true)
    expect(tree.exists('libs/my-lib/src/lib/feature.ts')).toBe(true)
    expect(tree.exists('libs/my-lib/src/lib/feature.spec.ts')).toBe(true)
  })

  it('package.json содержит имя с префиксом @letar/', async () => {
    await newLibGenerator(tree, { name: 'my-lib' })

    const pkg = JSON.parse(tree.read('libs/my-lib/package.json', 'utf-8') ?? '{}')
    expect(pkg.name).toBe('@letar/my-lib')
    expect(pkg.main).toBe('./src/index.ts')
  })

  it('project.json — sourceRoot и projectType корректны', async () => {
    await newLibGenerator(tree, { name: 'my-lib' })

    const project = JSON.parse(tree.read('libs/my-lib/project.json', 'utf-8') ?? '{}')
    expect(project.sourceRoot).toBe('libs/my-lib/src')
    expect(project.projectType).toBe('library')
    expect(project.targets.test.options.config).toBe('libs/my-lib/vitest.config.ts')
  })

  it('README.md использует переданное описание', async () => {
    await newLibGenerator(tree, { name: 'my-lib', description: 'Тестовая библиотека' })

    const readme = tree.read('libs/my-lib/README.md', 'utf-8')
    expect(readme).toContain('Тестовая библиотека')
  })

  it('README.md использует заглушку, если описание не передано', async () => {
    await newLibGenerator(tree, { name: 'my-lib' })

    const readme = tree.read('libs/my-lib/README.md', 'utf-8')
    expect(readme).toContain('my-lib — shared-библиотека монорепо letar')
  })

  describe('--react', () => {
    it('генерирует .tsx вместо .ts и не оставляет framework-free feature.ts', async () => {
      await newLibGenerator(tree, { name: 'my-react-lib', react: true })

      expect(tree.exists('libs/my-react-lib/src/lib/feature.tsx')).toBe(true)
      expect(tree.exists('libs/my-react-lib/src/lib/feature.spec.tsx')).toBe(true)
      expect(tree.exists('libs/my-react-lib/vitest.setup.ts')).toBe(true)
      expect(tree.exists('libs/my-react-lib/src/lib/feature.ts')).toBe(false)
      expect(tree.exists('libs/my-react-lib/src/lib/feature.spec.ts')).toBe(false)
    })

    it('package.json содержит peerDependencies.react', async () => {
      await newLibGenerator(tree, { name: 'my-react-lib', react: true })

      const pkg = JSON.parse(tree.read('libs/my-react-lib/package.json', 'utf-8') ?? '{}')
      expect(pkg.peerDependencies).toEqual({ react: '>=18.0.0' })
    })

    it('tsconfig.lib.json включает jsx и dom lib', async () => {
      await newLibGenerator(tree, { name: 'my-react-lib', react: true })

      const tsconfig = JSON.parse(tree.read('libs/my-react-lib/tsconfig.lib.json', 'utf-8') ?? '{}')
      expect(tsconfig.compilerOptions.jsx).toBe('react-jsx')
      expect(tsconfig.compilerOptions.lib).toEqual(['es2022', 'dom', 'dom.iterable'])
      expect(tsconfig.include).toEqual(['src/**/*.ts', 'src/**/*.tsx'])
    })

    it('vitest.config.ts переключается на jsdom + @vitejs/plugin-react', async () => {
      await newLibGenerator(tree, { name: 'my-react-lib', react: true })

      const vitestConfig = tree.read('libs/my-react-lib/vitest.config.ts', 'utf-8')
      expect(vitestConfig).toContain(`environment: 'jsdom'`)
      expect(vitestConfig).toContain(`import react from '@vitejs/plugin-react'`)
      expect(vitestConfig).toContain(`setupFiles: ['./vitest.setup.ts']`)
    })

    it('index.ts экспортирует Feature, а не feature', async () => {
      await newLibGenerator(tree, { name: 'my-react-lib', react: true })

      const index = tree.read('libs/my-react-lib/src/index.ts', 'utf-8')
      expect(index).toContain(`export { Feature } from './lib/feature'`)
    })
  })

  it('без --react не генерирует React-каркас (дефолтное поведение не меняется)', async () => {
    await newLibGenerator(tree, { name: 'my-lib' })

    expect(tree.exists('libs/my-lib/src/lib/feature.tsx')).toBe(false)
    expect(tree.exists('libs/my-lib/vitest.setup.ts')).toBe(false)

    const pkg = JSON.parse(tree.read('libs/my-lib/package.json', 'utf-8') ?? '{}')
    expect(pkg.peerDependencies).toBeUndefined()

    const vitestConfig = tree.read('libs/my-lib/vitest.config.ts', 'utf-8')
    expect(vitestConfig).toContain(`environment: 'node'`)
  })
})
