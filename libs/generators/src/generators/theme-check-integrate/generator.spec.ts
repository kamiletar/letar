import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import themeCheckIntegrateGenerator from './generator'

function seedApp(tree: Tree, app: string, opts: { withThemeTypegen?: boolean; withLint?: boolean } = {}): void {
  const { withThemeTypegen = false, withLint = true } = opts
  tree.write(`apps/${app}/src/app/page.tsx`, 'export default function Page() { return null }')
  tree.write(
    `apps/${app}/project.json`,
    JSON.stringify({
      name: app,
      targets: {
        ...(withThemeTypegen ? { 'theme:typegen': { executor: 'nx:run-commands' } } : {}),
        ...(withLint ? { lint: { dependsOn: ['oxlint'] } } : {}),
      },
    }),
  )
}

describe('theme-check-integrate generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('падает, если приложение не найдено', async () => {
    await expect(themeCheckIntegrateGenerator(tree, { app: 'nope', skipChecks: true })).rejects.toThrow('не найдено')
  })

  it('падает, если project.json не найден', async () => {
    tree.write('apps/nolint/src/app/page.tsx', 'export default function Page() { return null }')
    await expect(themeCheckIntegrateGenerator(tree, { app: 'nolint', skipChecks: true })).rejects.toThrow(
      'project.json не найден',
    )
  })

  it('падает, если sourceDir не найден', async () => {
    tree.write('apps/flat/project.json', JSON.stringify({ name: 'flat', targets: {} }))
    await expect(themeCheckIntegrateGenerator(tree, { app: 'flat', skipChecks: true })).rejects.toThrow('не найден')
  })

  it('создаёт scripts/check-theme-hardcodes.mjs', async () => {
    seedApp(tree, 'dashboard')

    await themeCheckIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    expect(tree.exists('apps/dashboard/scripts/check-theme-hardcodes.mjs')).toBe(true)
    const content = tree.read('apps/dashboard/scripts/check-theme-hardcodes.mjs', 'utf-8') ?? ''
    expect(content).toContain('forbiddenPatterns')
    expect(content).toContain('сырой HEX-цвет')
  })

  it('добавляет таргет theme:check и подключает его в dependsOn у lint', async () => {
    seedApp(tree, 'dashboard')

    await themeCheckIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const project = JSON.parse(tree.read('apps/dashboard/project.json', 'utf-8') ?? '{}')
    expect(project.targets['theme:check'].options.command).toBe('node scripts/check-theme-hardcodes.mjs')
    expect(project.targets['theme:check'].dependsOn).toBeUndefined()
    expect(project.targets.lint.dependsOn).toEqual(['oxlint', 'theme:check'])
  })

  it('добавляет dependsOn на theme:typegen, если такой таргет уже есть', async () => {
    seedApp(tree, 'domwellbes', { withThemeTypegen: true })

    await themeCheckIntegrateGenerator(tree, { app: 'domwellbes', skipChecks: true })

    const project = JSON.parse(tree.read('apps/domwellbes/project.json', 'utf-8') ?? '{}')
    expect(project.targets['theme:check'].dependsOn).toEqual(['theme:typegen'])
  })

  it('не перезаписывает существующий скрипт с ручным allowlist', async () => {
    seedApp(tree, 'aboi')
    const manual = '// ручной allowlist, не трогать\n'
    tree.write('apps/aboi/scripts/check-theme-hardcodes.mjs', manual)

    await themeCheckIntegrateGenerator(tree, { app: 'aboi', skipChecks: true })

    expect(tree.read('apps/aboi/scripts/check-theme-hardcodes.mjs', 'utf-8')).toBe(manual)
  })

  it('идемпотентна на таргете theme:check — не дублирует dependsOn у lint при повторном запуске', async () => {
    seedApp(tree, 'dashboard')

    await themeCheckIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })
    await themeCheckIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const project = JSON.parse(tree.read('apps/dashboard/project.json', 'utf-8') ?? '{}')
    expect(project.targets.lint.dependsOn.filter((d: string) => d === 'theme:check')).toHaveLength(1)
  })

  it('обнаруживает существующие каталоги pdf/assets и включает их в ignoredDirectories', async () => {
    seedApp(tree, 'studio')
    tree.write('apps/studio/src/lib/pdf/invoice-pdf.tsx', 'export const x = 1')

    await themeCheckIntegrateGenerator(tree, { app: 'studio', skipChecks: true })

    const content = tree.read('apps/studio/scripts/check-theme-hardcodes.mjs', 'utf-8') ?? ''
    expect(content).toContain(`new Set(["generated","pdf"])`)
  })

  it('не включает pdf/assets в ignoredDirectories, если таких каталогов нет', async () => {
    seedApp(tree, 'dashboard')

    await themeCheckIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const content = tree.read('apps/dashboard/scripts/check-theme-hardcodes.mjs', 'utf-8') ?? ''
    expect(content).toContain(`new Set(["generated"])`)
  })

  it('предупреждает и не проверяет src/theme, если каталога темы нет', async () => {
    seedApp(tree, 'dashboard')

    await themeCheckIntegrateGenerator(tree, { app: 'dashboard', skipChecks: true })

    const content = tree.read('apps/dashboard/scripts/check-theme-hardcodes.mjs', 'utf-8') ?? ''
    expect(content).toContain(`const themePrefix = 'src/theme/'`)
  })

  it('не падает, если у приложения нет таргета lint — просто предупреждает', async () => {
    seedApp(tree, 'nolint', { withLint: false })

    await expect(themeCheckIntegrateGenerator(tree, { app: 'nolint', skipChecks: true })).resolves.not.toThrow()

    const project = JSON.parse(tree.read('apps/nolint/project.json', 'utf-8') ?? '{}')
    expect(project.targets['theme:check']).toBeDefined()
  })

  it('уважает кастомный --sourceDir', async () => {
    tree.write('apps/custom/app-src/page.tsx', 'export default function Page() { return null }')
    tree.write('apps/custom/project.json', JSON.stringify({ name: 'custom', targets: { lint: {} } }))

    await themeCheckIntegrateGenerator(tree, { app: 'custom', sourceDir: 'app-src', skipChecks: true })

    const project = JSON.parse(tree.read('apps/custom/project.json', 'utf-8') ?? '{}')
    expect(project.targets['theme:check']).toBeDefined()
    const content = tree.read('apps/custom/scripts/check-theme-hardcodes.mjs', 'utf-8') ?? ''
    expect(content).toContain(`join(projectRoot, 'app-src')`)
  })

  it('возвращает GeneratorCallback, если skipChecks не передан', async () => {
    seedApp(tree, 'dashboard')

    const callback = await themeCheckIntegrateGenerator(tree, { app: 'dashboard' })

    expect(typeof callback).toBe('function')
  })
})
