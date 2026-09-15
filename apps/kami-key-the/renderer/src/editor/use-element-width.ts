/**
 * Ширина элемента через ResizeObserver — для масштабирования визуальной клавиатуры под контейнер.
 *
 * `@letar/hooks` даёт только useWindowSize (размер окна целиком, без учёта отступов) — здесь нужна
 * именно ширина контейнера клавиатуры.
 */

import { useEffect, useRef, useState } from 'react'

/** Возвращает ref для замера и текущую ширину элемента в пикселях (0 до первого замера) */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
