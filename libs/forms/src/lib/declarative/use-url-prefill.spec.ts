import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { generatePrefillUrl, useUrlPrefill } from './use-url-prefill'

describe('useUrlPrefill', () => {
  const originalLocation = window.location

  beforeEach(() => {
    // Мокаем window.location.search
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '', href: 'http://localhost/', pathname: '/', hash: '' },
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
  })

  it('извлекает параметры из whitelist', () => {
    const params = new URLSearchParams('?name=Иван&email=test@test.com&hack=evil')
    const { result } = renderHook(() => useUrlPrefill({ fields: ['name', 'email'], searchParams: params }))

    expect(result.current).toEqual({ name: 'Иван', email: 'test@test.com' })
    // hack не в whitelist — игнорируется
    expect(result.current).not.toHaveProperty('hack')
  })

  it('возвращает пустой объект без совпадений', () => {
    const params = new URLSearchParams('?other=value')
    const { result } = renderHook(() => useUrlPrefill({ fields: ['name', 'email'], searchParams: params }))

    expect(result.current).toEqual({})
  })

  it('маппит URL-параметры на поля формы', () => {
    const params = new URLSearchParams('?user_name=Иван&mail=test@test.com')
    const { result } = renderHook(() =>
      useUrlPrefill({
        fields: ['name', 'email'],
        mapping: { user_name: 'name', mail: 'email' },
        searchParams: params,
      })
    )

    expect(result.current).toEqual({ name: 'Иван', email: 'test@test.com' })
  })

  it('поддерживает массивы (?tag=a&tag=b)', () => {
    const params = new URLSearchParams('?tag=react&tag=forms')
    const { result } = renderHook(() => useUrlPrefill({ fields: ['tag'], searchParams: params }))

    expect(result.current).toEqual({ tag: ['react', 'forms'] })
  })

  it('поддерживает вложенные объекты (?address.city=Moscow)', () => {
    const params = new URLSearchParams('?address.city=Moscow&address.street=Тверская')
    const { result } = renderHook(() => useUrlPrefill({ fields: ['address'], searchParams: params }))

    expect(result.current).toEqual({
      address: { city: 'Moscow', street: 'Тверская' },
    })
  })

  it('возвращает пустой объект если fields пустой', () => {
    const params = new URLSearchParams('?name=Иван')
    const { result } = renderHook(() => useUrlPrefill({ fields: [], searchParams: params }))

    expect(result.current).toEqual({})
  })
})

describe('generatePrefillUrl', () => {
  it('генерирует URL с простыми параметрами', () => {
    const url = generatePrefillUrl('/contact', {
      name: 'Иван',
      email: 'ivan@test.com',
    })

    expect(url).toContain('/contact?')
    expect(url).toContain('name=')
    expect(url).toContain('email=')
    // Декодируем для проверки
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('name')).toBe('Иван')
    expect(params.get('email')).toBe('ivan@test.com')
  })

  it('генерирует URL с массивами', () => {
    const url = generatePrefillUrl('/form', {
      tags: ['react', 'forms'],
    })

    const params = new URLSearchParams(url.split('?')[1])
    expect(params.getAll('tags')).toEqual(['react', 'forms'])
  })

  it('генерирует URL с вложенными объектами', () => {
    const url = generatePrefillUrl('/form', {
      address: { city: 'Moscow', street: 'Тверская' },
    })

    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('address.city')).toBe('Moscow')
    expect(params.get('address.street')).toBe('Тверская')
  })

  it('пропускает null и undefined', () => {
    const url = generatePrefillUrl('/form', {
      name: 'Иван',
      empty: null,
      missing: undefined,
    })

    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('name')).toBe('Иван')
    expect(params.has('empty')).toBe(false)
    expect(params.has('missing')).toBe(false)
  })

  it('возвращает path без query если params пустой', () => {
    expect(generatePrefillUrl('/form', {})).toBe('/form')
  })
})
