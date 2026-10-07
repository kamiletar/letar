/**
 * Загрузка фото обложек, выбранных без сети, на сайт.
 *
 * Идёт перед отправкой правок: фото уходит на `/api/upload/poem-cover` без poemId (файл ложится
 * во временную папку), а путь запоминается в правке (`attachUploads`) и привязывается к стиху
 * обычной отправкой. Так повторная попытка не загружает уже доехавшие фото заново.
 */

import { getBlob } from './blob-store'
import type { PendingChange } from './poems-store'

export type CoverUploads = Record<string, { blobKey: string; path: string | null }>

/** Ответ, после которого повторять загрузку бессмысленно: фото не принято сайтом совсем */
function isRejection(status: number): boolean {
  return status === 400 || status === 413 || status === 415
}

/**
 * Загружает фото всех правок, у которых оно ещё не на сайте. На первой сетевой ошибке или
 * отказе во входе останавливается: остальное доедет при следующей попытке.
 */
export async function uploadPendingCovers(pending: PendingChange[]): Promise<CoverUploads> {
  const uploads: CoverUploads = {}
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return uploads
  }

  for (const change of pending) {
    const cover = change.cover
    if (change.conflict || change.kind === 'delete' || cover?.kind !== 'set' || cover.uploaded) {
      continue
    }

    const blob = await getBlob(cover.blobKey)
    if (!blob) {
      // фото на телефоне пропало (очистили данные сайта) — отправить нечего
      uploads[change.id] = { blobKey: cover.blobKey, path: null }
      continue
    }

    try {
      const form = new FormData()
      form.append('file', new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' }))
      const response = await fetch('/api/upload/poem-cover', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      })

      if (response.ok) {
        const data: unknown = await response.json()
        const path = typeof data === 'object' && data !== null ? (data as { path?: unknown }).path : undefined
        if (typeof path === 'string') {
          uploads[change.id] = { blobKey: cover.blobKey, path }
        }
      } else if (isRejection(response.status)) {
        // сайт это фото не примет никогда — не тянем его в очереди вечно, текст стиха всё равно уйдёт
        uploads[change.id] = { blobKey: cover.blobKey, path: null }
      } else if (response.status === 401) {
        return uploads
      }
    } catch {
      return uploads
    }
  }

  return uploads
}
