'use client'

import { Button, type ButtonProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuCheck, LuCopy } from 'react-icons/lu'
import { useCopyToClipboard } from './use-copy-to-clipboard'

export interface CopyToClipboardButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  /**
   * Текст (или ссылка), который скопируется по клику.
   * Функция — для значений, которые нельзя вычислить во время рендера (например
   * `window.location.href` в клиентском компоненте: вычисление в рендере даст hydration
   * mismatch, вычисление по клику — нет).
   */
  text: string | (() => string)
  /** Подпись в обычном состоянии @default 'Скопировать' */
  label?: ReactNode
  /** Подпись после успешного копирования @default 'Скопировано' */
  copiedLabel?: ReactNode
  /** Иконка в обычном состоянии @default <LuCopy /> */
  icon?: ReactNode
  /** Иконка после успешного копирования @default <LuCheck /> */
  copiedIcon?: ReactNode
  /** Через сколько мс сбросить подтверждение обратно в обычное состояние @default 2000 */
  resetDelayMs?: number
}

/**
 * Тонкая кнопка-обёртка над {@link useCopyToClipboard} — копирует `text` по клику
 * и на 2 секунды меняет подпись/иконку на подтверждение.
 *
 * @example
 * ```tsx
 * <CopyToClipboardButton text={() => window.location.href} label="Скопировать ссылку" />
 * ```
 */
export function CopyToClipboardButton({
  text,
  label = 'Скопировать',
  copiedLabel = 'Скопировано',
  icon = <LuCopy size={16} />,
  copiedIcon = <LuCheck size={16} />,
  resetDelayMs,
  ...props
}: CopyToClipboardButtonProps) {
  const { copied, copy } = useCopyToClipboard({ resetDelayMs })

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => copy(typeof text === 'function' ? text() : text)}
      {...props}
    >
      {copied ? copiedIcon : icon}
      {copied ? copiedLabel : label}
    </Button>
  )
}
