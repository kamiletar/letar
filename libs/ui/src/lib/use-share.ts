'use client'

import { useCallback } from 'react'
import {
  useCopyToClipboard,
  type UseCopyToClipboardOptions,
  type UseCopyToClipboardResult,
} from './use-copy-to-clipboard'

export type UseShareOptions = UseCopyToClipboardOptions

export interface ShareData {
  title?: string
  text?: string
  url?: string
}

/**
 * Результат вызова {@link UseShareResult.share}:
 * - `shared` — сработал нативный `navigator.share`
 * - `copied` — API недоступен или упал — сработал fallback-копирование
 * - `aborted` — пользователь закрыл системный диалог шеринга
 */
export type ShareOutcome = 'shared' | 'copied' | 'aborted'

export interface UseShareResult extends UseCopyToClipboardResult {
  /**
   * Пытается вызвать нативный `navigator.share`. Если API недоступен или падает с ошибкой,
   * отличной от отмены диалога пользователем, — копирует `fallbackText` в буфер обмена.
   */
  share: (data: ShareData, fallbackText: string) => Promise<ShareOutcome>
}

/**
 * `navigator.share` с деградацией до копирования ссылки в буфер.
 *
 * Мобильные браузеры получают нативный лист шеринга, десктоп/без поддержки — fallback на
 * {@link useCopyToClipboard}. Отмена диалога пользователем (`AbortError`) не считается ошибкой —
 * функция тихо завершается без fallback-копирования.
 *
 * @example
 * ```tsx
 * const { share } = useShare()
 * const outcome = await share({ title, text, url }, `${text} ${url}`)
 * if (outcome === 'copied') toaster.success({ title: 'Ссылка скопирована' })
 * ```
 */
export function useShare(options?: UseShareOptions): UseShareResult {
  const { copied, copy } = useCopyToClipboard(options)

  const share = useCallback(
    async (data: ShareData, fallbackText: string): Promise<ShareOutcome> => {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share(data)
          return 'shared'
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return 'aborted'
          }
        }
      }

      await copy(fallbackText)
      return 'copied'
    },
    [copy],
  )

  return { copied, copy, share }
}
