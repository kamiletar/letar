'use client'

import { Box, Button } from '@chakra-ui/react'
import { trackEvent } from '@letar/analytics'
import { useSyncExternalStore } from 'react'

const REDUCED = '(prefers-reduced-motion: reduce)'

function subscribe(notify: () => void) {
  const query = matchMedia(REDUCED)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}

/**
 * Неброская кнопка «Перезапустить вход» под меню (KM-018): проигрывает полную версию без перезагрузки.
 * Обёртка с резервом высоты приходит в HTML, чтобы появление кнопки после гидратации не сдвигало раскладку;
 * кнопка есть только при JS и без reduced-motion, а пока идёт вход — скрыта (`global.css`).
 */
export function EntryReplay({ label }: { label: string }) {
  // На сервере и до гидратации кнопки нет; на клиенте она есть, пока не включено reduced-motion.
  const ready = useSyncExternalStore(subscribe, () => !matchMedia(REDUCED).matches, () => false)

  return (
    <Box minH="44px" data-entry-replay-slot="">
      {ready && (
        <Button
          type="button"
          data-entry-replay=""
          variant="plain"
          size="sm"
          minH="44px"
          px={0}
          fontSize="sm"
          fontWeight="normal"
          color="fg.muted"
          textDecoration="underline"
          textUnderlineOffset="3px"
          onClick={() => {
            trackEvent('entry-replay')
            window.dispatchEvent(new Event('kami:entry-replay'))
          }}
        >
          {label}
        </Button>
      )}
    </Box>
  )
}
