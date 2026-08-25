'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * Объявляет screen reader'у смену маршрута при client-side навигации Next.js App Router.
 *
 * App Router (в отличие от старого Pages Router) не даёт встроенного эквивалента —
 * `<title>` обновляется в DOM, но браузеры не озвучивают это изменение сами: пользователь
 * TalkBack/VoiceOver, перешедший по ссылке внутри SPA-навигации, не получает никакого
 * сигнала, что страница вообще сменилась (фокус остаётся на кликнутой ссылке, которая уже
 * не в DOM или ведёт в никуда).
 *
 * `aria-live="polite"` + `role="status"` — то же решение, что раньше давал Reach Router и
 * Next.js Pages Router из коробки. Задержка перед чтением `document.title` — `next/head`/
 * `metadata` API обновляет заголовок асинхронно вместе с RSC-пейлоадом, читать его в том же
 * тике эффекта — гонка с ещё не применённым title.
 *
 * Разместить один раз в корневом layout/shell приложения — не на каждой странице.
 */
export function RouteAnnouncer() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const previousPathname = useRef(pathname)

  useEffect(() => {
    // Сравнение с сохранённым путём (не булев флаг «первый рендер») — идемпотентно под
    // React Strict Mode, который в dev вызывает эффект дважды (setup → cleanup → setup):
    // булев флаг переключался первым вызовом и терял смысл ко второму, отчего баннер
    // объявлял title уже на самом первом монтировании.
    if (previousPathname.current === pathname) {
      return
    }
    previousPathname.current = pathname
    const timer = setTimeout(() => setMessage(document.title), 100)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </div>
  )
}
