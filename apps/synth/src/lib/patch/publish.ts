// Публикация патча — экспорт из приватного IndexedDB в JSON-файл для витрины /gallery.
// Браузерное ядро без сервера/БД не может само записать файл в apps/synth/patches/ —
// поэтому «Опубликовать» скачивает готовый JSON, а перенос в git — ручной шаг автора (см. patches/README.md).

import type { Patch } from './schema'

export function preparePublicPatch(patch: Patch): Patch {
  return { ...patch, visibility: 'public' }
}

export function downloadPatchJson(patch: Patch): void {
  const publicPatch = preparePublicPatch(patch)
  const json = JSON.stringify(publicPatch, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${publicPatch.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}
