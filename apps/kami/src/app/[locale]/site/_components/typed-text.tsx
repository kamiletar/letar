'use client'

import { MENU_ENTRY_FLAG } from '@/app/_components/hero/game-menu'
import { useEffect, useState, useSyncExternalStore } from 'react'

/** Флаг свежий, если ему меньше 10 с и он записан этим же документом (клиентский переход, не reload). */
function isFreshMenuEntry() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { return false }
  try {
    const [stamp, origin] = (sessionStorage.getItem(MENU_ENTRY_FLAG) ?? '').split(':')
    return Date.now() - Number(stamp) < 10_000 && Number(origin) === performance.timeOrigin
  } catch {
    return false
  }
}

const subscribeNever = () => () => {}

/**
 * Текст первого экрана посадочной. Весь текст уже в DOM (для SEO и скринридера); при переходе из
 * меню буквы проявляются по очереди, остальное держит место невидимым. Прямой заход, reload и
 * reduced-motion — статично. Флаг не снимается при чтении: Strict Mode и повторный монтаж.
 */
export function TypedText({ text, delay = 0, speed = 28 }: { text: string; delay?: number; speed?: number }) {
  // На сервере и при гидратации — статичный текст; набор включается только на клиенте.
  const typing = useSyncExternalStore(subscribeNever, isFreshMenuEntry, () => false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!typing) { return }
    let timer = 0
    let shown = 0
    const step = () => {
      shown++
      setCount(shown)
      if (shown < text.length) { timer = window.setTimeout(step, speed) }
    }
    timer = window.setTimeout(step, delay)
    return () => window.clearTimeout(timer)
  }, [typing, text, delay, speed])

  if (!typing || count >= text.length) { return <>{text}</> }
  return (
    <>
      {text.slice(0, count)}
      <span style={{ visibility: 'hidden' }}>{text.slice(count)}</span>
    </>
  )
}
