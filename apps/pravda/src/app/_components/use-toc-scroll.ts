import { useEffect, useState } from 'react'

export interface TocItem {
  id: string
  text: string
  level: number
}

const HEADING_SELECTOR = 'h2[id], h3[id], [id^="section-"], [id^="chapter-"]'

/**
 * Отступ триггера активного пункта — HEADER_HEIGHT (60, scroll-padding-top в globals.css) +
 * SCROLL_MARGIN_TOP (20, scroll-margin-top секций/глав/статей), см. комментарий у
 * SCROLL_MARGIN_TOP в lib/constants.ts.
 */
const ACTIVE_THRESHOLD = 80

/**
 * Опрос вместо `scroll`-листенера: в headless WebKit без OS-фокуса окна программный
 * `window.scrollTo()` не всегда доставляет DOM-событие `scroll` (похоже на тот же механизм, что и
 * зависающий `scrollIntoView(smooth)` — оба завязаны на композитор-кадр, которого без фокуса не
 * происходит, см. .claude/docs/scrollintoview-smooth-frozen-without-window-focus.md) — throttled
 * `handleScroll` в таком случае не срабатывает вовсе, прогресс-бар стабильно застревал на 0% в
 * e2e (webkit stable fail, chromium/firefox flaky — там композитор иногда всё же тикает).
 * Периодический `setInterval` читает `scrollY` напрямую и не зависит от доставки события.
 */
const POLL_MS = 50

/**
 * Собирает заголовки документа из DOM (один проход querySelectorAll).
 * Вызывается только из useEffect (после коммита), НЕ из ленивого инициализатора useState —
 * ленивый initializer читает `document` уже в первом клиентском рендере при гидратации, сервер
 * (headings=[]) и клиент (headings=N) расходятся — React ловит hydration mismatch и на неудачных
 * прогонах откатывается к ПОЛНОМУ пересозданию поддерева `<body>`. Клик, попавший в середину
 * такого remount, срабатывает на уже отсоединённом узле и теряется.
 */
function collectHeadings(elements: Element[]): TocItem[] {
  return elements.map((el) => {
    let text: string

    // Для Section/Chapter ищем заголовок внутри
    if (el.id.startsWith('section-') || el.id.startsWith('chapter-')) {
      const heading = el.querySelector('h2, h3')
      text = heading?.textContent || ''

      // Для Chapter добавляем "Глава X" из Badge
      if (el.id.startsWith('chapter-')) {
        const badge = el.querySelector('[class*="badge"]')
        const badgeText = badge?.textContent || ''
        text = badgeText ? `${badgeText}. ${text}` : text
      }
    } else {
      text = el.textContent || ''
    }

    return {
      id: el.id,
      text,
      level: el.tagName === 'H2' || el.id.startsWith('section-') ? 2 : 3,
    }
  })
}

interface TocScrollState {
  headings: TocItem[]
  activeId: string
  progress: number
}

/**
 * Сбор заголовков документа + scroll-spy (прогресс чтения, активный пункт) — общая часть
 * десктопного и мобильного TOC. `resetKey` — опциональный триггер пересбора (десктопный TOC
 * передаёт `pathname`, чтобы сбрасывать состояние при клиентской навигации; мобильный не
 * передаёт ничего — эффект отрабатывает один раз при монтировании, как раньше).
 */
export function useTocScroll(resetKey?: string): TocScrollState {
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    // Синхронизация с навигацией (внешняя система) — сброс состояния при смене страницы
    // oxlint-disable-next-line react/set-state-in-effect
    setActiveId('')
    setProgress(0)

    const elements = Array.from(document.querySelectorAll(HEADING_SELECTOR))
    setHeadings(collectHeadings(elements))

    const update = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, scrollProgress)))

      let active = ''
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= ACTIVE_THRESHOLD) {
          active = el.id
        }
      }
      setActiveId(active)
    }

    update() // Инициализируем значение
    const intervalId = setInterval(update, POLL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [resetKey])

  return { headings, activeId, progress }
}
