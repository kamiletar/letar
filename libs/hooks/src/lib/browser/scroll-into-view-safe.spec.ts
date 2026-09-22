import { afterEach, describe, expect, it, vi } from 'vitest'

import { scrollIntoViewSafe } from './scroll-into-view-safe'

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }))
}

// jsdom не реализует Element.scrollIntoView вовсе — vi.spyOn требует существующего свойства,
// поэтому подменяем его на fn напрямую.
function stubScrollIntoView(el: Element): ReturnType<typeof vi.fn> {
  const spy = vi.fn()
  el.scrollIntoView = spy
  return spy
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('scrollIntoViewSafe', () => {
  it('ничего не делает для null/undefined элемента', () => {
    expect(() => scrollIntoViewSafe(null)).not.toThrow()
    expect(() => scrollIntoViewSafe(undefined)).not.toThrow()
  })

  it('окно в фокусе, reduced-motion выключен — передаёт behavior:smooth как есть', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    stubMatchMedia(false)
    const el = document.createElement('div')
    const spy = stubScrollIntoView(el)

    scrollIntoViewSafe(el, { behavior: 'smooth', block: 'center' })

    expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('окно без OS-фокуса — переключает smooth на instant', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    stubMatchMedia(false)
    const el = document.createElement('div')
    const spy = stubScrollIntoView(el)

    scrollIntoViewSafe(el, { behavior: 'smooth' })

    expect(spy).toHaveBeenCalledWith({ behavior: 'instant' })
  })

  it('prefers-reduced-motion — переключает smooth на instant даже при фокусе', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    stubMatchMedia(true)
    const el = document.createElement('div')
    const spy = stubScrollIntoView(el)

    scrollIntoViewSafe(el, { behavior: 'smooth' })

    expect(spy).toHaveBeenCalledWith({ behavior: 'instant' })
  })

  it('behavior не передан — по умолчанию ведёт себя как smooth (с тем же переключением)', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    stubMatchMedia(false)
    const el = document.createElement('div')
    const spy = stubScrollIntoView(el)

    scrollIntoViewSafe(el)

    expect(spy).toHaveBeenCalledWith({ behavior: 'instant' })
  })

  it('behavior:instant передан явно — остаётся instant независимо от фокуса', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    stubMatchMedia(false)
    const el = document.createElement('div')
    const spy = stubScrollIntoView(el)

    scrollIntoViewSafe(el, { behavior: 'instant' })

    expect(spy).toHaveBeenCalledWith({ behavior: 'instant' })
  })
})
