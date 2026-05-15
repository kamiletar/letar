import { defineTokens } from '@chakra-ui/react'

/**
 * Color tokens для Grand Slam Cup
 *
 * Палитра основана на grandslamcup.ru:
 * - brand: Чистый красный (#FF0000) — основной цвет бренда
 * - accent: Синий (#0051FF) — ссылки и интерактивные элементы
 * - gray: Нейтральные (чёрный/белый минимализм)
 * - success, warning, error, info: Утилитарные палитры
 */
export const colors = defineTokens.colors({
  /* ===========================
     Brand (Primary) — Чистый красный (#FF0000)
     Палитра с grandslamcup.ru
  =========================== */
  brand: {
    50: { value: '#FFF0F0' },
    100: { value: '#FFD6D6' },
    200: { value: '#FFB3B3' },
    300: { value: '#FF8080' },
    400: { value: '#FF4D4D' },
    500: { value: '#FF0000' }, // primary — чистый красный
    600: { value: '#DB0000' },
    700: { value: '#B30000' },
    800: { value: '#8A0000' },
    900: { value: '#660000' },
    950: { value: '#3D0000' },
  },

  /* ===========================
     Accent (Secondary) — Синий (#0051FF)
     Для ссылок и акцентных элементов
  =========================== */
  accent: {
    50: { value: '#EEF3FF' },
    100: { value: '#D4E0FF' },
    200: { value: '#A8C1FF' },
    300: { value: '#7DA2FF' },
    400: { value: '#3D79FF' },
    500: { value: '#0051FF' }, // secondary — синий
    600: { value: '#0044DB' },
    700: { value: '#0036B3' },
    800: { value: '#002A8A' },
    900: { value: '#001F66' },
    950: { value: '#00133D' },
  },

  /* ===========================
     Neutral / Gray
     Минималистичная чёрно-белая палитра
  =========================== */
  gray: {
    50: { value: '#FAFAFA' },
    100: { value: '#F5F5F5' },
    200: { value: '#EEEEEE' }, // строки таблиц на сайте
    300: { value: '#D9D9D9' }, // границы на сайте
    400: { value: '#A0A0A0' },
    500: { value: '#717171' },
    600: { value: '#4D4C4C' }, // вторичный текст на сайте
    700: { value: '#333333' },
    800: { value: '#1A1A1A' },
    900: { value: '#111111' },
    950: { value: '#0A0A0A' },
  },

  /* ===========================
     Success — Зелёный
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
     Warning — Жёлтый
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
     Error — Тёплый красный (#E53E3E)
     Отделён от brand (#FF0000) чтобы ошибки не путались с брендингом
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
     Info — Синий (совпадает с accent)
  =========================== */
  info: {
    50: { value: '#EEF3FF' },
    100: { value: '#D4E0FF' },
    200: { value: '#A8C1FF' },
    300: { value: '#7DA2FF' },
    400: { value: '#3D79FF' },
    500: { value: '#0051FF' },
    600: { value: '#0044DB' },
    700: { value: '#0036B3' },
    800: { value: '#002A8A' },
    900: { value: '#001F66' },
    950: { value: '#00133D' },
  },
})
