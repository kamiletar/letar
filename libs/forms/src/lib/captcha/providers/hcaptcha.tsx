'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { CaptchaSize, CaptchaTheme } from '../types'

/** Пропсы для hCaptcha провайдера */
interface HcaptchaProviderProps {
  siteKey: string
  theme?: CaptchaTheme
  size?: CaptchaSize
  language?: string
  onSuccess: (token: string) => void
  onError?: (error: unknown) => void
  onExpire?: () => void
}

/**
 * Провайдер hCaptcha.
 * Загружает hCaptcha JS API через скрипт.
 */
export function HcaptchaProvider({
  siteKey,
  theme = 'light',
  size = 'normal',
  language,
  onSuccess,
  onError,
  onExpire,
}: HcaptchaProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const handleCallback = useCallback(
    (token: string) => {
      onSuccess(token)
    },
    [onSuccess]
  )

  useEffect(() => {
    // Загружаем hCaptcha API скрипт
    const scriptId = 'hcaptcha-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    const renderWidget = () => {
      if (containerRef.current && window.hcaptcha && widgetIdRef.current === null) {
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme === 'auto' ? 'light' : theme,
          size: size === 'invisible' ? 'invisible' : size,
          hl: language,
          callback: handleCallback,
          'error-callback': () => onError?.(new Error('hCaptcha error')),
          'expired-callback': () => onExpire?.(),
        })
      }
    }

    // Проверяем готовность API каждые 100ms
    const interval = setInterval(() => {
      if (window.hcaptcha?.render) {
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
      widgetIdRef.current = null
    }
  }, [siteKey, theme, size, language, handleCallback, onError, onExpire])

  return <div ref={containerRef} />
}

// Типизация window.hcaptcha
declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, params: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      getResponse: (widgetId?: string) => string
    }
  }
}
