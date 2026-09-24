'use client'

import { HStack, SegmentGroup, type SegmentGroupRootProps } from '@chakra-ui/react'
import { forwardRef } from 'react'
import { LuMonitor, LuMoon, LuSun } from 'react-icons/lu'
import { type ColorMode, useColorMode } from './use-color-mode'

const defaultLabels: Record<ColorMode, string> = {
  light: 'Светлая',
  system: 'Система',
  dark: 'Тёмная',
}

const colorModeItems: Array<{ value: ColorMode; icon: React.ReactNode }> = [
  { value: 'light', icon: <LuSun /> },
  { value: 'system', icon: <LuMonitor /> },
  { value: 'dark', icon: <LuMoon /> },
]

export interface ColorModeSelectProps extends Omit<SegmentGroupRootProps, 'value' | 'onValueChange'> {
  /** Показывать иконки вместо текста */
  iconOnly?: boolean
  /** Подписи режимов (например, из i18n); не заданные берутся из русских по умолчанию */
  labels?: Partial<Record<ColorMode, string>>
  /** Растянуть переключатель на всю ширину, сегменты делят её поровну */
  fullWidth?: boolean
}

/**
 * Переключатель цветовой темы с тремя режимами: светлая, системная, тёмная.
 */
export const ColorModeSelect = forwardRef<HTMLDivElement, ColorModeSelectProps>(function ColorModeSelect(
  { iconOnly = false, labels, fullWidth = false, ...props },
  ref,
) {
  const { colorMode, setColorMode } = useColorMode()

  // Преобразуем items в формат для SegmentGroup.Items
  const items = colorModeItems.map((item) => {
    const label = labels?.[item.value] ?? defaultLabels[item.value]
    return {
      value: item.value,
      label: iconOnly
        ? <HStack title={label}>{item.icon}</HStack>
        : (
          <HStack gap={fullWidth ? 1.5 : undefined} justify={fullWidth ? 'center' : undefined}>
            {item.icon}
            {label}
          </HStack>
        ),
    }
  })

  return (
    <SegmentGroup.Root
      ref={ref}
      size="sm"
      w={fullWidth ? 'full' : undefined}
      value={colorMode}
      onValueChange={(e) => setColorMode(e.value as ColorMode)}
      {...props}
    >
      <SegmentGroup.Indicator />
      <SegmentGroup.Items items={items} flex={fullWidth ? '1' : undefined} />
    </SegmentGroup.Root>
  )
})
