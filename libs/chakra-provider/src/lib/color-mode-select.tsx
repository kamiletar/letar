'use client'

import { HStack, SegmentGroup, type SegmentGroupRootProps } from '@chakra-ui/react'
import { forwardRef } from 'react'
import { LuMonitor, LuMoon, LuSun } from 'react-icons/lu'
import { type ColorMode, useColorMode } from './use-color-mode'

const colorModeItems: Array<{ value: ColorMode; label: string; icon: React.ReactNode }> = [
  { value: 'light', label: 'Светлая', icon: <LuSun /> },
  { value: 'system', label: 'Система', icon: <LuMonitor /> },
  { value: 'dark', label: 'Тёмная', icon: <LuMoon /> },
]

export interface ColorModeSelectProps extends Omit<SegmentGroupRootProps, 'value' | 'onValueChange'> {
  /** Показывать иконки вместо текста */
  iconOnly?: boolean
}

/**
 * Переключатель цветовой темы с тремя режимами: светлая, системная, тёмная.
 */
export const ColorModeSelect = forwardRef<HTMLDivElement, ColorModeSelectProps>(function ColorModeSelect(
  { iconOnly = false, ...props },
  ref,
) {
  const { colorMode, setColorMode } = useColorMode()

  // Преобразуем items в формат для SegmentGroup.Items
  const items = colorModeItems.map((item) => ({
    value: item.value,
    label: iconOnly ? <HStack title={item.label}>{item.icon}</HStack> : (
      <HStack>
        {item.icon}
        {item.label}
      </HStack>
    ),
  }))

  return (
    <SegmentGroup.Root
      ref={ref}
      size="sm"
      value={colorMode}
      onValueChange={(e) => setColorMode(e.value as ColorMode)}
      {...props}
    >
      <SegmentGroup.Indicator />
      <SegmentGroup.Items items={items} />
    </SegmentGroup.Root>
  )
})
