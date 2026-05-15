import { defineTokens } from '@chakra-ui/react'

/**
 * Color tokens для приложения НейроАбоИ
 *
 * Палитры:
 * - brand: Терракот (#C25E3A) — тёплый земляной цвет, обои, глина, уют
 * - accent: Глубокий фиолетово-синий (#5B4FB8) — нейро, подсознание
 * - gray: Нейтральная серая (тёплый оттенок)
 * - success / warning / error / info — стандартные семафорные палитры
 */
export const colors = defineTokens.colors({
  /* ===========================
     Brand (Primary) — Терракот
  =========================== */
  brand: {
    50: { value: '#FBF1EC' },
    100: { value: '#F4DACE' },
    200: { value: '#E9B7A1' },
    300: { value: '#DC9374' },
    400: { value: '#CF7551' },
    500: { value: '#C25E3A' }, // primary
    600: { value: '#A54A2C' },
    700: { value: '#843923' },
    800: { value: '#622A1B' },
    900: { value: '#411C12' },
    950: { value: '#260F09' },
  },

  /* ===========================
     Accent (Secondary) — Фиолетово-синий
  =========================== */
  accent: {
    50: { value: '#EFEDFA' },
    100: { value: '#D6D2F2' },
    200: { value: '#ADA5E5' },
    300: { value: '#8479D7' },
    400: { value: '#6F62C8' },
    500: { value: '#5B4FB8' }, // secondary
    600: { value: '#473D96' },
    700: { value: '#363074' },
    800: { value: '#262253' },
    900: { value: '#181534' },
    950: { value: '#0E0C1E' },
  },

  /* ===========================
     Neutral / Gray (тёплый)
  =========================== */
  gray: {
    50: { value: '#FAF8F6' },
    100: { value: '#F1ECE8' },
    200: { value: '#E2D9D1' },
    300: { value: '#CABEB2' },
    400: { value: '#A89A8C' },
    500: { value: '#857668' },
    600: { value: '#665A4F' },
    700: { value: '#4A413A' },
    800: { value: '#2E2924' },
    900: { value: '#1C1916' },
    950: { value: '#0F0D0B' },
  },

  /* ===========================
     Success
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
     Warning
  =========================== */
  warning: {
    50: { value: '#FFFAF0' },
    100: { value: '#FEEBC8' },
    200: { value: '#FBD38D' },
    300: { value: '#F6AD55' },
    400: { value: '#ED8936' },
    500: { value: '#DD6B20' },
    600: { value: '#C05621' },
    700: { value: '#9C4221' },
    800: { value: '#7B341E' },
    900: { value: '#652B19' },
    950: { value: '#3D1A0F' },
  },

  /* ===========================
     Error
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
     Info
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
