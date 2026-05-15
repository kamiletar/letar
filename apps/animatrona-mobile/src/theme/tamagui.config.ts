/**
 * Конфигурация Tamagui для Animatrona Mobile
 *
 * Тема основана на дизайн-системе Animatrona Desktop (Chakra UI)
 * с акцентным purple цветом
 */

import { themes as defaultThemes, tokens as defaultTokens } from '@tamagui/config/v3'
import { createTamagui, createTokens } from '@tamagui/core'
import { shorthands } from '@tamagui/shorthands'

// Кастомные токены цветов (фирменная purple тема Animatrona)
const customColors = {
  // Gray scale (основан на Chakra gray)
  gray50: '#F7FAFC',
  gray100: '#EDF2F7',
  gray200: '#E2E8F0',
  gray300: '#CBD5E0',
  gray400: '#A0AEC0',
  gray500: '#718096',
  gray600: '#4A5568',
  gray700: '#2D3748',
  gray800: '#1A202C',
  gray900: '#171923',
  gray950: '#0D1117',

  // Purple (акцентный цвет Animatrona)
  purple50: '#FAF5FF',
  purple100: '#E9D8FD',
  purple200: '#D6BCFA',
  purple300: '#B794F4',
  purple400: '#9F7AEA',
  purple500: '#805AD5',
  purple600: '#6B46C1',
  purple700: '#553C9A',
  purple800: '#44337A',
  purple900: '#322659',

  // Semantic colors
  background: '#0D1117',
  backgroundSecondary: '#171923',
  backgroundTertiary: '#1A202C',
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textMuted: '#718096',

  // Status colors
  success: '#48BB78',
  warning: '#ECC94B',
  error: '#F56565',
  info: '#4299E1',
}

// Создаём токены
const tokens = createTokens({
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    ...customColors,
  },
  space: {
    ...defaultTokens.space,
    // Дополнительные значения для мобильного UI
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  size: {
    ...defaultTokens.size,
    // Touch targets (минимум 44px для мобильных)
    touchTarget: 44,
    buttonSmall: 36,
    buttonMedium: 44,
    buttonLarge: 52,
    iconSmall: 20,
    iconMedium: 24,
    iconLarge: 32,
  },
  radius: {
    ...defaultTokens.radius,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
})

// Тёмная тема (основная для Animatrona)
const darkTheme = {
  background: customColors.background,
  backgroundHover: customColors.backgroundSecondary,
  backgroundPress: customColors.backgroundTertiary,
  backgroundFocus: customColors.backgroundSecondary,
  backgroundStrong: customColors.gray950,
  backgroundTransparent: 'transparent',

  color: customColors.text,
  colorHover: customColors.text,
  colorPress: customColors.textSecondary,
  colorFocus: customColors.text,
  colorTransparent: 'transparent',

  // Purple accent
  accentBackground: customColors.purple600,
  accentColor: customColors.purple400,

  // Border colors
  borderColor: customColors.gray700,
  borderColorHover: customColors.gray600,
  borderColorFocus: customColors.purple500,
  borderColorPress: customColors.gray600,

  // Shadows
  shadowColor: 'rgba(0, 0, 0, 0.5)',
  shadowColorHover: 'rgba(0, 0, 0, 0.6)',
  shadowColorPress: 'rgba(0, 0, 0, 0.4)',
  shadowColorFocus: 'rgba(0, 0, 0, 0.5)',

  // Semantic colors
  success: customColors.success,
  warning: customColors.warning,
  error: customColors.error,
  info: customColors.info,

  // Gray palette
  gray50: customColors.gray50,
  gray100: customColors.gray100,
  gray200: customColors.gray200,
  gray300: customColors.gray300,
  gray400: customColors.gray400,
  gray500: customColors.gray500,
  gray600: customColors.gray600,
  gray700: customColors.gray700,
  gray800: customColors.gray800,
  gray900: customColors.gray900,
  gray950: customColors.gray950,

  // Purple palette
  purple50: customColors.purple50,
  purple100: customColors.purple100,
  purple200: customColors.purple200,
  purple300: customColors.purple300,
  purple400: customColors.purple400,
  purple500: customColors.purple500,
  purple600: customColors.purple600,
  purple700: customColors.purple700,
  purple800: customColors.purple800,
  purple900: customColors.purple900,
}

// Создаём конфигурацию Tamagui
export const config = createTamagui({
  tokens,
  themes: {
    dark: darkTheme,
    // Можно добавить light тему позже
    light: {
      ...defaultThemes.light,
      accentBackground: customColors.purple600,
      accentColor: customColors.purple500,
    },
  },
  shorthands,
  defaultTheme: 'dark',
})

// Экспорт типов для TypeScript
export type AppConfig = typeof config

// Декларация модуля для типизации
declare module '@tamagui/core' {
  type TamaguiCustomConfig = AppConfig
}

export default config
