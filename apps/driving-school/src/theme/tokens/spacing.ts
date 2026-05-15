import { defineTokens } from '@chakra-ui/react'

/**
 * Spacing и Radii tokens для driving-school приложения
 *
 * Используем стандартную шкалу Chakra UI с небольшими дополнениями
 */
export const radii = defineTokens.radii({
  none: { value: '0' },
  '2xs': { value: '0.0625rem' }, // 1px
  xs: { value: '0.125rem' }, // 2px
  sm: { value: '0.25rem' }, // 4px
  md: { value: '0.375rem' }, // 6px
  lg: { value: '0.5rem' }, // 8px
  xl: { value: '0.75rem' }, // 12px
  '2xl': { value: '1rem' }, // 16px
  '3xl': { value: '1.5rem' }, // 24px
  full: { value: '9999px' },
})

export const shadows = defineTokens.shadows({
  xs: { value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  sm: { value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
  md: { value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
  lg: { value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
  xl: { value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
  '2xl': { value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
  inner: { value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' },
  none: { value: 'none' },
})

export const durations = defineTokens.durations({
  fastest: { value: '50ms' },
  faster: { value: '100ms' },
  fast: { value: '150ms' },
  normal: { value: '200ms' },
  slow: { value: '300ms' },
  slower: { value: '400ms' },
  slowest: { value: '500ms' },
})

export const easings = defineTokens.easings({
  default: { value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  linear: { value: 'linear' },
  in: { value: 'cubic-bezier(0.4, 0, 1, 1)' },
  out: { value: 'cubic-bezier(0, 0, 0.2, 1)' },
  'in-out': { value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
})
