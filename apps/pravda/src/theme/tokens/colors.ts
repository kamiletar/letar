import { defineTokens } from '@chakra-ui/react'

/**
 * Color tokens для pravda приложения
 *
 * Палитры:
 * - brand: Основной красный цвет (#E53E3E) - ассоциация с "правдой"
 * - accent: Вторичный синий (#3182CE)
 * - gray: Нейтральные цвета
 * - success: Зелёный для успешных состояний
 * - warning: Жёлтый/оранжевый для предупреждений
 * - error: Красный для ошибок
 * - info: Синий для информационных сообщений
 */
export const colors = defineTokens.colors({
  /* ===========================
     Brand (Primary) - Красный
  =========================== */
  brand: {
    50: { value: '#FFF5F5' },
    100: { value: '#FED7D7' },
    200: { value: '#FEB2B2' },
    300: { value: '#FC8181' },
    400: { value: '#F56565' },
    500: { value: '#E53E3E' }, // primary
    600: { value: '#C53030' },
    700: { value: '#9B2C2C' },
    800: { value: '#822727' },
    900: { value: '#63171B' },
    950: { value: '#3B0D0D' },
  },

  /* ===========================
     Accent (Secondary) - Синий
  =========================== */
  accent: {
    50: { value: '#EBF8FF' },
    100: { value: '#BEE3F8' },
    200: { value: '#90CDF4' },
    300: { value: '#63B3ED' },
    400: { value: '#4299E1' },
    500: { value: '#3182CE' }, // secondary
    600: { value: '#2B6CB0' },
    700: { value: '#2C5282' },
    800: { value: '#2A4365' },
    900: { value: '#1A365D' },
    950: { value: '#0F2137' },
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
     Info - Синий
  =========================== */
  info: {
    50: { value: '#EBF8FF' },
    100: { value: '#BEE3F8' },
    200: { value: '#90CDF4' },
    300: { value: '#63B3ED' },
    400: { value: '#4299E1' },
    500: { value: '#3182CE' },
    600: { value: '#2B6CB0' },
    700: { value: '#2C5282' },
    800: { value: '#2A4365' },
    900: { value: '#1A365D' },
    950: { value: '#0F2137' },
  },
})
