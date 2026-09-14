'use client'

import { useEventSource } from '@letar/hooks'
import { useState } from 'react'

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
  /**
   * Режим httpOnly-cookie (R5 PLAN_EMAIL_CODE.md) — ни `streamToken`, ни `email` не переданы,
   * подписка идёт по `streamUrl` без хвоста, ключ подписки лежит в cookie на сервере.
   */
  enabled?: boolean
  /** Callback при верификации в другой вкладке */
  onVerified?: () => void
}

export interface UseVerificationStreamResult {
  /** Верификация произошла в другой вкладке */
  verifiedInOtherTab: boolean
  /** Закрыть соединение раньше времени (перед собственной успешной проверкой кода — R6) */
  close: () => void
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
  const { streamToken, email, streamUrl = '/api/auth/verification-stream', enabled = true, onVerified } = config
  const [verifiedInOtherTab, setVerifiedInOtherTab] = useState(false)

  // Предпочитаем непубличный streamToken; email — legacy-fallback (§13.1);
  // ни то ни другое — режим httpOnly-cookie (R5), URL без хвоста.
  const streamKey = streamToken ?? email
  const url = streamKey ? `${streamUrl}/${encodeURIComponent(streamKey)}` : streamUrl

  const { disconnect } = useEventSource({
    url,
    enabled,
    withCredentials: !streamKey,
    reconnect: 'none',
    events: {
      message: (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.verified) {
            disconnect()
            setVerifiedInOtherTab(true)
            onVerified?.()
          }
        } catch {
          // Игнорируем ошибки парсинга
        }
      },
      // Таймаут потока (R4) — не ошибка, просто перестать слушать; код всё равно можно ввести вручную.
      timeout: () => {
        disconnect()
      },
    },
  })

  return { verifiedInOtherTab, close: disconnect }
}
