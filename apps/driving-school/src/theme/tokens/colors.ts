import { defineTokens } from '@chakra-ui/react'

/**
 * Color tokens для driving-school приложения
 *
 * Палитры:
 * - brand: Основной синий цвет (#4F6EF7)
 * - accent: Вторичный бирюзовый (#2CB1BC)
 * - gray: Нейтральные цвета
 * - success: Зелёный для успешных состояний
 * - warning: Жёлтый/оранжевый для предупреждений
 * - error: Красный для ошибок
 * - info: Синий для информационных сообщений
 */
export const colors = defineTokens.colors({
  /* ===========================
     Brand (Primary) - Синий
  =========================== */
  brand: {
    50: { value: '#F4F6FF' },
    100: { value: '#E6EBFF' },
    200: { value: '#C9D2FF' },
    300: { value: '#A5B4FF' },
    400: { value: '#7C93FF' },
    500: { value: '#4F6EF7' }, // primary
    600: { value: '#3E5CE0' },
    700: { value: '#3249B8' },
    800: { value: '#283A8A' },
    900: { value: '#1F2D5C' },
    950: { value: '#141D3D' },
  },

  /* ===========================
     Accent (Secondary) - Бирюзовый
  =========================== */
  accent: {
    50: { value: '#E6F7F8' },
    100: { value: '#CFF0F2' },
    200: { value: '#9EE1E5' },
    300: { value: '#6ED2D9' },
    400: { value: '#44C1CA' },
    500: { value: '#2CB1BC' }, // secondary
    600: { value: '#1E8E97' },
    700: { value: '#176F76' },
    800: { value: '#125659' },
    900: { value: '#0E4244' },
    950: { value: '#092B2D' },
  },

  /* ===========================
     Neutral / Gray
  =========================== */
  gray: {
    50: { value: '#F7F8FA' },
    100: { value: '#EEF0F3' },
    200: { value: '#E1E4E8' },
    300: { value: '#D0D5DC' },
    400: { value: '#AEB4BD' },
    500: { value: '#8C9199' },
    600: { value: '#6B7078' },
    700: { value: '#4B5057' },
    800: { value: '#2F3338' },
    900: { value: '#1C1F24' },
    950: { value: '#111316' },
  },

  /* ===========================
     Success - Зелёный
  =========================== */
  success: {
    50: { value: '#ECFDF5' },
    100: { value: '#D1FAE5' },
    200: { value: '#A7F3D0' },
    300: { value: '#6EE7B7' },
    400: { value: '#34D399' },
    500: { value: '#10B981' },
    600: { value: '#059669' },
    700: { value: '#047857' },
    800: { value: '#065F46' },
    900: { value: '#064E3B' },
    950: { value: '#022C22' },
  },

  /* ===========================
     Warning - Янтарный/Жёлтый
  =========================== */
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

  /* ===========================
     Error - Красный
  =========================== */
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

  /* ===========================
     Info - Синий (отличается от brand)
  =========================== */
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
