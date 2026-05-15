import { defineTokens } from '@chakra-ui/react'

/**
 * Цветовые токены для archetest
 *
 * Палитры:
 * - brand: Фиолетовый (#7C3AED) — интроспекция, психология
 * - accent: Бирюзовый (#0D9488) — гармония, рост
 * - gray: Нейтральные цвета
 * - success/warning/error/info: Функциональные цвета
 */
export const colors = defineTokens.colors({
  brand: {
    50: { value: '#F5F3FF' },
    100: { value: '#EDE9FE' },
    200: { value: '#DDD6FE' },
    300: { value: '#C4B5FD' },
    400: { value: '#A78BFA' },
    500: { value: '#7C3AED' },
    600: { value: '#6D28D9' },
    700: { value: '#5B21B6' },
    800: { value: '#4C1D95' },
    900: { value: '#3B0764' },
    950: { value: '#1E0038' },
  },

  accent: {
    50: { value: '#F0FDFA' },
    100: { value: '#CCFBF1' },
    200: { value: '#99F6E4' },
    300: { value: '#5EEAD4' },
    400: { value: '#2DD4BF' },
    500: { value: '#14B8A6' },
    600: { value: '#0D9488' },
    700: { value: '#0F766E' },
    800: { value: '#115E59' },
    900: { value: '#134E4A' },
    950: { value: '#042F2E' },
  },

  gray: {
    50: { value: '#FAFAFA' },
    100: { value: '#F4F4F5' },
    200: { value: '#E4E4E7' },
    300: { value: '#D4D4D8' },
    400: { value: '#A1A1AA' },
    500: { value: '#71717A' },
    600: { value: '#52525B' },
    700: { value: '#3F3F46' },
    800: { value: '#27272A' },
    900: { value: '#18181B' },
    950: { value: '#09090B' },
  },

  success: {
    50: { value: '#F0FDF4' },
    100: { value: '#DCFCE7' },
    200: { value: '#BBF7D0' },
    300: { value: '#86EFAC' },
    400: { value: '#4ADE80' },
    500: { value: '#22C55E' },
    600: { value: '#16A34A' },
    700: { value: '#15803D' },
    800: { value: '#166534' },
    900: { value: '#14532D' },
    950: { value: '#052E16' },
  },

  warning: {
    50: { value: '#FFFBEB' },
    100: { value: '#FEF3C7' },
    200: { value: '#FDE68A' },
    300: { value: '#FCD34D' },
    400: { value: '#FBBF24' },
    500: { value: '#F59E0B' },
    600: { value: '#D97706' },
    700: { value: '#B45309' },
    800: { value: '#92400E' },
    900: { value: '#78350F' },
    950: { value: '#451A03' },
  },

  error: {
    50: { value: '#FEF2F2' },
    100: { value: '#FEE2E2' },
    200: { value: '#FECACA' },
    300: { value: '#FCA5A5' },
    400: { value: '#F87171' },
    500: { value: '#EF4444' },
    600: { value: '#DC2626' },
    700: { value: '#B91C1C' },
    800: { value: '#991B1B' },
    900: { value: '#7F1D1D' },
    950: { value: '#450A0A' },
  },

  info: {
    50: { value: '#EFF6FF' },
    100: { value: '#DBEAFE' },
    200: { value: '#BFDBFE' },
    300: { value: '#93C5FD' },
    400: { value: '#60A5FA' },
    500: { value: '#3B82F6' },
    600: { value: '#2563EB' },
    700: { value: '#1D4ED8' },
    800: { value: '#1E40AF' },
    900: { value: '#1E3A8A' },
    950: { value: '#172554' },
  },
})
