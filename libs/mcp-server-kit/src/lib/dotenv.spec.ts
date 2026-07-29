import { describe, expect, it } from 'vitest'
import { parseDotEnv } from './dotenv.js'

describe('parseDotEnv', () => {
  it('парсит простые пары KEY=value', () => {
    expect(parseDotEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('снимает кавычки', () => {
    expect(parseDotEnv('A="quoted"\nB=\'single\'')).toEqual({ A: 'quoted', B: 'single' })
  })

  it('пропускает комментарии и пустые строки', () => {
    expect(parseDotEnv('# comment\n\nFOO=bar\n  \n# another')).toEqual({ FOO: 'bar' })
  })

  it('пропускает строки без "="', () => {
    expect(parseDotEnv('FOO=bar\nnoequals\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('обрезает пробелы вокруг ключа и значения', () => {
    expect(parseDotEnv('  FOO  =  bar  ')).toEqual({ FOO: 'bar' })
  })
})
