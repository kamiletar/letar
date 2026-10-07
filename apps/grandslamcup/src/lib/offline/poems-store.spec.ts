import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clampFontSize,
  DEFAULT_FONT_SIZE,
  loadPrefs,
  loadSnapshot,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  parseSnapshot,
  type ReaderSnapshot,
  saveSnapshot,
  syncSnapshot,
} from './poems-store'

const snapshot: ReaderSnapshot = {
  poetName: 'Поэт',
  syncedAt: '2026-10-07T12:00:00.000Z',
  poems: [
    { id: '1', title: 'Первое', text: 'строка\nвторая', published: true, updatedAt: '2026-10-01T10:00:00.000Z' },
    { id: '2', title: 'Черновик', text: 'ещё', published: false, updatedAt: '2026-10-02T10:00:00.000Z' },
  ],
}

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('clampFontSize', () => {
  it('держит размер в допустимых границах', () => {
    expect(clampFontSize(1)).toBe(MIN_FONT_SIZE)
    expect(clampFontSize(999)).toBe(MAX_FONT_SIZE)
    expect(clampFontSize(30.4)).toBe(30)
  })

  it('на нечисле возвращает размер по умолчанию', () => {
    expect(clampFontSize(Number.NaN)).toBe(DEFAULT_FONT_SIZE)
  })
})

describe('parseSnapshot', () => {
  it('отбрасывает мусор вместо падения', () => {
    expect(parseSnapshot(null)).toBeNull()
    expect(parseSnapshot({ poems: 'нет' })).toBeNull()
  })

  it('пропускает записи неверной формы, остальные оставляет', () => {
    const parsed = parseSnapshot({ ...snapshot, poems: [...snapshot.poems, { id: 3 }] })
    expect(parsed?.poems).toHaveLength(2)
  })
})

describe('localStorage', () => {
  it('сохраняет и читает снимок с переносами строк', () => {
    expect(saveSnapshot(snapshot)).toBe(true)
    expect(loadSnapshot()).toEqual(snapshot)
  })

  it('без сохранённого снимка возвращает null', () => {
    expect(loadSnapshot()).toBeNull()
  })

  it('битый JSON в хранилище не роняет чтение', () => {
    localStorage.setItem('grandslamcup-reader-snapshot', '{не json')
    expect(loadSnapshot()).toBeNull()
  })

  it('настройки по умолчанию, пока ничего не сохранено', () => {
    expect(loadPrefs()).toEqual({ poemId: null, fontSize: DEFAULT_FONT_SIZE })
  })
})

describe('syncSnapshot', () => {
  it('без сети не ходит на сервер и не трогает копию', async () => {
    saveSnapshot(snapshot)
    vi.stubGlobal('navigator', { onLine: false })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncSnapshot()).toEqual({ status: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(loadSnapshot()).toEqual(snapshot)
  })

  it('на 401 говорит «не вошли» и оставляет старую копию', async () => {
    saveSnapshot(snapshot)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))

    expect(await syncSnapshot()).toEqual({ status: 'unauthorized' })
    expect(loadSnapshot()).toEqual(snapshot)
  })

  it('при успехе сохраняет свежие стихи', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 })))

    const result = await syncSnapshot()
    expect(result.status).toBe('ok')
    expect(loadSnapshot()).toEqual(snapshot)
  })

  it('сетевая ошибка fetch считается «офлайн»', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    expect(await syncSnapshot()).toEqual({ status: 'offline' })
  })

  it('ответ неверной формы — ошибка, копия цела', async () => {
    saveSnapshot(snapshot)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"x":1}', { status: 200 })))

    expect(await syncSnapshot()).toEqual({ status: 'error' })
    expect(loadSnapshot()).toEqual(snapshot)
  })
})
