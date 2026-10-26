'use client'

import { Button } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

/** Кнопка видна только пока играет вход; без JS её нет, а меню в HTML доступно сразу. */
export function EntrySkip({ label }: { label: string }) {
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setRunning(root.dataset.kamiEntry === 'running')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-kami-entry'] })
    return () => observer.disconnect()
  }, [])

  if (!running) { return null }
  return (
    <Button
      type="button"
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
