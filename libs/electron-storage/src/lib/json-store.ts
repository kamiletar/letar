/**
 * Универсальное JSON-хранилище настроек в userData для Electron-приложений.
 *
 * Объединяет два независимых паттерна, найденных в монорепо (label-printer-desktop
 * `JsonStorage<T>` и animatrona `createConfigStore`): кеш с TTL + sync/async API из
 * первого, merge с дефолтами и `update()` из второго. Поведение обоих сохранено через
 * опции — миграция существующих вызовов не меняет их поведение по умолчанию.
 */
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface JsonStoreLogger {
  error(...args: unknown[]): void
}

export interface JsonStoreOptions {
  /** Директория для файла; по умолчанию `app.getPath('userData')` */
  dir?: string
  /** TTL кеша в мс; 0 (по умолчанию) — без кеша, каждый load/loadSync читает диск */
  cacheTtlMs?: number
  /**
   * Мёрджить дефолты с загруженными данными (`{ ...defaults, ...parsed }`), а не
   * заменять их целиком. Нужно там, где `defaultValue` — не просто заглушка на случай
   * отсутствия файла, а набор полей, которые должны быть только там, если в файле их нет
   * (старый файл с прошлой версии интерфейса). По умолчанию выключено (без слияния) —
   * поведение `JsonStorage` из label-printer-desktop.
   */
  mergeDefaults?: boolean
  /** Логгер ошибок load/save; по умолчанию `console` */
  logger?: JsonStoreLogger
  /**
   * Атомарная запись: пишем во `${filename}.tmp`, затем переименовываем поверх целевого
   * файла. Переименование на одной ФС атомарно — при сбое/креше во время записи старый
   * файл остаётся целым (не бывает частично записанного JSON). По умолчанию выключено
   * (прямая запись, поведение исходного `createConfigStore` из animatrona).
   */
  atomic?: boolean
}

export interface JsonStore<T> {
  /** Абсолютный путь к файлу хранилища */
  getPath(): string
  /** Существует ли файл на диске */
  exists(): boolean
  /** Синхронная загрузка — для использования при старте приложения, до event loop */
  loadSync(): T
  load(): Promise<T>
  saveSync(data: T): void
  save(data: T): Promise<void>
  /** Частичное обновление: загрузить, смёрджить, сохранить, вернуть итог */
  update(updates: Partial<T>): Promise<T>
  /** Сбросить закешированное значение — следующий load/loadSync снова прочитает диск */
  invalidateCache(): void
}

/**
 * Создать JSON-хранилище настроек в userData.
 *
 * @param filename имя файла (например `settings.json`)
 * @param defaultValue значение по умолчанию — возвращается, если файла ещё нет или
 *   чтение/парсинг упали
 */
export function createJsonStore<T>(filename: string, defaultValue: T, options: JsonStoreOptions = {}): JsonStore<T> {
  const { dir, cacheTtlMs = 0, mergeDefaults = false, logger = console, atomic = false } = options

  let cachedData: T | null = null
  let cacheExpiry = 0

  function getDir(): string {
    return dir ?? app.getPath('userData')
  }

  function getPath(): string {
    return join(getDir(), filename)
  }

  function ensureDir(): void {
    const d = getDir()
    if (!existsSync(d)) {
      mkdirSync(d, { recursive: true })
    }
  }

  function fromCache(): T | null {
    if (cachedData !== null && Date.now() < cacheExpiry) {
      return cachedData
    }
    return null
  }

  function updateCache(data: T): void {
    if (cacheTtlMs > 0) {
      cachedData = data
      cacheExpiry = Date.now() + cacheTtlMs
    }
  }

  function parse(raw: string): T {
    const parsed = JSON.parse(raw) as T
    return mergeDefaults ? { ...defaultValue, ...parsed } : parsed
  }

  function exists(): boolean {
    return existsSync(getPath())
  }

  /**
   * Значение для случая «файла нет / прочитать не удалось».
   *
   * Всегда отдаём свежую глубокую копию `defaultValue`, а не саму ссылку. Если бы
   * возвращалась ссылка, любая мутация на месте у вызывающего кода (`data.items.push(...)`,
   * `data.field = x`, `Array.prototype.sort()` и т.п.) портила бы `defaultValue` для ВСЕХ
   * последующих вызовов `load()`/`loadSync()` в процессе — до первого успешного сохранения
   * файла баг незаметен (мутированный дефолт совпадает с тем, что должно быть в файле), а
   * проявляется только когда файл потом пропадает или не читается (сброс настроек, ручное
   * удаление, битый JSON) — тогда фолбэк возвращает не чистый дефолт, а уже испорченный
   * состоянием предыдущего запуска. Разбор — .claude/docs/electron-storage-shared-default-value-mutation.md.
   *
   * `structuredClone` — глубокая копия, не только верхний уровень: значение здесь всегда
   * JSON-совместимые данные (то, что реально проходит через `JSON.parse`/`JSON.stringify`
   * при работе с файлом), поэтому ограничений `structuredClone` (функции, DOM-узлы и т.п.)
   * это не касается.
   */
  function fallbackValue(): T {
    return structuredClone(defaultValue)
  }

  function loadSync(): T {
    const cached = fromCache()
    if (cached !== null) {
      return cached
    }
    const filePath = getPath()
    if (!existsSync(filePath)) {
      return fallbackValue()
    }
    try {
      const data = parse(readFileSync(filePath, 'utf-8'))
      updateCache(data)
      return data
    } catch (error) {
      logger.error(`[JsonStore] Не удалось загрузить ${filePath}`, error)
      return fallbackValue()
    }
  }

  async function load(): Promise<T> {
    const cached = fromCache()
    if (cached !== null) {
      return cached
    }
    const filePath = getPath()
    try {
      const data = parse(await readFile(filePath, 'utf-8'))
      updateCache(data)
      return data
    } catch (error) {
      // Файла ещё нет — обычный случай (первый запуск), не ошибка
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error(`[JsonStore] Не удалось загрузить ${filePath}`, error)
      }
      return fallbackValue()
    }
  }

  function saveSync(data: T): void {
    ensureDir()
    const filePath = getPath()
    try {
      const json = JSON.stringify(data, null, 2)
      if (atomic) {
        const tmpPath = `${filePath}.tmp`
        writeFileSync(tmpPath, json, 'utf-8')
        renameSync(tmpPath, filePath)
      } else {
        writeFileSync(filePath, json, 'utf-8')
      }
      updateCache(data)
    } catch (error) {
      logger.error(`[JsonStore] Не удалось сохранить ${filePath}`, error)
      throw error
    }
  }

  async function save(data: T): Promise<void> {
    ensureDir()
    const filePath = getPath()
    try {
      const json = JSON.stringify(data, null, 2)
      if (atomic) {
        const tmpPath = `${filePath}.tmp`
        await writeFile(tmpPath, json, 'utf-8')
        await rename(tmpPath, filePath)
      } else {
        await writeFile(filePath, json, 'utf-8')
      }
      updateCache(data)
    } catch (error) {
      logger.error(`[JsonStore] Не удалось сохранить ${filePath}`, error)
      throw error
    }
  }

  async function update(updates: Partial<T>): Promise<T> {
    const current = await load()
    const updated = { ...current, ...updates }
    await save(updated)
    return updated
  }

  function invalidateCache(): void {
    cachedData = null
    cacheExpiry = 0
  }

  return { getPath, exists, loadSync, load, saveSync, save, update, invalidateCache }
}
