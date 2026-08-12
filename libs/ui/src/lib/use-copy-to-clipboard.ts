'use client'

import { useCallback, useRef, useState } from 'react'

export interface UseCopyToClipboardOptions {
  /**
   * Через сколько мс сбросить {@link UseCopyToClipboardResult.copied} обратно в `false`.
   * @default 2000
   */
  resetDelayMs?: number
}

export interface UseCopyToClipboardResult {
  /** `true` в течение `resetDelayMs` мс после успешного копирования */
  copied: boolean
  /** Скопировать текст в буфер обмена */
  copy: (text: string) => Promise<void>
}

/**
 * Копирование текста в буфер обмена с fallback на `execCommand('copy')`.
 *
 * `navigator.clipboard.writeText` требует секьюрный контекст и фокус документа — падает,
 * например, сразу после клика, снявшего фокус с вкладки (диалоги, переход из другого окна).
 * Запасной путь через временный `<textarea>` работает почти везде.
 *
 * @example
 * ```tsx
 * const { copied, copy } = useCopyToClipboard()
 * return <Button onClick={() => copy(url)}>{copied ? 'Скопировано' : 'Копировать'}</Button>
 * ```
 */
export function useCopyToClipboard({ resetDelayMs = 2000 }: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.append(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      setCopied(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), resetDelayMs)
    },
    [resetDelayMs],
  )

  return { copied, copy }
}
