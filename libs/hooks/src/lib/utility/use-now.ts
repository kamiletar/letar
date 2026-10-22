'use client'

import { useEffect, useState } from 'react'

/**
 * Текущее время для рендера
 *
 * Замена `new Date()` в теле компонента. Такой вызов даёт новое значение на каждом рендере
 * (поведение зависит от того, когда React решил перерисовать компонент), а при SSR — разные
 * значения на сервере и при гидрации; oxlint ловит его правилом `react/purity`. Хук фиксирует
 * время при монтировании, а с `refreshMs` обновляет его по таймеру — для того, что должно
 * «тикать»: статус «прошло/предстоит», виджет «сегодня», обратный отсчёт.
 *
 * Только для клиентских компонентов. В серверном компоненте `new Date()` — это время запроса,
 * оно и нужно.
 *
 * @param refreshMs - Интервал обновления в миллисекундах; без него время фиксируется на монтировании
 * @returns Время монтирования или последнего обновления по таймеру
 *
 * @example
 * ```tsx
 * const now = useNow(60_000)
 * const isPast = lesson.startTime < now
 * ```
 */
export function useNow(refreshMs?: number): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!refreshMs) {
      return
    }
    const id = setInterval(() => setNow(new Date()), refreshMs)
    return () => clearInterval(id)
  }, [refreshMs])

  return now
}
