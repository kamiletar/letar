'use client'

import { Alert, Box } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'

/**
 * Props для Form.InfoBlock
 */
export interface FormInfoBlockProps {
  /** Вариант блока (определяет цвет и иконку) */
  variant?: 'info' | 'warning' | 'error' | 'success' | 'tip'
  /** Заголовок блока */
  title?: ReactNode
  /** Содержимое блока */
  children: ReactNode
  /** Визуальный стиль Alert (Chakra variant) */
  appearance?: 'subtle' | 'surface' | 'outline' | 'solid'
  /** Размер */
  size?: 'sm' | 'md' | 'lg'
}

/** Маппинг variant → Chakra Alert status */
const STATUS_MAP: Record<string, 'info' | 'warning' | 'error' | 'success'> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  success: 'success',
  tip: 'info',
}

/** Маппинг variant → цветовая палитра */
const COLOR_MAP: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
  success: 'green',
  tip: 'teal',
}

/**
 * Form.InfoBlock — информационный блок внутри формы
 *
 * Показывает info/warning/error/success/tip сообщения.
 * На базе Chakra UI Alert.
 *
 * @example
 * ```tsx
 * <Form.InfoBlock variant="info" title="Важно">
 *   Заполните все поля для получения скидки 10%.
 * </Form.InfoBlock>
 * ```
 *
 * @example Условное отображение
 * ```tsx
 * <Form.When field="type" is="company">
 *   <Form.InfoBlock variant="warning">
 *     Для компаний требуется ИНН и КПП.
 *   </Form.InfoBlock>
 * </Form.When>
 * ```
 */
export function FormInfoBlock({
  variant = 'info',
  title,
  children,
  appearance = 'subtle',
  size = 'md',
}: FormInfoBlockProps): ReactElement {
  const status = STATUS_MAP[variant] ?? 'info'
  const colorPalette = COLOR_MAP[variant] ?? 'blue'

  return (
    <Alert.Root status={status} variant={appearance} size={size} colorPalette={colorPalette}>
      <Alert.Indicator />
      {title ? (
        <Box>
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description>{children}</Alert.Description>
        </Box>
      ) : (
        <Alert.Description>{children}</Alert.Description>
      )}
    </Alert.Root>
  )
}
