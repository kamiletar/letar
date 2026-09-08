import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  findFilesRecursively,
  findFonts,
  getFontInfo,
  getFontMimeType,
  matchFonts,
  normalizeFontName,
} from './font-matcher'

// === normalizeFontName ===

describe('normalizeFontName', () => {
  it('приводит к нижнему регистру', () => {
    expect(normalizeFontName('Comic Sans')).toBe('comic sans')
  })

  it('схлопывает несколько пробелов в один', () => {
    expect(normalizeFontName('Comic   Sans   MS')).toBe('comic sans ms')
  })

  it('обрезает пробелы по краям', () => {
    expect(normalizeFontName('  Arial  ')).toBe('arial')
  })
})

// === getFontInfo ===

describe('getFontInfo', () => {
  it('распознаёт .ttf', () => {
    expect(getFontInfo('C:/fonts/Arial.ttf')).toEqual({ name: 'Arial', format: 'ttf', isOpenType: false })
  })

  it('распознаёт .otf как OpenType', () => {
    expect(getFontInfo('C:/fonts/Arial.otf')).toEqual({ name: 'Arial', format: 'otf', isOpenType: true })
  })

  it('распознаёт .woff', () => {
    expect(getFontInfo('C:/fonts/Roboto.woff')).toEqual({ name: 'Roboto', format: 'woff', isOpenType: false })
  })

  it('распознаёт .woff2', () => {
    expect(getFontInfo('C:/fonts/Roboto.woff2')).toEqual({ name: 'Roboto', format: 'woff2', isOpenType: false })
  })

  it('распознаёт формат по расширению независимо от регистра, но не убирает регистрозависимое расширение из имени', () => {
    // path.basename(file, ext) — сравнение суффикса чувствительно к регистру в Node.js,
    // поэтому при .TTF (не .ttf) расширение не отрезается от имени, хотя формат определён верно
    expect(getFontInfo('C:/fonts/Arial.TTF')).toEqual({ name: 'Arial.TTF', format: 'ttf', isOpenType: false })
  })
})

// === getFontMimeType ===

describe('getFontMimeType', () => {
  it('.ttf → application/x-truetype-font', () => {
    expect(getFontMimeType('font.ttf')).toBe('application/x-truetype-font')
  })

  it('.otf → application/vnd.ms-opentype', () => {
    expect(getFontMimeType('font.otf')).toBe('application/vnd.ms-opentype')
  })

  it('.woff → font/woff', () => {
    expect(getFontMimeType('font.woff')).toBe('font/woff')
  })

  it('.woff2 → font/woff2', () => {
    expect(getFontMimeType('font.woff2')).toBe('font/woff2')
  })

  it('неизвестное расширение → фолбэк на truetype', () => {
    expect(getFontMimeType('font.xyz')).toBe('application/x-truetype-font')
  })
})

// === findFilesRecursively / findFonts / matchFonts (реальная ФС) ===

describe('операции с реальной файловой системой', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-matcher-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function writeFile(relPath: string, content = ''): void {
    const fullPath = path.join(tmpDir, relPath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content)
  }

  describe('findFilesRecursively', () => {
    it('возвращает [] на несуществующей директории без исключения', () => {
      const result = findFilesRecursively(path.join(tmpDir, 'does-not-exist'), ['.ttf'])
      expect(result).toEqual([])
    })

    it('находит файлы во вложенной подпапке (рекурсия)', () => {
      writeFile('root.ttf')
      writeFile('nested/deep.ttf')
      writeFile('nested/deeper/deepest.ttf')

      const result = findFilesRecursively(tmpDir, ['.ttf'])

      expect(result).toHaveLength(3)
      expect(result).toContain(path.join(tmpDir, 'root.ttf'))
      expect(result).toContain(path.join(tmpDir, 'nested', 'deep.ttf'))
      expect(result).toContain(path.join(tmpDir, 'nested', 'deeper', 'deepest.ttf'))
    })

    it('не включает файлы других расширений (мусор)', () => {
      writeFile('font.ttf')
      writeFile('readme.txt')
      writeFile('image.png')

      const result = findFilesRecursively(tmpDir, ['.ttf'])

      expect(result).toEqual([path.join(tmpDir, 'font.ttf')])
    })
  })

  describe('findFonts', () => {
    it('находит шрифты всех поддерживаемых форматов, игнорируя мусор', () => {
      writeFile('Arial.ttf')
      writeFile('Roboto.otf')
      writeFile('Nested/OpenSans.woff')
      writeFile('Nested/OpenSans.woff2')
      writeFile('readme.md')
      writeFile('cover.jpg')

      const result = findFonts(tmpDir)

      expect(result).toHaveLength(4)
      expect(result).toContain(path.join(tmpDir, 'Arial.ttf'))
      expect(result).toContain(path.join(tmpDir, 'Roboto.otf'))
      expect(result).toContain(path.join(tmpDir, 'Nested', 'OpenSans.woff'))
      expect(result).toContain(path.join(tmpDir, 'Nested', 'OpenSans.woff2'))
    })
  })

  describe('matchFonts', () => {
    it('матчит по частичному вхождению имени в обе стороны, без дублей', () => {
      writeFile('Comic Sans Bold.ttf')
      writeFile('Arial.ttf')
      writeFile('Nested/Roboto Mono.otf')

      const result = matchFonts(tmpDir, ['Comic Sans', 'Arial', 'Roboto Mono', 'Roboto Mono'])

      expect(result).toHaveLength(3)
      expect(result).toContain(path.join(tmpDir, 'Comic Sans Bold.ttf'))
      expect(result).toContain(path.join(tmpDir, 'Arial.ttf'))
      expect(result).toContain(path.join(tmpDir, 'Nested', 'Roboto Mono.otf'))
      // Set внутри исключает дубли даже если несколько запрошенных имён матчат один файл
      expect(new Set(result).size).toBe(result.length)
    })

    it('не матчит шрифты без совпадения', () => {
      writeFile('Arial.ttf')

      const result = matchFonts(tmpDir, ['Wingdings'])

      expect(result).toEqual([])
    })

    it('на пустой/несуществующей директории возвращает []', () => {
      const result = matchFonts(path.join(tmpDir, 'missing'), ['Arial'])
      expect(result).toEqual([])
    })
  })
})
