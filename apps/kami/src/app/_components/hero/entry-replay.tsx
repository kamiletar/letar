'use client'

import { IconButton } from '@chakra-ui/react'
import { trackEvent } from '@letar/analytics'
import { useSyncExternalStore } from 'react'
import { LuRotateCcw } from 'react-icons/lu'

const REDUCED = '(prefers-reduced-motion: reduce)'

function subscribe(notify: () => void) {
  const query = matchMedia(REDUCED)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}

/**
 * Значок ↻ «Перезапустить вход» в углу (KM-018, KM-039): проигрывает полную версию без перезагрузки
 * и без экрана языка. Кнопка есть только при JS и без reduced-motion; на сервере и до гидратации её нет.
 * Пока идёт вход, весь угол скрыт (`global.css`). Цель касания — 44 px.
 */
export function EntryReplay({ label }: { label: string }) {
  const ready = useSyncExternalStore(subscribe, () => !matchMedia(REDUCED).matches, () => false)
  if (!ready) { return null }

  return (
    <IconButton
      type="button"
      data-entry-replay=""
      variant="ghost"
      size="sm"
      minW="44px"
      minH="44px"
      color="fg.muted"
      aria-label={label}
      title={label}
      onClick={() => {
        trackEvent('entry-replay')
        window.dispatchEvent(new Event('kami:entry-replay'))
      }}
    >
      <LuRotateCcw />
    </IconButton>
  )
}
