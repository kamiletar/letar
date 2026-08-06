// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { isNetworkError } from './network'

describe('isNetworkError', () => {
  it('возвращает false для не-Error значений', () => {
    expect(isNetworkError('строка')).toBe(false)
    expect(isNetworkError(null)).toBe(false)
    expect(isNetworkError(undefined)).toBe(false)
    expect(isNetworkError({ message: 'network request failed' })).toBe(false)
  })

  it('возвращает false для обычной ошибки без сетевого паттерна', () => {
    expect(isNetworkError(new Error('HTTP 404: Not Found'))).toBe(false)
  })

  it('распознаёт "Network request failed" (React Native), регистронезависимо', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true)
    expect(isNetworkError(new Error('NETWORK REQUEST FAILED'))).toBe(true)
  })

  it('распознаёт "Failed to fetch" (Web fetch API)', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true)
  })

  it('распознаёт кастомный текст "Нет соединения с сервером"', () => {
    expect(isNetworkError(new Error('Нет соединения с сервером'))).toBe(true)
  })

  it('распознаёт "timeout" в тексте сообщения', () => {
    expect(isNetworkError(new Error('Request timeout'))).toBe(true)
  })

  it('распознаёт AbortError по имени, даже без сетевого текста в сообщении', () => {
    const error = new Error('Операция отменена')
    error.name = 'AbortError'
    expect(isNetworkError(error)).toBe(true)
  })
})
