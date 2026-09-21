import { BUILD_ON_S1_APPS } from '@letar/infra-config'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { INFRA_CONFIG_SOURCE, parseStringArrayConst, readBuildOnS1Apps } from './build-on-s1'

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

describe('readBuildOnS1Apps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deploy-mcp-build-on-s1-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('видит правку файла между вызовами — без перезапуска', () => {
    const file = join(dir, 'infra-config.ts')
    writeFileSync(file, `export const BUILD_ON_S1_APPS: string[] = ['a']`)
    expect(readBuildOnS1Apps(file)).toEqual(['a'])
    writeFileSync(file, `export const BUILD_ON_S1_APPS: string[] = ['a', 'b']`)
    expect(readBuildOnS1Apps(file)).toEqual(['a', 'b'])
  })

  it('бросает, если файла нет', () => {
    expect(() => readBuildOnS1Apps(join(dir, 'нет-такого-файла.ts'))).toThrow(/не удалось прочитать/)
  })

  // ⚠️ Охранный тест формата. Разбор текста и `import` — два независимых пути к одному списку; если
  // кто-то перепишет объявление так, что сканер его не поймёт, deploy_app начнёт отказывать в проде.
  // Этот тест роняет CI раньше: разбор реального файла обязан совпасть с импортированной константой.
  it('разбор реального libs/infra-config/src/index.ts совпадает с импортированным BUILD_ON_S1_APPS', () => {
    expect(readFileSync(INFRA_CONFIG_SOURCE, 'utf8')).toContain('BUILD_ON_S1_APPS')
    expect(readBuildOnS1Apps()).toEqual(BUILD_ON_S1_APPS)
  })
})
