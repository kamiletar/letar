import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createJsonStore } from './json-store'

// Хранилище не зависит от `app.getPath('userData')` напрямую в тестах — передаём
// свою временную директорию через `dir`, поэтому мокать electron не обязательно,
// но модуль всё равно импортирует `app` на верхнем уровне — подставляем заглушку.
vi.mock('electron', () => ({ app: { getPath: () => tmpdir() } }))

interface Settings {
  widthCm: number
  font: string
}

const DEFAULTS: Settings = { widthCm: 91.4, font: 'Arial' }

describe('createJsonStore', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'electron-storage-test-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('возвращает дефолт, если файла ещё нет', () => {
    const store = createJsonStore('settings.json', DEFAULTS, { dir })
    expect(store.exists()).toBe(false)
    expect(store.loadSync()).toEqual(DEFAULTS)
  })

  it('save/load через async API — цикл туда-обратно', async () => {
    const store = createJsonStore<Settings>('settings.json', DEFAULTS, { dir })
    await store.save({ widthCm: 50, font: 'Verdana' })
    expect(store.exists()).toBe(true)
    await expect(store.load()).resolves.toEqual({ widthCm: 50, font: 'Verdana' })
  })

  it('saveSync/loadSync — цикл туда-обратно', () => {
    const store = createJsonStore<Settings>('settings.json', DEFAULTS, { dir })
    store.saveSync({ widthCm: 30, font: 'Tahoma' })
    expect(store.loadSync()).toEqual({ widthCm: 30, font: 'Tahoma' })
  })

  it('без mergeDefaults (по умолчанию) не подмешивает значения по умолчанию к файлу', async () => {
    const store = createJsonStore<Partial<Settings>>('settings.json', DEFAULTS, { dir })
    await store.save({ widthCm: 30 })
    // font из DEFAULTS не подмешался — ровно то, что было сохранено
    await expect(store.load()).resolves.toEqual({ widthCm: 30 })
  })

  it('с mergeDefaults=true заполняет отсутствующие в файле поля дефолтами', async () => {
    const store = createJsonStore<Settings>('settings.json', DEFAULTS, { dir, mergeDefaults: true })
    await store.save({ widthCm: 30 } as Settings)
    await expect(store.load()).resolves.toEqual({ widthCm: 30, font: 'Arial' })
  })

  it('update() мёрджит частичное обновление поверх текущего значения и сохраняет', async () => {
    const store = createJsonStore<Settings>('settings.json', DEFAULTS, { dir })
    await store.save({ widthCm: 40, font: 'PT Sans' })
    const updated = await store.update({ widthCm: 60 })
    expect(updated).toEqual({ widthCm: 60, font: 'PT Sans' })
    await expect(store.load()).resolves.toEqual({ widthCm: 60, font: 'PT Sans' })
  })

  it('битый JSON на диске — load/loadSync возвращают дефолт, не бросают', async () => {
    writeFileSync(join(dir, 'broken.json'), '{ not valid json')
    const logger = { error: vi.fn() }
    const storeWithLogger = createJsonStore<Settings>('broken.json', DEFAULTS, { dir, logger })
    expect(storeWithLogger.loadSync()).toEqual(DEFAULTS)
    await expect(storeWithLogger.load()).resolves.toEqual(DEFAULTS)
    expect(logger.error).toHaveBeenCalled()
  })

  it('отсутствие файла не логируется как ошибка (ENOENT — обычный случай)', async () => {
    const logger = { error: vi.fn() }
    const store = createJsonStore<Settings>('never-created.json', DEFAULTS, { dir, logger })
    await store.load()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('cacheTtlMs — повторный loadSync до истечения TTL не перечитывает файл с диска', () => {
    const store = createJsonStore<Settings>('settings.json', DEFAULTS, { dir, cacheTtlMs: 60_000 })
    store.saveSync({ widthCm: 10, font: 'A' })
    // Меняем файл на диске напрямую, минуя store — кеш должен пережить это
    writeFileSync(join(dir, 'settings.json'), JSON.stringify({ widthCm: 999, font: 'B' }))
    expect(store.loadSync()).toEqual({ widthCm: 10, font: 'A' })
  })

  it('invalidateCache() заставляет следующий loadSync перечитать диск', () => {
    const store = createJsonStore<Settings>('settings.json', DEFAULTS, { dir, cacheTtlMs: 60_000 })
    store.saveSync({ widthCm: 10, font: 'A' })
    writeFileSync(join(dir, 'settings.json'), JSON.stringify({ widthCm: 999, font: 'B' }))
    store.invalidateCache()
    expect(store.loadSync()).toEqual({ widthCm: 999, font: 'B' })
  })

  it('с mergeDefaults=true отсутствие файла отдаёт свежую копию — мутация не портит дефолт для будущих load()', async () => {
    const store = createJsonStore<Settings>('never-created.json', DEFAULTS, { dir, mergeDefaults: true })
    const first = await store.load()
    ;(first as Settings).font = 'ИСПОРЧЕНО'
    const second = await store.load()
    expect(second.font).toBe('Arial')
    expect(DEFAULTS.font).toBe('Arial')
  })

  it('getPath() указывает на filename внутри dir', () => {
    const store = createJsonStore('settings.json', DEFAULTS, { dir })
    expect(store.getPath()).toBe(join(dir, 'settings.json'))
  })

  it('atomic: true — saveSync не оставляет .tmp-файл, целевой файл содержит данные', () => {
    const store = createJsonStore<Settings>('settings.json', DEFAULTS, { dir, atomic: true })
    store.saveSync({ widthCm: 15, font: 'Consolas' })
    expect(store.loadSync()).toEqual({ widthCm: 15, font: 'Consolas' })
    expect(existsSync(join(dir, 'settings.json.tmp'))).toBe(false)
  })

  it('atomic: true — async save не оставляет .tmp-файл, целевой файл содержит данные', async () => {
    const store = createJsonStore<Settings>('settings.json', DEFAULTS, { dir, atomic: true })
    await store.save({ widthCm: 25, font: 'Georgia' })
    await expect(store.load()).resolves.toEqual({ widthCm: 25, font: 'Georgia' })
    expect(existsSync(join(dir, 'settings.json.tmp'))).toBe(false)
  })
})
