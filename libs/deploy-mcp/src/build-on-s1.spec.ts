import { BUILD_ON_S1_APPS, E2E_GATED_APPS, HARD_GATED_APPS } from '@letar/infra-config'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { INFRA_CONFIG_SOURCE, parseStringArrayConst, readDeployLists } from './build-on-s1'

describe('parseStringArrayConst', () => {
  it('читает однострочный массив с аннотацией типа', () => {
    expect(parseStringArrayConst(`export const X: string[] = ['a', 'b-c']`, 'X')).toEqual(['a', 'b-c'])
  })

  it('читает многострочный массив с комментариями, двойными кавычками и запятой в конце', () => {
    const source = `
      export const X: string[] = [
        'one', // комментарий с ] и запятой,
        /* блочный ] комментарий */ "two",
        'three',
      ]
    `
    expect(parseStringArrayConst(source, 'X')).toEqual(['one', 'two', 'three'])
  })

  it('понимает CRLF и пустой массив', () => {
    expect(parseStringArrayConst("export const X = [\r\n  'a',\r\n]", 'X')).toEqual(['a'])
    expect(parseStringArrayConst('export const X: string[] = []', 'X')).toEqual([])
  })

  it('не путает константу с другой, у которой имя длиннее', () => {
    const source = `export const XY = ['no']\nexport const X = ['yes']`
    expect(parseStringArrayConst(source, 'X')).toEqual(['yes'])
  })

  // Отказ вместо догадки: любая форма, кроме литерала строк, — ошибка, а не «нашёл часть списка».
  it.each([
    ['spread', `export const X = [...OTHER, 'a']`],
    ['идентификатор', `export const X = ['a', OTHER]`],
    ['шаблонная строка', 'export const X = [`a`]'],
    ['escape в строке', `export const X = ['a\\'b']`],
    ['не закрыт', `export const X = ['a', 'b'`],
    ['пустая строка', `export const X = ['']`],
    ['недопустимое имя', `export const X = ['Bad_Name']`],
  ])('бросает: %s', (_label, source) => {
    expect(() => parseStringArrayConst(source, 'X')).toThrow()
  })

  it('бросает, если объявления нет', () => {
    expect(() => parseStringArrayConst(`const X = ['a']`, 'X')).toThrow(/не найдено/)
  })
})

describe('readDeployLists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deploy-mcp-build-on-s1-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const source = (build: string[], e2e: string[], hard: string[]) => {
    const literal = (apps: string[]) => `[${apps.map((a) => `'${a}'`).join(', ')}]`
    return [
      `export const E2E_GATED_APPS: string[] = ${literal(e2e)}`,
      `export const HARD_GATED_APPS: string[] = ${literal(hard)}`,
      `export const BUILD_ON_S1_APPS: string[] = ${literal(build)}`,
    ].join('\n')
  }

  it('читает все три списка одним вызовом', () => {
    const file = join(dir, 'all.ts')
    writeFileSync(file, source(['b'], ['e', 'h'], ['h']))
    expect(readDeployLists(file)).toEqual({ buildOnS1Apps: ['b'], e2eGatedApps: ['e', 'h'], hardGatedApps: ['h'] })
  })

  it('видит правку файла между вызовами — без перезапуска', () => {
    const file = join(dir, 'infra-config.ts')
    writeFileSync(file, source(['a'], [], []))
    expect(readDeployLists(file).buildOnS1Apps).toEqual(['a'])
    writeFileSync(file, source(['a', 'b'], ['x'], ['x']))
    expect(readDeployLists(file)).toEqual({ buildOnS1Apps: ['a', 'b'], e2eGatedApps: ['x'], hardGatedApps: ['x'] })
  })

  it('бросает, если файла нет', () => {
    expect(() => readDeployLists(join(dir, 'нет-такого-файла.ts'))).toThrow(/не удалось прочитать/)
  })

  // Каждый из трёх списков обязателен: пропавшее объявление — отказ с именем константы, а не «гейта нет».
  it.each(['BUILD_ON_S1_APPS', 'E2E_GATED_APPS', 'HARD_GATED_APPS'])(
    'бросает с именем константы, если нет %s',
    (name) => {
      const file = join(dir, `missing-${name}.ts`)
      const full = source(['b'], ['h'], ['h'])
      writeFileSync(file, full.replace(`export const ${name}`, `const ${name}`))
      expect(() => readDeployLists(file)).toThrow(new RegExp(name))
    },
  )

  it('бросает с именем константы, если HARD_GATED_APPS записан не литералом', () => {
    const file = join(dir, 'hard-spread.ts')
    writeFileSync(
      file,
      [
        `export const E2E_GATED_APPS: string[] = ['h']`,
        `export const HARD_GATED_APPS: string[] = [...E2E_GATED_APPS]`,
        `export const BUILD_ON_S1_APPS: string[] = ['b']`,
      ].join('\n'),
    )
    expect(() => readDeployLists(file)).toThrow(/HARD_GATED_APPS.*не литералом строк/)
  })

  // ⚠️ Охранный тест формата. Разбор текста и `import` — два независимых пути к одним спискам; если
  // кто-то перепишет объявление так, что сканер его не поймёт, deploy_app начнёт отказывать в проде.
  // Этот тест роняет CI раньше: разбор реального файла обязан совпасть с импортированными константами.
  it('разбор реального libs/infra-config/src/index.ts совпадает с импортированными списками', () => {
    const text = readFileSync(INFRA_CONFIG_SOURCE, 'utf8')
    for (const name of ['BUILD_ON_S1_APPS', 'E2E_GATED_APPS', 'HARD_GATED_APPS']) {
      expect(text).toContain(`export const ${name}`)
    }
    expect(readDeployLists()).toEqual({
      buildOnS1Apps: BUILD_ON_S1_APPS,
      e2eGatedApps: E2E_GATED_APPS,
      hardGatedApps: HARD_GATED_APPS,
    })
  })
})
