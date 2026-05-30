'use client'

import { useEffect, useState } from 'react'

export interface UseVerificationStreamConfig {
  /**
   * Непубличный токен SSE-потока (§13.1) — предпочтительный способ подписки.
   * Используется вместо email в URL, чтобы исключить enumeration чужих email.
   * Если задан, имеет приоритет над `email`.
   */
  streamToken?: string
  /**
   * Email для отслеживания верификации (legacy-путь).
   * ⚠️ Раскрывает email в URL — оставлен для обратной совместимости; предпочитайте `streamToken`.
   */
  email?: string
  /** URL SSE endpoint (по умолчанию /api/auth/verification-stream) */
  streamUrl?: string
  /** Callback при верификации в другой вкладке */
  onVerified?: () => void
}

export interface UseVerificationStreamResult {
  /** Верификация произошла в другой вкладке */
  verifiedInOtherTab: boolean
}

/**
 * Хук для отслеживания верификации через SSE (Server-Sent Events).
 *
 * Позволяет обнаружить, когда пользователь верифицировался в другой вкладке
 * (например, перейдя по ссылке из письма).
 *
 * @example
 * ```tsx
 * const { verifiedInOtherTab } = useVerificationStream({
 *   email,
 *   onVerified: () => {
 *     // Показать сообщение об успехе
 *   },
 * })
 *
 * if (verifiedInOtherTab) {
 *   return <VerifiedMessage />
 * }
 * ```
 */
export function useVerificationStream(config: UseVerificationStreamConfig): UseVerificationStreamResult {
  const { streamToken, email, streamUrl = '/api/auth/verification-stream', onVerified } = config
  const [verifiedInOtherTab, setVerifiedInOtherTab] = useState(false)

  // Предпочитаем непубличный streamToken; email — legacy-fallback (§13.1)
  const streamKey = streamToken ?? email

  useEffect(() => {
    if (!streamKey) {
      return
    }

    const eventSource = new EventSource(`${streamUrl}/${encodeURIComponent(streamKey)}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.verified) {
          eventSource.close()
          setVerifiedInOtherTab(true)
          onVerified?.()
        }
      } catch {
        // Игнорируем ошибки парсинга
      }
    }

    eventSource.onerror = () => {
      // SSE ошибка — не критично, пользователь может использовать PIN
      eventSource.close()
    }

    return () => eventSource.close()
  }, [streamKey, streamUrl, onVerified])

  return { verifiedInOtherTab }
}
