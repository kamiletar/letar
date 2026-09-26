import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Q7 — «пакет не тянет лишнего»: ZenStack живёт только в подпути `/zenstack`, TanStack Query — только в
 * `forms-query`, ядро `@letar/forms` о нём не знает. Проверка по исходникам — всегда; по собранному `dist` —
 * когда он есть (`nx build:npm forms-query`).
 */
const libRoot = path.resolve(__dirname, '../..')
const formsRoot = path.resolve(libRoot, '../forms')

function listFiles(dir: string, pattern: RegExp): string[] {
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      return name === 'node_modules' || name === 'dist' ? [] : listFiles(full, pattern)
    }
    return pattern.test(name) && !/\.spec\./.test(name) ? [full] : []
  })
}

const read = (file: string) => readFileSync(file, 'utf-8')
const importsPackage = (source: string, name: string) =>
  new RegExp(`from\\s+['"]${name}|require\\(['"]${name}`).test(source)

describe('импорты (Q7)', () => {
  it('исходники основной точки входа не импортируют ZenStack', () => {
    const files = listFiles(path.join(libRoot, 'src/lib'), /\.tsx?$/).concat(path.join(libRoot, 'src/index.ts'))
    expect(files.length).toBeGreaterThan(3)
    for (const file of files) {
      expect(importsPackage(read(file), '@zenstackhq'), file).toBe(false)
    }
  })

  it('ZenStack импортирует только zenstack.ts', () => {
    expect(importsPackage(read(path.join(libRoot, 'src/zenstack.ts')), '@zenstackhq/tanstack-query')).toBe(true)
  })

  it('исходники @letar/forms не импортируют TanStack Query', () => {
    const files = listFiles(path.join(formsRoot, 'src'), /\.tsx?$/)
    expect(files.length).toBeGreaterThan(50)
    const offenders = files.filter((file) => importsPackage(read(file), '@tanstack/react-query'))
    expect(offenders).toEqual([])
  })

  const distIndex = path.join(libRoot, 'dist/index.js')
  it.skipIf(!existsSync(distIndex))('собранный dist без ZenStack, кроме zenstack.js', () => {
    const chunks = readdirSync(path.join(libRoot, 'dist')).filter((name) => /^(index|chunk-.*)\.js$/.test(name))
    for (const name of chunks) {
      expect(read(path.join(libRoot, 'dist', name)), name).not.toContain('@zenstackhq')
    }
    expect(read(path.join(libRoot, 'dist/zenstack.js'))).toContain('@zenstackhq/tanstack-query/react')
  })

  const formsDist = path.join(formsRoot, 'dist/index.js')
  it.skipIf(!existsSync(formsDist))('собранный @letar/forms без TanStack Query', () => {
    expect(read(formsDist)).not.toContain('@tanstack/react-query')
  })
})
