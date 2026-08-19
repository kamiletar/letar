import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findThemeHardcodes } from './index.mjs'

describe('findThemeHardcodes', () => {
  let projectRoot

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'theme-check-'))
  })

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
  })

  async function writeSrcFile(relativePath, content) {
    const absolutePath = join(projectRoot, relativePath)
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(absolutePath, '..'), { recursive: true })
    await writeFile(absolutePath, content, 'utf8')
  }

  it('находит сырой HEX-цвет вне allowlist', async () => {
    await writeSrcFile('src/app/page.tsx', 'const color = "#FF0000"')

    const violations = await findThemeHardcodes({ projectRoot })

    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ file: 'src/app/page.tsx', label: 'сырой HEX-цвет', value: '#FF0000' })
  })

  it('пропускает значение из allowedMatches для конкретного файла', async () => {
    await writeSrcFile('src/app/layout.tsx', 'const themeColor = "#1A1A2E"')

    const violations = await findThemeHardcodes({
      projectRoot,
      allowedMatches: new Map([['src/app/layout.tsx', new Set(['#1A1A2E'])]]),
    })

    expect(violations).toHaveLength(0)
  })

  it('не проверяет файлы под themePrefix для правил без includeTheme', async () => {
    await writeSrcFile('src/theme/palette.ts', 'export const brand = "#C25E3A"')

    const violations = await findThemeHardcodes({ projectRoot })

    expect(violations).toHaveLength(0)
  })

  it('проверяет themePrefix для правил с includeTheme: true (сырое scale())', async () => {
    await writeSrcFile('src/theme/recipes/button.ts', 'transform: "scale(0.97)"')

    const violations = await findThemeHardcodes({ projectRoot })

    expect(violations).toHaveLength(1)
    expect(violations[0].label).toBe('сырая глубина нажатия scale()')
  })

  it('игнорирует каталоги из ignoredDirectories', async () => {
    await writeSrcFile('src/generated/prisma.ts', 'const x = "#123456"')

    const violations = await findThemeHardcodes({ projectRoot, ignoredDirectories: new Set(['generated']) })

    expect(violations).toHaveLength(0)
  })

  it('игнорирует не-.ts/.tsx файлы', async () => {
    await writeSrcFile('src/app/globals.css', 'body { color: #123456; }')

    const violations = await findThemeHardcodes({ projectRoot })

    expect(violations).toHaveLength(0)
  })
})
