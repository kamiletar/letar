import type { Patch } from '@/lib/patch/schema'
import { createKvStore } from '@/lib/storage/indexeddb-kv'
import { slugify as slugifyBase } from '@letar/format-utils'

// Приватное локальное хранилище патчей — IndexedDB браузера, ничего не покидает машину
// (см. claude.md §6 «Приватность»). Публикация в /gallery — отдельный ручной шаг (копия в patches/*.json).

const store = createKvStore<Patch>('synth-patches', 'patches', {
  indexes: [
    { name: 'type', keyPath: 'type' },
    { name: 'createdAt', keyPath: 'createdAt' },
  ],
})

/**
 * Транслитерация имени в id-совместимый слаг (схема патча требует /^[a-z0-9-]+$/).
 *
 * Использует общую транслитерацию @letar/format-utils (ГОСТ 7.79-2000, х→kh, щ→shch, ё→yo) —
 * раньше локальная таблица использовала упрощённую транскрипцию (х→h, щ→sch, ё→e). Влияет
 * только на генерацию новых слагов.
 */
export function slugify(name: string): string {
  const slug = slugifyBase(name).slice(0, 40)
  return slug || 'patch'
}

export async function savePatch(patch: Patch): Promise<void> {
  await store.put(patch)
}

export async function listPatches(type: Patch['type']): Promise<Patch[]> {
  const result = await store.getAllByIndex('type', type)
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deletePatch(id: string): Promise<void> {
  await store.delete(id)
}
