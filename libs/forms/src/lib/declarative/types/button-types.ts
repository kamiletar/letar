'use client'

import type { ReactNode } from 'react'

/**
 * Props for submit button
 */
export interface SubmitButtonProps {
  /** Содержимое кнопки (по умолчанию: "Submit") */
  children?: ReactNode
  /** Текст при загрузке (заменяет children во время отправки) */
  loadingText?: ReactNode
  /** Отключить кнопку */
  disabled?: boolean
  /** Цветовая палитра (например 'brand', 'blue', 'red') */
  colorPalette?: string
  /** Размер кнопки */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Вариант кнопки */
  variant?: 'solid' | 'outline' | 'ghost' | 'subtle'
  /** Ширина кнопки (full width: "100%") */
  width?: string | number | Record<string, string | number>
}
