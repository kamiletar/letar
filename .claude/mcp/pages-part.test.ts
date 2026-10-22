import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildFiles } from './pages-part'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pages-part-'))
  writeFileSync(join(dir, 'a.html'), '<p>x</p>')
  writeFileSync(join(dir, 'style.css'), 'p{}')
  writeFileSync(join(dir, 'pic.png'), Buffer.from([1, 2]))
  writeFileSync(join(dir, '.env'), 'SECRET=1')
  writeFileSync(join(dir, 'key.pem'), 'k')
  mkdirSync(join(dir, 'sub'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('buildFiles', () => {
  test('html и безопасные ассеты собираются', () => {
    const files = buildFiles(join(dir, 'a.html'), ['style.css', 'pic.png'])
    expect(files['index.html']?.text).toBe('<p>x</p>')
    expect(files['style.css']?.text).toBe('p{}')
    expect(files['pic.png']?.base64).toBeDefined()
  })

  test('основной файл не html, скрытый файл, чужой тип и выход за каталог отвергаются', () => {
    expect(() => buildFiles(join(dir, '.env'))).toThrow()
    expect(() => buildFiles(join(dir, 'a.html'), ['.env'])).toThrow('скрытые')
    expect(() => buildFiles(join(dir, 'a.html'), ['key.pem'])).toThrow('не разрешён')
    expect(() => buildFiles(join(dir, 'a.html'), ['../x.png'])).toThrow('вне каталога')
  })
})
