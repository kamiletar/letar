#!/usr/bin/env bun
// Тесты для check-zmodel-regex-backslashes.mjs — запускать
// `bun test scripts/check-zmodel-regex-backslashes.test.mjs`.
//
// ⚠️ Как и в самом скрипте, в этом файле нет ни одного обратного слэша: фикстуры собираются
// из BS = String.fromCharCode(92). Литерал слэша в исходнике теста портится тем же
// heredoc/Edit, из-за которого сторож вообще понадобился (.claude/docs/
// zenstack-form-meta-directive-pitfalls.md § 2). Отдельный тест сверяет, что на диск
// фикстура легла с тем числом слэшей, которое задумано, — по байтам, а не по виду.

import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  analyzePattern,
  decodeLangiumString,
  findPatterns,
  scanZmodelText,
  tokenize,
} from './check-zmodel-regex-backslashes.mjs'

const SCRIPT_PATH = fileURLToPath(new URL('./check-zmodel-regex-backslashes.mjs', import.meta.url))
const BS = String.fromCharCode(92)
const NL = String.fromCharCode(10)
const TAB = String.fromCharCode(9)
const slashes = (n) => BS.repeat(n)

const tempDirs = []
afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

function makeRoot(files) {
  const dir = mkdtempSync(join(tmpdir(), 'zmodel-regex-test-'))
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

// Модель с одним полем и одним @regex; body — сырой текст между кавычками.
const zmodelWithRegex = (body) => `model M {${NL}  email String? @regex("${body}", "msg")${NL}}${NL}`

describe('analyzePattern: серии слэшей', () => {
  test.each(['s', 'd', 'w', 'S', 'D', 'W', 'B', '.'])('одиночный слэш перед «%s» — ошибка', (c) => {
    const findings = analyzePattern(`a${slashes(1)}${c}b`)
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('error')
    expect(findings[0].message).toContain(`«${slashes(2)}${c}»`)
  })

  test('одиночный слэш перед b — ошибка про backspace', () => {
    const findings = analyzePattern(`${slashes(1)}bword${slashes(1)}b`)
    expect(findings).toHaveLength(2)
    expect(findings.every((f) => f.severity === 'error' && f.message.includes('backspace'))).toBe(true)
  })

  test('одиночный слэш перед скобкой и другими метасимволами — тоже ошибка', () => {
    for (const c of ['(', ')', '[', '+', '*', '?', '-', '1', 'p']) {
      const findings = analyzePattern(`x${slashes(1)}${c}y`)
      expect(findings.map((f) => f.severity)).toEqual(['error'])
    }
  })

  test('пара слэшей — норма', () => {
    expect(analyzePattern(`^[^@${slashes(2)}s]+${slashes(2)}.[a-z]$`)).toEqual([])
  })

  test('одиночный слэш перед n, r, t, f, v, 0 и «/» безвреден', () => {
    for (const c of ['n', 'r', 't', 'f', 'v', '0', '/']) {
      expect(analyzePattern(`a${slashes(1)}${c}b`)).toEqual([])
    }
  })

  test('три слэша — предупреждение', () => {
    const findings = analyzePattern(`a${slashes(3)}sb`)
    expect(findings.map((f) => f.severity)).toEqual(['warn'])
  })

  test('четыре слэша и больше — предупреждение, не ошибка', () => {
    expect(analyzePattern(`a${slashes(4)}sb`).map((f) => f.severity)).toEqual(['warn'])
    expect(analyzePattern(`a${slashes(6)}sb`).map((f) => f.severity)).toEqual(['warn'])
  })

  test('паттерн без слэшей — чисто', () => {
    expect(analyzePattern('^([0-9]{10}|[0-9]{12})?$')).toEqual([])
  })

  test('серии считаются независимо друг от друга', () => {
    const raw = `${slashes(2)}d+${slashes(1)}s${slashes(4)}w`
    expect(analyzePattern(raw).map((f) => f.severity)).toEqual(['error', 'warn'])
  })
})

describe('decodeLangiumString: во что превращается литерал', () => {
  test('пара даёт один слэш, одиночный перед классом теряется', () => {
    expect(decodeLangiumString(`${slashes(2)}s`)).toBe(`${BS}s`)
    expect(decodeLangiumString(`${slashes(1)}s`)).toBe('s')
    expect(decodeLangiumString(`${slashes(4)}s`)).toBe(`${BS}${BS}s`)
  })

  test('b превращается в backspace, n — в перевод строки', () => {
    expect(decodeLangiumString(`${slashes(1)}b`)).toBe(String.fromCharCode(8))
    expect(decodeLangiumString(`${slashes(1)}n`)).toBe(NL)
  })
})

describe('findPatterns / scanZmodelText: разбор строкового литерала', () => {
  test('находит нативный @regex и @meta form.props.pattern', () => {
    const text = [
      `model M {`,
      `  a String? @regex("${slashes(2)}d+", "m")`,
      `  b String? @meta("form.props.pattern", "${slashes(1)}w+")`,
      `}`,
    ].join(NL)
    const scanned = scanZmodelText(text)
    expect(scanned.map((p) => [p.attr, p.line, p.findings.length])).toEqual([
      ['@regex', 2, 0],
      ['@meta("form.props.pattern")', 3, 1],
    ])
  })

  test('другие ключи @meta не считаются паттернами', () => {
    const text = `model M { a String @meta("form.title", "${slashes(1)}s") }`
    expect(scanZmodelText(text)).toEqual([])
  })

  test('закомментированный атрибут игнорируется (// , /// и блочный)', () => {
    const bad = `@regex("${slashes(1)}s")`
    const text = [`// ${bad}`, `/// ${bad}`, `/* ${bad} */`, `model M {}`].join(NL)
    expect(scanZmodelText(text)).toEqual([])
  })

  test('«//» внутри строки не начинает комментарий', () => {
    const text = `model M { a String @regex("^https?://${slashes(1)}S+$") }`
    const [pattern] = scanZmodelText(text)
    expect(pattern.raw).toBe(`^https?://${slashes(1)}S+$`)
    expect(pattern.findings).toHaveLength(1)
  })

  test('экранированная кавычка не закрывает литерал', () => {
    const text = `model M { a String @regex("a${BS}"${slashes(1)}sb") }`
    const [pattern] = scanZmodelText(text)
    expect(pattern.raw).toBe(`a${BS}"${slashes(1)}sb`)
    expect(pattern.findings.map((f) => f.severity)).toEqual(['error'])
  })

  test('одинарные кавычки и именованный аргумент', () => {
    const text = `model M { a String @regex(regex: '${slashes(1)}d') }`
    const [pattern] = scanZmodelText(text)
    expect(pattern.findings.map((f) => f.severity)).toEqual(['error'])
  })

  test('@regex без строкового аргумента не даёт паттерна и не падает', () => {
    expect(findPatterns(tokenize('model M { a String @regex(someVar) }'))).toEqual([])
  })

  test('незакрытая строка не приводит к зависанию', () => {
    expect(() => scanZmodelText(`model M { a String @regex("${slashes(1)}s`)).not.toThrow()
  })
})

describe('запуск скрипта на синтетическом корне', () => {
  test('фикстура ложится на диск с задуманным числом слэшей (сверка по байтам)', () => {
    const root = makeRoot({ 'apps/a/schema.zmodel': zmodelWithRegex(slashes(2) + 's') })
    const bytes = readFileSync(join(root, 'apps/a/schema.zmodel'))
    expect(bytes.filter((b) => b === 0x5c).length).toBe(2)
  })

  test('одиночный слэш — код возврата 1 и подсказка', () => {
    const root = makeRoot({ 'apps/a/schema.zmodel': zmodelWithRegex(`^[^@${slashes(1)}s]+$`) })
    const { code, out, err } = runScript(root)
    expect(code).toBe(1)
    expect(out).toContain('apps/a/schema.zmodel:2')
    expect(out).toContain('плагин получит: ^[^@s]+$')
    expect(err).toContain('потерянным слэшем')
  })

  test('четыре слэша — предупреждение, код возврата 0', () => {
    const root = makeRoot({ 'libs/b/schema.zmodel': zmodelWithRegex(`^[^@${slashes(4)}s]+$`) })
    const { code, out } = runScript(root)
    expect(code).toBe(0)
    expect(out).toContain('предупреждений: 1')
    expect(out).toContain('ошибок: 0')
  })

  test('верная пара слэшей — зелёный, паттерн учтён в счётчике', () => {
    const root = makeRoot({ 'apps/a/schema.zmodel': zmodelWithRegex(`^[^@${slashes(2)}s]+$`) })
    const { code, out } = runScript(root)
    expect(code).toBe(0)
    expect(out).toContain('из них со слэшами: 1')
    expect(out).toContain('ошибок: 0, предупреждений: 0')
  })

  test('node_modules, dist и .claude/worktrees не сканируются', () => {
    const bad = zmodelWithRegex(`${slashes(1)}s`)
    const root = makeRoot({
      'apps/a/node_modules/pkg/schema.zmodel': bad,
      'apps/a/dist/schema.zmodel': bad,
      'apps/a/.claude/worktrees/agent-1/schema.zmodel': bad,
      'apps/a/schema.zmodel': zmodelWithRegex(`${slashes(2)}s`),
    })
    const { code, out } = runScript(root)
    expect(code).toBe(0)
    expect(out).toContain('просканировано .zmodel: 1;')
  })

  test('пустой корень без apps/libs — зелёный, ноль файлов', () => {
    const root = makeRoot({ 'README.md': 'x' })
    const { code, out } = runScript(root)
    expect(code).toBe(0)
    expect(out).toContain('просканировано .zmodel: 0;')
  })

  test('невыкаченный submodule в apps/ печатается как неполное покрытие', () => {
    const root = makeRoot({
      '.gitmodules': `[submodule "apps/private-app"]${NL}${TAB}path = apps/private-app${NL}${TAB}url = x${NL}`,
      'apps/a/schema.zmodel': zmodelWithRegex(`${slashes(2)}s`),
    })
    const { code, out } = runScript(root)
    expect(code).toBe(0)
    expect(out).toContain('неполное покрытие')
    expect(out).toContain('apps/private-app')
  })
})
