'use client'

import { Box, Flex, Separator, Text } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'

/**
 * Props для Form.Divider
 */
export interface FormDividerProps {
  /** Текстовая метка на разделителе */
  label?: ReactNode
  /** Иконка перед меткой */
  icon?: ReactNode
  /** Стиль линии */
  variant?: 'solid' | 'dashed' | 'dotted'
  /** Размер (толщина линии) */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Цветовая палитра */
  colorPalette?: string
}

/**
 * Form.Divider — разделитель секций формы
 *
 * Горизонтальная линия с опциональным текстом и иконкой.
 * На базе Chakra UI Separator.
 *
 * @example Простой разделитель
 * ```tsx
 * <Form.Field.String name="firstName" />
 * <Form.Divider />
 * <Form.Field.String name="email" />
 * ```
 *
 * @example С меткой
 * ```tsx
 * <Form.Divider label="Контактная информация" />
 * ```
 *
 * @example С иконкой
 * ```tsx
 * import { LuPhone } from 'react-icons/lu'
 * <Form.Divider label="Телефоны" icon={<LuPhone />} />
 * ```
 */
export function FormDivider({
  label,
  icon,
  variant = 'solid',
  size = 'xs',
  colorPalette = 'gray',
}: FormDividerProps): ReactElement {
  // Простой разделитель без метки
  if (!label && !icon) {
    return <Separator variant={variant} size={size} colorPalette={colorPalette} my={3} />
  }

  // Разделитель с меткой (линия — текст — линия)
  return (
    <Flex align="center" gap={3} my={3}>
      <Separator flex="1" variant={variant} size={size} colorPalette={colorPalette} />
      <Flex align="center" gap={1.5} flexShrink={0}>
        {icon && <Box color="fg.muted">{icon}</Box>}
        <Text fontSize="sm" color="fg.muted" fontWeight="medium" whiteSpace="nowrap">
          {label}
        </Text>
      </Flex>
      <Separator flex="1" variant={variant} size={size} colorPalette={colorPalette} />
    </Flex>
  )
}
