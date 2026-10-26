'use client'

import { Button } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

/** Кнопка видна только пока играет церемония входа; без JS её нет, а меню в HTML доступно сразу. */
export function EntrySkip({ label }: { label: string }) {
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    // Ранний скрипт ставит `full` или `short`; церемония снимает атрибут в конце.
    const sync = () => setRunning(root.dataset.kamiEntry === 'full' || root.dataset.kamiEntry === 'short')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-kami-entry'] })
    return () => observer.disconnect()
  }, [])

  if (!running) { return null }
  return (
    <Button
      type="button"
      data-entry-skip=""
      variant="plain"
      size="sm"
      position="fixed"
      right={4}
      top="calc(var(--kami-header-h, 80px) + 8px)"
      zIndex="docked"
      minH="44px"
      color="fg.muted"
      onClick={() => window.dispatchEvent(new Event('kami:entry-skip'))}
    >
      {label}
    </Button>
  )
}
