'use client'

import { useEffect, useRef } from 'react'
import type { CaptchaSize, CaptchaTheme } from '../types'

/** Пропсы для Turnstile провайдера */
interface TurnstileProviderProps {
  siteKey: string
  theme?: CaptchaTheme
  size?: CaptchaSize
  language?: string
  onSuccess: (token: string) => void
  onError?: (error: unknown) => void
  onExpire?: () => void
}

/** Часть `window.turnstile`, которой пользуется провайдер (https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) */
interface TurnstileApi {
  render: (container: HTMLElement, params: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

const SCRIPT_ID = 'cloudflare-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// ⚠️ Тип `window.turnstile` объявлен локально, без `declare global`: так он не конфликтует с типами
// `@marsidev/react-turnstile`, если они есть в проекте потребителя.
function getTurnstile(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile
}

/**
 * Подключает скрипт Turnstile один раз на страницу и отдаёт `window.turnstile`, когда он загрузился.
 * Без состояния на уровне модуля: «один раз» держится на теге `<script id>` в документе, поэтому
 * несколько виджетов и повторные монтирования добавляют скрипт один раз.
 */
function loadTurnstile(): Promise<TurnstileApi> {
  const existing = getTurnstile()
  if (existing) {
    return Promise.resolve(existing)
  }

  return new Promise<TurnstileApi>((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    const tag = script
    tag.addEventListener('load', () => {
      const api = getTurnstile()
      if (api) {
        resolve(api)
      } else {
        reject(new Error('Turnstile: скрипт загружен, но window.turnstile не появился'))
      }
    }, { once: true })
    tag.addEventListener('error', () => {
      // Убираем тег, чтобы следующее монтирование могло попробовать снова
      tag.remove()
      reject(new Error('Turnstile: не удалось загрузить скрипт'))
    }, { once: true })
  })
}

/**
 * Провайдер Cloudflare Turnstile.
 * Грузит `https://challenges.cloudflare.com/turnstile/v0/api.js` сам и рисует виджет через
 * `window.turnstile.render()`, сторонний пакет не нужен.
 */
export function TurnstileProvider({
  siteKey,
  theme = 'auto',
  size = 'normal',
  language,
  onSuccess,
  onError,
  onExpire,
}: TurnstileProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Колбэки в ref: новая функция на каждый рендер родителя не должна пересоздавать виджет
  const callbacksRef = useRef({ onSuccess, onError, onExpire })
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError, onExpire }
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }

    let cancelled = false
    let widgetId: string | null = null
    let api: TurnstileApi | null = null

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) {
          return
        }
        api = turnstile
        widgetId = turnstile.render(container, {
          sitekey: siteKey,
          theme,
          size,
          language,
          callback: (token: string) => callbacksRef.current.onSuccess(token),
          'error-callback': (error?: unknown) => callbacksRef.current.onError?.(error),
          'expired-callback': () => callbacksRef.current.onExpire?.(),
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          callbacksRef.current.onError?.(error)
        }
      })

    return () => {
      cancelled = true
      if (api && widgetId !== null) {
        api.remove(widgetId)
      }
    }
  }, [siteKey, theme, size, language])

  return <div ref={containerRef} />
}
