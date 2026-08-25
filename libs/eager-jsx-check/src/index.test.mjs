import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findEagerJsx } from './index.mjs'

describe('findEagerJsx', () => {
  let projectRoot

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'eager-jsx-check-'))
  })

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
  })

  async function writeSrcFile(relativePath, content) {
    const absolutePath = join(projectRoot, relativePath)
    await mkdir(join(absolutePath, '..'), { recursive: true })
    await writeFile(absolutePath, content, 'utf8')
  }

  it('находит JSX как значение свойства объекта', async () => {
    await writeSrcFile('src/toolbar-config.tsx', 'export const TOOLBAR_CONFIG = { bold: { icon: <LuBold /> } }')

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({
      file: 'src/toolbar-config.tsx',
      label: 'JSX как значение свойства объекта',
    })
  })

  it('находит JSX как top-level const-инициализатор', async () => {
    await writeSrcFile('src/skeleton.tsx', 'export const fallback = <Skeleton />')

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(1)
    expect(violations[0].label).toBe('JSX как top-level инициализатор const')
  })

  it('находит JSX как аргумент top-level вызова функции', async () => {
    await writeSrcFile(
      'src/lazy-component.tsx',
      'export const LazyThing = createLazyComponentBase(importFn, <Skeleton />)',
    )

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(1)
    expect(violations[0].label).toBe('JSX как top-level аргумент вызова функции')
  })

  it('не матчит JSX внутри render-колбэка', async () => {
    await writeSrcFile('src/field.tsx', 'export const config = { render: () => <Icon /> }')

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('не матчит JSX внутри стрелочной функции-значения', async () => {
    await writeSrcFile('src/field.tsx', 'export const factory = { icon: () => <Icon /> }')

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('не матчит generic-тип вида Array<Foo>', async () => {
    await writeSrcFile('src/types.tsx', 'function f(x: Array<Foo>) { return x }')

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('не матчит generic-параметр с дефолтом вида <TValue = unknown>', async () => {
    await writeSrcFile('src/generic.tsx', 'export function useX<TValue = unknown>(): TValue { return null as TValue }')

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('не матчит тернарник внутри render (condition ? <A/> : <B/>)', async () => {
    await writeSrcFile(
      'src/render.tsx',
      'export const X = () => (visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />)',
    )

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('не матчит многострочный тернарник (: <B /> на отдельной строке)', async () => {
    await writeSrcFile(
      'src/multiline-ternary.tsx',
      [
        'export function Widget() {',
        '  return isImage',
        '    ? <FileImageList clearable={clearable} />',
        '    : <FileList showSize={showSize} clearable={clearable} />',
        '}',
      ].join('\n'),
    )

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('не матчит JSX-пример внутри JSDoc-комментария', async () => {
    await writeSrcFile(
      'src/documented.tsx',
      [
        '/**',
        ' * @example',
        ' * options={[',
        " *   { label: 'Admin', value: 'admin', icon: <ShieldIcon /> },",
        ' * ]}',
        ' */',
        'export function noop() {}',
      ].join('\n'),
    )

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('не матчит JSX внутри тела функции (не top-level)', async () => {
    await writeSrcFile(
      'src/component.tsx',
      'export function Widget() {\n  const fallback = <Skeleton />\n  return fallback\n}',
    )

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('пропускает значение из allowedMatches для конкретного файла', async () => {
    await writeSrcFile('src/skeleton.tsx', 'export const fallback = <Skeleton />')

    const violations = await findEagerJsx({
      projectRoot,
      allowedMatches: new Map([['src/skeleton.tsx', new Set(['<Skeleton />'])]]),
    })

    expect(violations).toHaveLength(0)
  })

  it('игнорирует каталоги из ignoredDirectories', async () => {
    await writeSrcFile('src/generated/icons.tsx', 'export const icon = <LuBold />')

    const violations = await findEagerJsx({ projectRoot, ignoredDirectories: new Set(['generated']) })

    expect(violations).toHaveLength(0)
  })

  it('игнорирует не-.tsx файлы', async () => {
    await writeSrcFile('src/config.ts', 'export const label = "icon: <LuBold />"')

    const violations = await findEagerJsx({ projectRoot })

    expect(violations).toHaveLength(0)
  })
})
