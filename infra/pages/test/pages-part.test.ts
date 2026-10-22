import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildFiles, readSetting, titleFromHtml } from '../../../.claude/mcp/pages-part'

describe('pages-part', () => {
  test('titleFromHtml берёт название и сжимает пробелы', () => {
    expect(titleFromHtml('<html><title> Одна  задача\n— один файл </title>')).toBe('Одна задача — один файл')
    expect(titleFromHtml('<p>без заголовка</p>')).toBe('')
  })

  test('buildFiles: основной файл как index.html, текст и бинарь рядом', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pp-'))
    mkdirSync(join(dir, 'img'))
    writeFileSync(join(dir, 'plan.html'), '<title>x</title>')
    writeFileSync(join(dir, 'style.css'), 'a{}')
    writeFileSync(join(dir, 'img', 'a.png'), Buffer.from([1, 2, 3]))
    const files = buildFiles(join(dir, 'plan.html'), ['style.css', 'img/a.png'])
    expect(files['index.html']).toEqual({ text: '<title>x</title>' })
    expect(files['style.css']).toEqual({ text: 'a{}' })
    expect(files['img/a.png']).toEqual({ base64: Buffer.from([1, 2, 3]).toString('base64') })
  })

  test('buildFiles не выходит за каталог страницы', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pp-'))
    writeFileSync(join(dir, 'plan.html'), 'x')
    expect(() => buildFiles(join(dir, 'plan.html'), ['../secret.txt'])).toThrow('вне каталога')
  })

  test('readSetting: окружение важнее .env.local', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pp-'))
    writeFileSync(join(dir, '.env.local'), 'PAGES_URL="https://file.test"\nOTHER=1\n')
    expect(readSetting('PAGES_URL', dir, {})).toBe('https://file.test')
    expect(readSetting('PAGES_URL', dir, { PAGES_URL: 'https://env.test' })).toBe('https://env.test')
    expect(readSetting('NOPE', dir, {})).toBeUndefined()
  })
})
