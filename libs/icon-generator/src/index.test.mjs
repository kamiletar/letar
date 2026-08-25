import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_ICO_SIZES, DEFAULT_SIZES, generateIcons } from './index.mjs'

const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    + '<rect width="100" height="100" fill="#4477ff"/></svg>',
)

let outDir

afterEach(() => {
  if (outDir) {
    rmSync(outDir, { recursive: true, force: true })
    outDir = undefined
  }
})

describe('generateIcons', () => {
  it('пишет PNG всех запрошенных размеров, icon.png и icon.ico', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'icon-generator-'))

    const result = await generateIcons({ svgBuffer: SVG, outDir, sizes: [16, 32], icoSizes: [16, 32] })

    expect(result.pngPaths).toHaveLength(2)
    expect(readFileSync(result.mainIconPath).length).toBeGreaterThan(0)
    expect(readFileSync(result.icoPath).length).toBeGreaterThan(0)
  })

  it('пропускает icoSize, отсутствующий в sizes, без падения', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'icon-generator-'))

    const result = await generateIcons({ svgBuffer: SVG, outDir, sizes: [32], icoSizes: [16, 32] })

    expect(readFileSync(result.icoPath).length).toBeGreaterThan(0)
  })

  it('экспортирует ожидаемые дефолты', () => {
    expect(DEFAULT_SIZES).toContain(256)
    expect(DEFAULT_ICO_SIZES).toEqual([16, 32, 48, 256])
  })
})
