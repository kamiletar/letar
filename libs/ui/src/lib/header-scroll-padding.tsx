'use client'

import { useEffect } from 'react'

export interface HeaderScrollPaddingProps {
  /** CSS-переменная на documentElement, в которую пишется высота шапки, например `--dw-header-h` */
  cssVar: string
  /** CSS-селектор sticky-шапки. По умолчанию `header` */
  selector?: string
}

/**
 * Резервирует место под sticky-шапку при скролле к фокусу/якорю (WCAG 2.4.11 Focus Not
 * Obscured) — без этого Tab и переход по #hash подводят элемент прямо под шапку, и он
 * оказывается визуально перекрыт. Высота шапки может меняться (адаптивная раскладка, перенос
 * строк, баннеры), поэтому измеряется реальный DOM, а не хардкодится px.
 *
 * Записанную переменную подключи в глобальном CSS приложения:
 * `html { scrollPaddingTop: 'var(--моя-переменная, <fallback>)' }`.
 */
export function HeaderScrollPadding({ cssVar, selector = 'header' }: HeaderScrollPaddingProps) {
  useEffect(() => {
    const header = document.querySelector(selector)
    if (!header) {
      return
    }

    const root = document.documentElement
    const update = () => {
      root.style.setProperty(cssVar, `${header.getBoundingClientRect().height}px`)
    }
    update()

    // ResizeObserver покрывает изменение высоты самой шапки (перенос строки, баннер),
    // window resize/orientationchange — смену брейкпоинта раскладки в целом
    const observer = new ResizeObserver(update)
    observer.observe(header)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [cssVar, selector])

  return null
}
