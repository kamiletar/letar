import { describe, expect, it } from 'vitest'
import { assertAuthOk, AUTH_ERROR_MESSAGES_RU, resolveAuthErrorMessage } from './assert-auth-ok'

describe('assertAuthOk', () => {
  it('не бросает, если error отсутствует', () => {
    expect(() => assertAuthOk({ error: null })).not.toThrow()
    expect(() => assertAuthOk({})).not.toThrow()
  })

  it('бросает Error с message из result.error.message', () => {
    expect(() => assertAuthOk({ error: { message: 'Такой email уже занят' } })).toThrow('Такой email уже занят')
  })

  it('бросает Error с defaultMessage, если result.error.message отсутствует', () => {
    expect(() => assertAuthOk({ error: { code: 'UNKNOWN' } }, 'Ошибка входа')).toThrow('Ошибка входа')
  })

  it('бросает Error с общим дефолтом, если ни message, ни defaultMessage не заданы', () => {
    expect(() => assertAuthOk({ error: {} })).toThrow('Произошла ошибка')
  })

  describe('приоритет локализованного текста над серверным message', () => {
    const invalidCredentials = {
      error: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password', status: 401 },
    }

    it('код Better Auth + английский message: побеждает defaultMessage формы', () => {
      expect(() => assertAuthOk(invalidCredentials, 'Неверный email или пароль')).toThrow('Неверный email или пароль')
    })

    it('messages[code] побеждает и defaultMessage, и серверный message', () => {
      expect(() =>
        assertAuthOk(invalidCredentials, {
          defaultMessage: 'Ошибка входа',
          messages: { INVALID_EMAIL_OR_PASSWORD: 'Неверный email или пароль' },
        })
      ).toThrow('Неверный email или пароль')
    })

    it('messages без совпадения по коду → defaultMessage из options', () => {
      expect(() =>
        assertAuthOk(invalidCredentials, {
          defaultMessage: 'Ошибка входа',
          messages: { USER_ALREADY_EXISTS: 'Такой email уже занят' },
        })
      ).toThrow('Ошибка входа')
    })

    it('серверный message на кириллице (локализован сервером) не затирается defaultMessage', () => {
      const result = { error: { code: 'CUSTOM_LIMIT', message: 'Слишком много попыток, подождите минуту' } }
      expect(() => assertAuthOk(result, 'Ошибка входа')).toThrow('Слишком много попыток, подождите минуту')
    })

    it('messages[code] приоритетнее даже русского серверного message', () => {
      const result = { error: { code: 'CUSTOM_LIMIT', message: 'Слишком много попыток' } }
      expect(() => assertAuthOk(result, { messages: { CUSTOM_LIMIT: 'Подождите минуту' } })).toThrow(
        'Подождите минуту',
      )
    })

    it('ошибка без code (rate-limit и т.п.) сохраняет серверный message, а не defaultMessage', () => {
      const result = { error: { message: 'Too many requests. Please try again later.', status: 429 } }
      expect(() => assertAuthOk(result, 'Неверный email или пароль')).toThrow(
        'Too many requests. Please try again later.',
      )
    })

    it('код + английский message, но defaultMessage не задан → серверный message как запасной', () => {
      expect(() => assertAuthOk(invalidCredentials)).toThrow('Invalid email or password')
    })

    it('пустой message после trim считается отсутствующим', () => {
      expect(() => assertAuthOk({ error: { code: 'X', message: '   ' } }, 'Ошибка входа')).toThrow('Ошибка входа')
    })
  })

  it('AUTH_ERROR_MESSAGES_RU переводит типовые коды формы входа и регистрации', () => {
    const result = { error: { code: 'USER_ALREADY_EXISTS', message: 'User already exists.' } }
    expect(() => assertAuthOk(result, { defaultMessage: 'Ошибка регистрации', messages: AUTH_ERROR_MESSAGES_RU }))
      .toThrow(
        'Этот email уже зарегистрирован. Войдите или восстановите пароль.',
      )
    // Своё значение в messages перекрывает словарь
    expect(() => assertAuthOk(result, { messages: { ...AUTH_ERROR_MESSAGES_RU, USER_ALREADY_EXISTS: 'Занято' } }))
      .toThrow('Занято')
  })

  it('resolveAuthErrorMessage возвращает текст без броска (для веток с ручной обработкой кода)', () => {
    expect(
      resolveAuthErrorMessage(
        { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
        'Неверный пароль',
      ),
    ).toBe('Неверный пароль')
    expect(resolveAuthErrorMessage({}, undefined)).toBe('Произошла ошибка')
  })

  it('сужает тип result после успешного вызова (компиляционная проверка)', () => {
    const result: { error?: { message?: string | null } | null; data?: { id: string } } = {
      data: { id: '1' },
      error: null,
    }
    assertAuthOk(result)
    // После assertAuthOk TS считает result.error равным null — доступ к result.data безопасен
    expect(result.data.id).toBe('1')
  })
})
