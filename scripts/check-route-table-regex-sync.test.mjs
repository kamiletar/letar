#!/usr/bin/env bun
// Тесты для check-route-table-regex-sync.mjs — запускать
// `bun test scripts/check-route-table-regex-sync.test.mjs`.
//
// ⚠️ Как и в самом скрипте, в этом файле нет ни одного обратного слэша: фикстуры собираются из
// BS = String.fromCharCode(92). Литерал слэша в исходнике теста портится тем же heredoc/Edit, из-за
// которого такие сторожа вообще понадобились (.claude/docs/zenstack-form-meta-directive-pitfalls.md § 2).
// Отдельный тест сверяет, что фикстура легла на диск с ожидаемым числом слэшей, — по байтам, а не по виду.

import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  compareSides,
  CONSTANTS,
  findRegexConstant,
  readRegexLiteral,
  resolveConstant,
  SIDES,
} from './check-route-table-regex-sync.mjs'

const SCRIPT_PATH = fileURLToPath(new URL('./check-route-table-regex-sync.mjs', import.meta.url))
const REPO_ROOT = join(dirname(SCRIPT_PATH), '..')
const BS = String.fromCharCode(92)
const NL = String.fromCharCode(10)

// Эталонные литералы — те, что сейчас стоят в обеих копиях. Собраны из BS, а не записаны буквально.
const HEADER = `/Route ${BS}((?:app|pages)${BS})/`
const LEGEND = `/${BS}((?:Static|SSG|ISR|Dynamic|Partial Prerender)${BS})/`
const BLANK = `/^(?:#${BS}d+${BS}s+[${BS}d.]+)?${BS}s*$/`

// Исходник одной стороны: три константы плюс код, который упоминает их имена (чтобы проверить, что
// вызовы вроде `X.test(line)` и комментарии за объявление не принимаются).
function sideSource({ header = HEADER, legend = LEGEND, blank = BLANK, extra = '' } = {}) {
  return [
    '// ROUTE_HEADER_RE — упоминание в комментарии, не объявление',
    `const ROUTE_HEADER_RE = ${header}`,
    `const LEGEND_RE = ${legend}`,
    '// префикс docker build',
    `const BLANK_RE = ${blank}`,
    extra,
    'export function use(line) { return ROUTE_HEADER_RE.test(line) && LEGEND_RE.test(line) && BLANK_RE.test(line) }',
    '',
  ].join(NL)
}

const tempDirs = []
afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

function makeRoot(files) {
  const dir = mkdtempSync(join(tmpdir(), 'route-table-sync-test-'))
  tempDirs.push(dir)
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  return dir
}

function runScript(root) {
  const res = Bun.spawnSync([process.execPath, SCRIPT_PATH, `--root=${root}`], { stdout: 'pipe', stderr: 'pipe' })
  return {
    code: res.exitCode,
    out: res.stdout.toString('utf8'),
    err: res.stderr.toString('utf8'),
  }
}

const pair = (left, right) => ({
  [SIDES[0].file]: left,
  [SIDES[1].file]: right,
})

describe('фикстуры', () => {
  test('слэши легли на диск в ожидаемом числе (по байтам)', () => {
    const root = makeRoot(pair(sideSource(), sideSource()))
    const text = readFileSync(join(root, SIDES[0].file), 'utf8')
    // HEADER: 2 (скобки), LEGEND: 2 (скобки), BLANK: 4 (d, s, d, s)
    const count = text.split(BS).length - 1
    expect(count).toBe(2 + 2 + 4)
  })
})

describe('readRegexLiteral', () => {
  test('читает тело и флаги', () => {
    expect(readRegexLiteral('/ab+c/gi;', 0)).toEqual({ literal: '/ab+c/gi' })
  })

  test('экранированный слэш не закрывает литерал', () => {
    const line = `/a${BS}/b/`
    expect(readRegexLiteral(line, 0)).toEqual({ literal: line })
  })

  test('слэш внутри класса не закрывает литерал', () => {
    expect(readRegexLiteral('/[/]x/', 0)).toEqual({ literal: '/[/]x/' })
  })

  test('экранированная скобка класса не открывает класс', () => {
    const line = `/${BS}[/`
    expect(readRegexLiteral(line, 0)).toEqual({ literal: line })
  })

  test('незакрытый литерал — ошибка, а не молчание', () => {
    expect(readRegexLiteral('/abc', 0).error).toContain('не закрыт')
  })
})

describe('findRegexConstant', () => {
  test('находит обычное объявление и export const', () => {
    const text = `const A_RE = /a/${NL}export const B_RE = /b/g${NL}`
    expect(findRegexConstant(text, 'A_RE')).toEqual([{ line: 1, literal: '/a/' }])
    expect(findRegexConstant(text, 'B_RE')).toEqual([{ line: 2, literal: '/b/g' }])
  })

  test('понимает аннотацию типа и отступ', () => {
    const text = `  const A_RE: RegExp = /a/i${NL}`
    expect(findRegexConstant(text, 'A_RE')).toEqual([{ line: 1, literal: '/a/i' }])
  })

  test('комментарии и вызовы за объявление не считаются', () => {
    const text = `// const A_RE = /x/${NL}return A_RE.test(line)${NL}`
    expect(findRegexConstant(text, 'A_RE')).toEqual([])
  })

  test('имя-префикс не совпадает с другим именем', () => {
    const text = `const A_RE_LONG = /a/${NL}`
    expect(findRegexConstant(text, 'A_RE')).toEqual([])
  })

  test('объявление не с регулярки (строка, число) игнорируется', () => {
    const text = `const A_RE = 'x'${NL}const B_RE = 5${NL}`
    expect(findRegexConstant(text, 'A_RE')).toEqual([])
    expect(findRegexConstant(text, 'B_RE')).toEqual([])
  })

  test('два объявления возвращаются оба, с номерами строк', () => {
    const text = `const A_RE = /a/${NL}const A_RE = /b/${NL}`
    expect(findRegexConstant(text, 'A_RE').map((f) => f.line)).toEqual([1, 2])
  })
})

