import { existsSync } from 'node:fs'
import { createReadStream as fsCreateReadStream } from 'node:fs'
import { mkdir, readFile, realpath, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import { resolveUploadPath } from './serve-uploads'

/** Результат `stat` — различает «нет файла» (404) и «путь запрещён» (403, симлинк наружу). */
export type StorageStatResult = { ok: true; size: number } | { ok: false; reason: 'not-found' | 'forbidden' }

/**
 * Хранилище файлов `uploads/`, за которым спрятана конкретная физическая реализация.
 * Сегодня единственная реализация — {@link createLocalDiskBackend}. Интерфейс — точка
 * расширения на будущее (S3-совместимое хранилище), НЕ готовая многопровайдерная система:
 * второй реализации пока нет и не планируется без выбранного провайдера.
 *
 * `segments` — те же сегменты пути, что отдаёт Next.js App Router в `[...path]`-роуте:
 * без ведущего/конечного слэша, без нормализации — её делает сам backend.
 */
export interface StorageBackend {
  stat(segments: string[]): Promise<StorageStatResult>
  /** Вызывать только после успешного `stat` — backend не обязан заново проверять существование. */
  createReadStream(segments: string[], range?: { start: number; end: number }): ReadableStream<Uint8Array>
  write(segments: string[], data: Buffer): Promise<void>
  /** Не бросает, если файла уже нет — как текущий guard перед `unlink`. */
  delete(segments: string[]): Promise<void>
  /** null — путь вне корня или файл отсутствует. */
  read(segments: string[]): Promise<Buffer | null>
}

/**
 * Backend поверх локального диска — перенос без изменения поведения логики, которая раньше
 * была прямо в `serve-uploads.ts`/`image-upload-route.ts`/`versioned-upload-url.ts`.
 */
export function createLocalDiskBackend(root: string): StorageBackend {
  // Разыменованный корень нужен на каждом чтении для защиты от симлинка, указывающего наружу —
  // вычисляем один раз и переиспользуем, он не может измениться в рантайме.
  let realRootPromise: Promise<string | null> | undefined
  const getRealRoot = () => {
    realRootPromise ??= realpath(path.resolve(/* turbopackIgnore: true */ root)).catch(() => null)
    return realRootPromise
  }

  async function statFile(segments: string[]): Promise<StorageStatResult> {
    const resolved = resolveUploadPath(root, segments)
    if (!resolved.ok) {
      return { ok: false, reason: 'not-found' }
    }

    let fileStat
    try {
      fileStat = await stat(/* turbopackIgnore: true */ resolved.absPath)
    } catch {
      return { ok: false, reason: 'not-found' }
    }

    if (!fileStat.isFile()) {
      return { ok: false, reason: 'not-found' }
    }

    const realRoot = await getRealRoot()
    if (realRoot) {
      const realFile = await realpath(/* turbopackIgnore: true */ resolved.absPath).catch(() => null)
      if (!realFile) {
        return { ok: false, reason: 'not-found' }
      }

      const realRel = path.relative(realRoot, realFile)
      if (realRel === '' || realRel === '..' || realRel.startsWith(`..${path.sep}`) || path.isAbsolute(realRel)) {
        return { ok: false, reason: 'forbidden' }
      }
    }

    return { ok: true, size: fileStat.size }
  }

  function createStream(segments: string[], range?: { start: number; end: number }): ReadableStream<Uint8Array> {
    const resolved = resolveUploadPath(root, segments)
    if (!resolved.ok) {
      throw new Error(`Путь выходит за пределы uploads: ${segments.join('/')}`)
    }

    const stream = range
      ? fsCreateReadStream(/* turbopackIgnore: true */ resolved.absPath, { start: range.start, end: range.end })
      : fsCreateReadStream(/* turbopackIgnore: true */ resolved.absPath)

    return Readable.toWeb(stream) as ReadableStream<Uint8Array>
  }

  async function write(segments: string[], data: Buffer): Promise<void> {
    const resolved = resolveUploadPath(root, segments)
    if (!resolved.ok) {
      throw new Error(`Путь выходит за пределы uploads: ${segments.join('/')}`)
    }

    await mkdir(/* turbopackIgnore: true */ path.dirname(resolved.absPath), { recursive: true })
    await writeFile(/* turbopackIgnore: true */ resolved.absPath, data)
  }

  async function deleteFile(segments: string[]): Promise<void> {
    const resolved = resolveUploadPath(root, segments)
    if (!resolved.ok) {
      return
    }

    if (existsSync(/* turbopackIgnore: true */ resolved.absPath)) {
      await unlink(/* turbopackIgnore: true */ resolved.absPath)
    }
  }

  async function read(segments: string[]): Promise<Buffer | null> {
    const resolved = resolveUploadPath(root, segments)
    if (!resolved.ok) {
      return null
    }

    try {
      return await readFile(/* turbopackIgnore: true */ resolved.absPath)
    } catch {
      return null
    }
  }

  return { stat: statFile, createReadStream: createStream, write, delete: deleteFile, read }
}
