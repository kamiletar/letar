'use client'

import createCache, { type EmotionCache } from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { useServerInsertedHTML } from 'next/navigation'
import { type ReactNode, useState } from 'react'

interface InsertedStyle {
  name: string
  isGlobal: boolean
}

interface Registry {
  cache: EmotionCache
  flush: () => InsertedStyle[]
}

function createRegistry(): Registry {
  const cache = createCache({ key: 'css' })
  // `compat` переключает серверный Emotion (и фабрику Chakra поверх него) в режим «правила копятся
  // в `cache.inserted`, а не возвращаются»: инлайн-`<style>` перед элементом больше не рендерится.
  cache.compat = true
  const baseInsert = cache.insert
  let inserted: InsertedStyle[] = []
  cache.insert = (...args) => {
    const [selector, serialized] = args
    if (cache.inserted[serialized.name] === undefined) {
      inserted.push({ name: serialized.name, isGlobal: !selector })
    }
    return baseInsert(...args)
  }
  return {
    cache,
    flush: () => {
      const flushed = inserted
      inserted = []
      return flushed
    },
  }
}

/**
 * Кеш Emotion для App Router: стили SSR уходят в поток через `useServerInsertedHTML`, а не
 * инлайн-`<style>` перед каждым элементом.
 *
 * Без него потоковый сегмент (например, всё, что внутри `loading.tsx`-границы) приходит со своими
 * `<style data-emotion>` перед элементом. Клиентский `createCache` переносит такие теги в `<head>`
 * только если они уже в DOM на момент инициализации, а поздний сегмент их сохраняет — гидратация
 * натыкается на `<style>` вместо ожидаемого элемента, бросает ошибку React 418 и пересобирает
 * корень: теряется состояние `<details>`, ввод в полях, фокус
 * (.claude/docs/emotion-streaming-inline-style-hydration-418.md). Паттерн — `AppRouterCacheProvider`
 * из MUI.
 *
 * Подключать снаружи `ColorModeProvider`/`RootChakraProvider`, в клиентском `providers.tsx`,
 * который оборачивает `children` корневого `layout.tsx`.
 *
 * CSS кладётся обычным текстом в `<style>`: React 19 внутри `<style>` экранирует только
 * `<style`/`</style`, правила идут как есть.
 */
export function EmotionRegistry({ children }: { children: ReactNode }) {
  const [registry] = useState(createRegistry)

  useServerInsertedHTML(() => {
    const inserted = registry.flush()
    if (inserted.length === 0) {
      return null
    }
    let styles = ''
    let dataEmotionAttribute = registry.cache.key
    const globals: Array<{ name: string; style: string }> = []
    for (const { name, isGlobal } of inserted) {
      const style = registry.cache.inserted[name]
      if (typeof style !== 'string') {
        continue
      }
      if (isGlobal) {
        globals.push({ name, style })
      } else {
        styles += style
        dataEmotionAttribute += ` ${name}`
      }
    }
    return (
      <>
        {globals.map(({ name, style }) => (
          <style key={name} data-emotion={`${registry.cache.key}-global ${name}`}>{style}</style>
        ))}
        {styles && <style data-emotion={dataEmotionAttribute}>{styles}</style>}
      </>
    )
  })

  return <CacheProvider value={registry.cache}>{children}</CacheProvider>
}
