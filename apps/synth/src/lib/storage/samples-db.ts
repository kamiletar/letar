import { createKvStore } from '@/lib/storage/indexeddb-kv'

// Приватное локальное хранилище бинарных сэмплов драм-пэдов — отдельная IndexedDB-база от
// патчей (patches-db.ts): сэмплы это сырые аудио-байты, а не JSON, и им не место внутри
// патча (см. комментарий у DrumPadSampleSchema в schema.ts). Ничего не покидает машину сама
// по себе — публикация патча ссылку на сэмпл не разрешает ни во что скачиваемое другими.

export interface StoredSample {
  id: string
  name: string
  data: ArrayBuffer
  mimeType: string
  createdAt: string
}

const store = createKvStore<StoredSample>('synth-samples', 'samples')

export function generateSampleId(): string {
  return `sample-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function saveSample(sample: StoredSample): Promise<void> {
  await store.put(sample)
}

export async function getSample(id: string): Promise<StoredSample | undefined> {
  return store.get(id)
}

export async function deleteSample(id: string): Promise<void> {
  await store.delete(id)
}
