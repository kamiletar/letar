/**
 * Режим чтеца — стихи поэта для выступления: крупный текст, полный экран, работа без сети.
 *
 * Страница статична и не содержит данных: сборка кладёт её в precache service worker'а
 * (см. `additionalPrecacheEntries` в next.config.mjs), а стихи берутся из локальной копии
 * в памяти телефона. Поэтому открывается без интернета и без входа.
 */

import type { Metadata } from 'next'

import { PoemReader } from './_components/poem-reader'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Режим чтеца',
  robots: { index: false, follow: false },
}

export default function ReaderPage() {
  return <PoemReader />
}
