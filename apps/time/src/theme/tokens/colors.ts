import { defineTokens } from '@chakra-ui/react'

/**
 * Color tokens для time приложения
 *
 * Палитры:
 * - brand: Изумрудно-зелёный (#10B981) — стиль Kami/Matrix
 * - accent: Вторичный фиолетовый (#805AD5)
 * - gray: Нейтральные цвета
 * - success, warning, error, info: Семантические цвета
 */
export const colors = defineTokens.colors({
  /* ===========================
     Brand (Primary) - Изумрудно-зелёный (Emerald)
  =========================== */
  brand: {
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
     Accent (Secondary) - Фиолетовый
  =========================== */
  accent: {
    50: { value: '#FAF5FF' },
    100: { value: '#E9D8FD' },
    200: { value: '#D6BCFA' },
    300: { value: '#B794F4' },
    400: { value: '#9F7AEA' },
    500: { value: '#805AD5' },
    600: { value: '#6B46C1' },
    700: { value: '#553C9A' },
    800: { value: '#44337A' },
    900: { value: '#322659' },
    950: { value: '#1A1145' },
  },

  /* ===========================
     Neutral / Gray
  =========================== */
  gray: {
    50: { value: '#F7FAFC' },
    100: { value: '#EDF2F7' },
    200: { value: '#E2E8F0' },
    300: { value: '#CBD5E0' },
    400: { value: '#A0AEC0' },
    500: { value: '#718096' },
    600: { value: '#4A5568' },
    700: { value: '#2D3748' },
    800: { value: '#1A202C' },
    900: { value: '#171923' },
    950: { value: '#0D1117' },
  },

  /* ===========================
     Success - Зелёный
  =========================== */
  success: {
    50: { value: '#F0FFF4' },
    100: { value: '#C6F6D5' },
    200: { value: '#9AE6B4' },
    300: { value: '#68D391' },
    400: { value: '#48BB78' },
    500: { value: '#38A169' },
    600: { value: '#2F855A' },
    700: { value: '#276749' },
    800: { value: '#22543D' },
    900: { value: '#1C4532' },
    950: { value: '#0F2A1D' },
  },

  /* ===========================
     Warning - Жёлтый
  =========================== */
  warning: {
    50: { value: '#FFFFF0' },
    100: { value: '#FEFCBF' },
    200: { value: '#FAF089' },
    300: { value: '#F6E05E' },
    400: { value: '#ECC94B' },
    500: { value: '#D69E2E' },
    600: { value: '#B7791F' },
    700: { value: '#975A16' },
    800: { value: '#744210' },
    900: { value: '#5F370E' },
    950: { value: '#3D2409' },
  },

  /* ===========================
     Error - Красный
  =========================== */
  error: {
    50: { value: '#FFF5F5' },
    100: { value: '#FED7D7' },
    200: { value: '#FEB2B2' },
    300: { value: '#FC8181' },
    400: { value: '#F56565' },
    500: { value: '#E53E3E' },
    600: { value: '#C53030' },
    700: { value: '#9B2C2C' },
    800: { value: '#822727' },
    900: { value: '#63171B' },
    950: { value: '#3B0D0D' },
  },

  /* ===========================
     Info - Голубой
  =========================== */
  info: {
    50: { value: '#E6FFFA' },
    100: { value: '#B2F5EA' },
    200: { value: '#81E6D9' },
    300: { value: '#4FD1C5' },
    400: { value: '#38B2AC' },
    500: { value: '#319795' },
    600: { value: '#2C7A7B' },
    700: { value: '#285E61' },
    800: { value: '#234E52' },
    900: { value: '#1D4044' },
    950: { value: '#0F2628' },
  },
})
