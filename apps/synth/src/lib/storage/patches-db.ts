import type { Patch } from '@/lib/patch/schema'
import { createKvStore } from '@/lib/storage/indexeddb-kv'

// Приватное локальное хранилище патчей — IndexedDB браузера, ничего не покидает машину
// (см. claude.md §6 «Приватность»). Публикация в /gallery — отдельный ручной шаг (копия в patches/*.json).

const store = createKvStore<Patch>('synth-patches', 'patches', {
  indexes: [
    { name: 'type', keyPath: 'type' },
    { name: 'createdAt', keyPath: 'createdAt' },
  ],
})

// Транслитерация имени в id-совместимый слаг (схема патча требует /^[a-z0-9-]+$/)
export function slugify(name: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }
  const translit = name
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
  const slug = translit
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
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
