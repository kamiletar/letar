'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { CaptchaSize, CaptchaTheme } from '../types'

/** Пропсы для Yandex SmartCaptcha провайдера */
interface SmartCaptchaProviderProps {
  siteKey: string
  /** SmartCaptcha не поддерживает выбор темы виджета — параметр принимается для единого интерфейса провайдеров, не используется */
  theme?: CaptchaTheme
  size?: CaptchaSize
  language?: string
  onSuccess: (token: string) => void
  onError?: (error: unknown) => void
  onExpire?: () => void
}

type SmartCaptchaLanguage = 'ru' | 'en' | 'be' | 'kk' | 'tt' | 'uk' | 'uz' | 'tr'

const SUPPORTED_LANGUAGES: readonly SmartCaptchaLanguage[] = ['ru', 'en', 'be', 'kk', 'tt', 'uk', 'uz', 'tr']

/**
 * Провайдер Yandex SmartCaptcha.
 *
 * Данные пользователя обрабатываются на серверах в РФ (в отличие от Turnstile/reCAPTCHA/
 * hCaptcha) — используется в приложениях, где это требование 152-ФЗ.
 *
 * Загружает `https://smartcaptcha.cloud.yandex.ru/captcha.js` и рендерит виджет через
 * `window.smartCaptcha.render()`. См. https://yandex.cloud/en/docs/smartcaptcha/concepts/widget-methods
 */
export function SmartCaptchaProvider({
  siteKey,
  size = 'normal',
  language,
  onSuccess,
  onError,
  onExpire,
}: SmartCaptchaProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const handleSuccess = useCallback(
    (token: string) => {
      onSuccess(token)
    },
    [onSuccess],
  )

  useEffect(() => {
    const scriptId = 'yandex-smartcaptcha-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://smartcaptcha.cloud.yandex.ru/captcha.js'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    let unsubscribeNetworkError: (() => void) | undefined
    let unsubscribeTokenExpired: (() => void) | undefined

    const renderWidget = () => {
      if (!containerRef.current || !window.smartCaptcha || widgetIdRef.current !== null) {
        return
      }

      const hl = SUPPORTED_LANGUAGES.includes(language as SmartCaptchaLanguage)
        ? (language as SmartCaptchaLanguage)
        : undefined

      const widgetId = window.smartCaptcha.render(containerRef.current, {
        sitekey: siteKey,
        hl,
        invisible: size === 'invisible',
        callback: handleSuccess,
      })
      widgetIdRef.current = widgetId

      unsubscribeNetworkError = window.smartCaptcha.subscribe(
        widgetId,
        'network-error',
        () => onError?.(new Error('SmartCaptcha network error')),
      )
      unsubscribeTokenExpired = window.smartCaptcha.subscribe(widgetId, 'token-expired', () => onExpire?.())
    }

    // Проверяем готовность API каждые 100ms
    const interval = setInterval(() => {
      if (window.smartCaptcha?.render) {
        clearInterval(interval)
        renderWidget()
      }
    }, 100)

    // Таймаут 10 секунд
    const timeout = setTimeout(() => {
      clearInterval(interval)
    }, 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      unsubscribeNetworkError?.()
      unsubscribeTokenExpired?.()
      if (widgetIdRef.current !== null) {
        window.smartCaptcha?.destroy(widgetIdRef.current)
      }
      widgetIdRef.current = null
    }
  }, [siteKey, language, size, handleSuccess, onError, onExpire])

  return <div ref={containerRef} />
}

// Типизация window.smartCaptcha
declare global {
  interface Window {
    smartCaptcha?: {
      render: (container: HTMLElement | string, params: Record<string, unknown>) => string
      execute: (widgetId?: string) => void
      reset: (widgetId?: string) => void
      destroy: (widgetId?: string) => void
      getResponse: (widgetId?: string) => string
      subscribe: (widgetId: string, event: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}
