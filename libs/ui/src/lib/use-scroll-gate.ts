'use client'

import { useEffect, useRef, useState } from 'react'

export interface UseScrollGateOptions {
  /**
   * Включить гейт. Если `false` — {@link UseScrollGateResult.reachedEnd} сразу `true`
   * (гейта нет). Удобно отключать, когда согласие уже дано ранее.
   * @default true
   */
  enabled?: boolean
  /**
   * `rootMargin` для IntersectionObserver. Отрицательный нижний отступ заставляет
   * ждать, пока «дно контента» поднимется над липкой панелью, а не просто коснётся
   * края вьюпорта.
   * @default '0px 0px -64px 0px'
   */
  rootMargin?: string
}

export interface UseScrollGateResult {
  /** Реф-маркер: помести в конец прокручиваемого контента (после последнего текста) */
  sentinelRef: React.RefObject<HTMLDivElement | null>
  /** Пользователь досмотрел контент до конца (или гейт выключен) */
  reachedEnd: boolean
}

/**
 * Гейт «прочитай до конца перед действием».
 *
 * Наблюдает за маркером-`sentinel` в конце контента через IntersectionObserver.
 * Как только маркер показался во вьюпорте — `reachedEnd` становится `true` и таким
 * остаётся (пользователь не обязан держать его в поле зрения). Если контент короче
 * экрана — гейт открывается сразу (маркер виден с начала).
 *
 * Связка с {@link StickyActionBar}: держит основную CTA видимой, но `disabled`,
 * пока пользователь не прокрутит весь текст.
 *
 * @example
 * ```tsx
 * const { sentinelRef, reachedEnd } = useScrollGate({ enabled: !consentGiven })
 * return (
 *   <>
 *     <LongContent />
 *     <Box ref={sentinelRef} aria-hidden h="1px" />
 *     <StickyActionBar>
 *       <Button disabled={!reachedEnd} onClick={onStart}>Начать</Button>
 *     </StickyActionBar>
 *   </>
 * )
 * ```
 */
export function useScrollGate({
  enabled = true,
  rootMargin = '0px 0px -64px 0px',
}: UseScrollGateOptions = {}): UseScrollGateResult {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [reachedEnd, setReachedEnd] = useState(false)

  useEffect(() => {
    // Гейт выключен — путь открыт
    if (!enabled) {
      setReachedEnd(true)
      return
    }
    setReachedEnd(false)

    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Нет маркера или окружение без IO (SSR/старый браузер) — не блокируем
      setReachedEnd(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReachedEnd(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled, rootMargin])

  return { sentinelRef, reachedEnd }
}
