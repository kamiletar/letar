'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { CaptchaSize, CaptchaTheme } from '../types'

/** Пропсы для reCAPTCHA провайдера */
interface RecaptchaProviderProps {
  siteKey: string
  theme?: CaptchaTheme
  size?: CaptchaSize
  language?: string
  onSuccess: (token: string) => void
  onError?: (error: unknown) => void
  onExpire?: () => void
}

/**
 * Провайдер Google reCAPTCHA v2.
 * Загружается лениво через dynamic import.
 * Требует установки react-google-recaptcha.
 */
export function RecaptchaProvider({
  siteKey,
  theme = 'light',
  size = 'normal',
  language,
  onSuccess,
  onError,
  onExpire,
}: RecaptchaProviderProps) {
  // reCAPTCHA v2 — fallback на простой script-based подход
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)

  const handleCallback = useCallback(
    (token: string) => {
      onSuccess(token)
    },
    [onSuccess]
  )

  useEffect(() => {
    // Загружаем reCAPTCHA API скрипт
    const scriptId = 'recaptcha-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit${
        language ? `&hl=${language}` : ''
      }`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    // Ждём загрузки API
    const renderWidget = () => {
      if (containerRef.current && window.grecaptcha && widgetIdRef.current === null) {
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme === 'auto' ? 'light' : theme,
          size: size === 'invisible' ? 'invisible' : size,
          callback: handleCallback,
          'error-callback': () => onError?.(new Error('reCAPTCHA error')),
          'expired-callback': () => onExpire?.(),
        })
      }
    } // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).onRecaptchaLoad = renderWidget

    // Если API уже загружено
    if (window.grecaptcha?.render) {
      renderWidget()
    }

    return () => {
      widgetIdRef.current = null
    }
  }, [siteKey, theme, size, language, handleCallback, onError, onExpire])

  return <div ref={containerRef} />
}

// Типизация window.grecaptcha
declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, params: Record<string, unknown>) => number
      reset: (widgetId?: number) => void
      getResponse: (widgetId?: number) => string
    }
  }
}
