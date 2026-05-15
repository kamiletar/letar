import { defineTokens } from '@chakra-ui/react'

/**
 * Typography tokens для driving-school приложения
 *
 * Шрифт: Nunito - мягкий, дружелюбный, идеален для образовательного приложения
 */
export const fonts = defineTokens.fonts({
  heading: { value: 'var(--font-nunito), Nunito, system-ui, sans-serif' },
  body: { value: 'var(--font-nunito), Nunito, system-ui, sans-serif' },
  mono: { value: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace' },
})

export const fontSizes = defineTokens.fontSizes({
  '2xs': { value: '0.625rem' }, // 10px
  xs: { value: '0.75rem' }, // 12px
  sm: { value: '0.875rem' }, // 14px
  md: { value: '1rem' }, // 16px
  lg: { value: '1.125rem' }, // 18px
  xl: { value: '1.25rem' }, // 20px
  '2xl': { value: '1.5rem' }, // 24px
  '3xl': { value: '1.875rem' }, // 30px
  '4xl': { value: '2.25rem' }, // 36px
  '5xl': { value: '3rem' }, // 48px
  '6xl': { value: '3.75rem' }, // 60px
  '7xl': { value: '4.5rem' }, // 72px
})

export const fontWeights = defineTokens.fontWeights({
  hairline: { value: '100' },
  thin: { value: '200' },
  light: { value: '300' },
  normal: { value: '400' },
  medium: { value: '500' },
  semibold: { value: '600' },
  bold: { value: '700' },
  extrabold: { value: '800' },
  black: { value: '900' },
})

export const lineHeights = defineTokens.lineHeights({
  none: { value: '1' },
  tight: { value: '1.25' },
  snug: { value: '1.375' },
  normal: { value: '1.5' },
  relaxed: { value: '1.625' },
  loose: { value: '2' },
})

export const letterSpacings = defineTokens.letterSpacings({
  tighter: { value: '-0.05em' },
  tight: { value: '-0.025em' },
  normal: { value: '0' },
  wide: { value: '0.025em' },
  wider: { value: '0.05em' },
  widest: { value: '0.1em' },
})
