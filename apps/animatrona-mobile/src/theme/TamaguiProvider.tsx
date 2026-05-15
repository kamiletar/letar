/**
 * Провайдер Tamagui для приложения
 */

import { TamaguiProvider as TamaguiProviderBase, Theme } from '@tamagui/core'
import React from 'react'

import config from './tamagui.config'

interface TamaguiProviderProps {
  children: React.ReactNode
}

export function TamaguiProvider({ children }: TamaguiProviderProps) {
  return (
    <TamaguiProviderBase config={config} defaultTheme="dark">
      <Theme name="dark">{children}</Theme>
    </TamaguiProviderBase>
  )
}
