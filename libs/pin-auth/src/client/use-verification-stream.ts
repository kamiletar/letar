'use client'

import { useEffect, useState } from 'react'

export interface UseVerificationStreamConfig {
  /** Email для отслеживания верификации */
  email: string
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
  const { email, streamUrl = '/api/auth/verification-stream', onVerified } = config
  const [verifiedInOtherTab, setVerifiedInOtherTab] = useState(false)

  useEffect(() => {
    const eventSource = new EventSource(`${streamUrl}/${encodeURIComponent(email)}`)

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
  }, [email, streamUrl, onVerified])

  return { verifiedInOtherTab }
}
