import { describe, expect, it } from 'vitest'
import { parsePostgresUrl } from './feature'

describe('parsePostgresUrl', () => {
  it('разбирает обычную строку подключения', () => {
    expect(parsePostgresUrl('postgresql://user:pass@localhost:5432/mydb')).toEqual({
      user: 'user',
      password: 'pass',
      host: 'localhost',
      port: 5432,
      database: 'mydb',
    })
  })

  it('разбирает пароль со спецсимволами base64 (/ и +) без URL-кодирования', () => {
    const password = 'aB3/cD+eF7=='
    expect(parsePostgresUrl(`postgresql://user:${password}@db.internal:5432/app`)).toEqual({
      user: 'user',
      password,
      host: 'db.internal',
      port: 5432,
      database: 'app',
    })
  })

  it('декодирует URL-кодированные user/password', () => {
    expect(parsePostgresUrl('postgres://my%40user:p%2Fss@host:5432/db')).toEqual({
      user: 'my@user',
      password: 'p/ss',
      host: 'host',
      port: 5432,
      database: 'db',
    })
  })

  it('поддерживает схему postgres:// и query-параметры после базы', () => {
    expect(parsePostgresUrl('postgres://u:p@h:5432/db?sslmode=disable')).toEqual({
      user: 'u',
      password: 'p',
      host: 'h',
      port: 5432,
      database: 'db',
    })
  })

  it('бросает ошибку при невалидной строке', () => {
    expect(() => parsePostgresUrl('not-a-url')).toThrow('DATABASE_URL')
  })
})
