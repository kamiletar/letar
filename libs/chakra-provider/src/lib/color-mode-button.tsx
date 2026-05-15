'use client'

import { IconButton, type IconButtonProps } from '@chakra-ui/react'
import { forwardRef } from 'react'
import { LuMoon, LuSun } from 'react-icons/lu'
import { useColorMode } from './use-color-mode'

export interface ColorModeButtonProps extends Omit<IconButtonProps, 'aria-label'> {
  'aria-label'?: string
}

/**
 * Кнопка переключения между светлой и тёмной темой.
 * Показывает иконку солнца в тёмной теме и луны в светлой.
 */
export const ColorModeButton = forwardRef<HTMLButtonElement, ColorModeButtonProps>(
  function ColorModeButton(props, ref) {
    const { toggleColorMode, resolvedColorMode } = useColorMode()

    return (
      <IconButton
        ref={ref}
        variant="ghost"
        size="sm"
        colorPalette={'fg'}
        aria-label="Переключить тему"
        onClick={toggleColorMode}
        {...props}
      >
        {resolvedColorMode === 'dark' ? <LuSun /> : <LuMoon />}
      </IconButton>
    )
  }
)
