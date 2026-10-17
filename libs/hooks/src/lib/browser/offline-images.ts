/** Хранилище двоичных файлов; успех записи означает завершение транзакции, а не отдельного запроса. */
export function createBlobStore(databaseName: string) {
  async function run<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1)
      request.onupgradeneeded = () => request.result.createObjectStore('blobs')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Хранилище занято другой вкладкой'))
    })
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction('blobs', mode)
        const request = operation(tx.objectStore('blobs'))
        tx.oncomplete = () => resolve(request.result)
        tx.onabort = () => reject(tx.error ?? new Error('Запись отменена'))
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }
  return {
    async put(key: string, blob: Blob): Promise<boolean> {
      try {
        // ArrayBuffer переносится и в WebKit, где запись File/Blob может дать DataCloneError.
        const value = { bytes: await blob.arrayBuffer(), type: blob.type }
        await run('readwrite', (store) => store.put(value, key))
        return true
      } catch {
        return false
      }
    },
    async get(key: string): Promise<Blob | null> {
      try {
        const value = await run<unknown>('readonly', (store) => store.get(key))
        if (
          value && typeof value === 'object' && 'bytes' in value && 'type' in value
          && Object.prototype.toString.call(value.bytes) === '[object ArrayBuffer]' && typeof value.type === 'string'
        ) {
          return new Blob([value.bytes as ArrayBuffer], { type: value.type })
        }
        return ['[object Blob]', '[object File]'].includes(Object.prototype.toString.call(value)) ? value as Blob : null
      } catch {
        return null
      }
    },
    async remove(key: string): Promise<void> {
      try {
        await run('readwrite', (store) => store.delete(key))
      } catch { /* Хранилище недоступно. */ }
    },
    async keys(): Promise<string[]> {
      try {
        return (await run('readonly', (store) => store.getAllKeys())).filter((key): key is string =>
          typeof key === 'string'
        )
      } catch {
        return []
      }
    },
  }
}

/** Уменьшение фото выполняется до записи; при отсутствии декодера остаётся исходный файл. */
export async function shrinkImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) { return file }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return result && result.size < file.size ? result : file
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}

/** Формирует multipart только после успешного чтения всех файлов: пропавшее фото не теряется молча. */
export async function withBlobAttachments(
  payload: unknown,
  attachments: Array<{ key: string; blob: Blob | null }>,
): Promise<FormData> {
  const form = new FormData()
  form.append('payload', JSON.stringify(payload))
  for (const { key, blob } of attachments) {
    if (!blob) { throw new Error('Фото на устройстве не найдено. Выберите его заново или уберите обложку.') }
    form.append(key, blob, 'cover.jpg')
  }
  return form
}