describe('resolveConstant', () => {
  test('не найдена — problem с подсказкой про CONSTANTS', () => {
    expect(resolveConstant('const X = /a/', 'A_RE').problem).toContain('CONSTANTS')
  })

  test('объявлена дважды — problem с номерами строк', () => {
    const problem = resolveConstant(`const A_RE = /a/${NL}const A_RE = /b/`, 'A_RE').problem
    expect(problem).toContain('2 раза')
    expect(problem).toContain('1, 2')
  })

  test('литерал не компилируется — problem с номером строки', () => {
    const problem = resolveConstant('const A_RE = /(/', 'A_RE').problem
    expect(problem).toContain('не компилируется')
    expect(problem).toContain('строка 1')
  })

  test('незакрытый литерал — problem', () => {
    expect(resolveConstant('const A_RE = /abc', 'A_RE').problem).toContain('не закрыт')
  })

  test('нормальная константа возвращает литерал и строку', () => {
    expect(resolveConstant(`${NL}const A_RE = /a/g${NL}`, 'A_RE')).toEqual({ literal: '/a/g', line: 2 })
  })
})

describe('compareSides', () => {
  const left = (over) => ({ label: 'левая', text: sideSource(over) })
  const right = (over) => ({ label: 'правая', text: sideSource(over) })

  test('одинаковые копии — проблем нет, по строке на константу', () => {
    const { rows, problems } = compareSides(left(), right())
    expect(problems).toEqual([])
    expect(rows.map((r) => r.name)).toEqual(CONSTANTS)
    expect(rows.every((r) => r.same)).toBe(true)
  })

  test('разное тело регулярки — расхождение называет константу и обе стороны', () => {
    const drifted = `/${BS}((?:Static|SSG|Dynamic)${BS})/`
    const { problems, rows } = compareSides(left(), right({ legend: drifted }))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('LEGEND_RE разошлась')
    expect(problems[0]).toContain('левая')
    expect(problems[0]).toContain('правая')
    expect(rows.find((r) => r.name === 'LEGEND_RE').same).toBe(false)
    expect(rows.filter((r) => r.same)).toHaveLength(2)
  })

  test('разные флаги тоже расхождение', () => {
    const { problems } = compareSides(left(), right({ header: `${HEADER}i` }))
    expect(problems.some((p) => p.includes('ROUTE_HEADER_RE разошлась'))).toBe(true)
  })

  test('смысловая эквивалентность с другой записью — тоже расхождение (сравнение текстовое)', () => {
    const reordered = `/Route ${BS}((?:pages|app)${BS})/`
    const { problems } = compareSides(left(), right({ header: reordered }))
    expect(problems).toHaveLength(1)
  })

  test('константа потеряна на одной стороне — проблема, а не молчаливая зелень', () => {
    const lost = { label: 'правая', text: sideSource().replace('BLANK_RE', 'BLANK_PATTERN') }
    const { problems } = compareSides(left(), lost)
    expect(problems.some((p) => p.startsWith('правая:') && p.includes('BLANK_RE не найдена'))).toBe(true)
  })

  test('дубликат объявления на одной стороне — проблема', () => {
    const { problems } = compareSides(left(), right({ extra: 'const LEGEND_RE = /other/' }))
    expect(problems.some((p) => p.includes('LEGEND_RE объявлена 2 раза'))).toBe(true)
  })

  test('несколько расхождений сообщаются все, а не только первое', () => {
    const { problems } = compareSides(left(), right({ header: '/x/', blank: '/y/' }))
    expect(problems).toHaveLength(2)
  })
})

describe('CLI (--root)', () => {
  test('синхронные копии — код 0', () => {
    const { code, out } = runScript(makeRoot(pair(sideSource(), sideSource())))
    expect(code).toBe(0)
    expect(out).toContain('синхронны')
  })

  test('расхождение — код 1, в выводе константа и оба пути', () => {
    const drifted = sideSource({ legend: '/other/' })
    const { code, err } = runScript(makeRoot(pair(sideSource(), drifted)))
    expect(code).toBe(1)
    expect(err).toContain('LEGEND_RE разошлась')
    expect(err).toContain(SIDES[0].file)
    expect(err).toContain(SIDES[1].file)
  })

  test('отсутствует файл одной из копий — код 1, а не «синхронно»', () => {
    const { code, err } = runScript(makeRoot({ [SIDES[0].file]: sideSource() }))
    expect(code).toBe(1)
    expect(err).toContain('файла нет')
    expect(err).toContain(SIDES[1].file)
  })

  test('пустой корень — код 1 с двумя проблемами', () => {
    const { code, err } = runScript(makeRoot({ 'stub.txt': 'x' }))
    expect(code).toBe(1)
    expect(err).toContain('2 проблем')
  })
})

describe('настоящий репозиторий', () => {
  test('обе живые копии синхронны прямо сейчас', () => {
    const sides = SIDES.map((s) => ({ label: s.label, text: readFileSync(join(REPO_ROOT, s.file), 'utf8') }))
    const { problems, rows } = compareSides(sides[0], sides[1])
    expect(problems).toEqual([])
    expect(rows).toHaveLength(CONSTANTS.length)
  })
})
