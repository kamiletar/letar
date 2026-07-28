import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Единый гейт всех dev-роутов (`/dev/*`): превью индексов, печатная раздатка,
 * презентация. В production-сборке ни одна из этих страниц не существует.
 *
 * Раньше каждая из семи страниц вызывала `notFound()` сама. Это защита, которую
 * легко забыть в новой странице — и тогда dev-превью уезжает на прод. Здесь
 * она включена по умолчанию: чтобы новый роут оказался открытым, его нужно
 * вынести из этой папки осознанно.
 *
 * ⚠️ Гейт закрывает страницы и на staging тоже: `next build` всегда выставляет
 * `NODE_ENV=production`, независимо от реального окружения (см.
 * [env-files](/.claude/rules/env-files.md)). Это ожидаемое поведение — фестивальная
 * раздатка и презентация печатаются с локальной машины через `nx dev archetest`,
 * а не по боевой ссылке. Планировать печать заранее, не в день феста.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return children
}
