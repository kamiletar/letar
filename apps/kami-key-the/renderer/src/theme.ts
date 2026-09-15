/**
 * Тема KamiKeyThe для Chakra UI v3 — тёмная и светлая, переключение по системной теме Windows
 * (класс `dark`/`light` на `<html>`, см. lib/color-mode.ts).
 *
 * Акцент — неоновый зелёный как на лендинге (apps/kami-key-the-landing/src/lib/theme.ts),
 * второй слой (AltGr+Shift) — циан. Контракт токенов, которые читают стоковые рецепты Chakra
 * (bg.panel, fg.error, border.control, l1..l3, colorPalette.*) — см.
 * .claude/docs/chakra-semantic-token-contract.md. Пары текст/фон ниже подобраны по WCAG AA
 * (4.5:1 текст, 3:1 границы контролов) — конкретные числа см. в PLAN.md.
 */

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#eafff0' },
          100: { value: '#c6ffd6' },
          200: { value: '#8bffaa' },
          300: { value: '#4dff7a' },
          400: { value: '#39ff14' },
          500: { value: '#00e600' },
          600: { value: '#00b300' },
          700: { value: '#008a00' },
          800: { value: '#006600' },
          900: { value: '#004400' },
        },
        accent: {
          300: { value: '#67e8f9' },
          400: { value: '#22d3ee' },
          500: { value: '#06b6d4' },
          600: { value: '#0891b2' },
          700: { value: '#0e7490' },
          800: { value: '#155e75' },
        },
        // Нейтральная шкала с зеленоватым оттенком — переопределяет Chakra `gray`, чтобы её
        // подхватили стоковые рецепты (Button/Card/Input читают gray.* напрямую).
        gray: {
          50: { value: '#f4f7f4' },
          100: { value: '#e9eeea' },
          200: { value: '#d7dfd8' },
          300: { value: '#b7c2b8' },
          400: { value: '#93a095' },
          500: { value: '#6f7c71' },
          600: { value: '#535f55' },
          700: { value: '#3c463e' },
          800: { value: '#2a322b' },
          900: { value: '#1b211c' },
          950: { value: '#121613' },
        },
      },
      radii: {
        l1: { value: '4px' },
        l2: { value: '6px' },
        l3: { value: '10px' },
      },
      fonts: {
        body: { value: `'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif` },
        heading: { value: `'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif` },
        mono: { value: `'Cascadia Mono', 'Cascadia Code', Consolas, monospace` },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: { _light: '{colors.gray.50}', _dark: '#0b0e0c' } },
          subtle: { value: { _light: '{colors.gray.100}', _dark: '{colors.gray.950}' } },
          panel: { value: { _light: 'white', _dark: '{colors.gray.950}' } },
          muted: { value: { _light: '{colors.gray.100}', _dark: '{colors.gray.900}' } },
          emphasized: { value: { _light: '{colors.gray.200}', _dark: '{colors.gray.800}' } },
          error: { value: { _light: '#fdecec', _dark: 'rgba(255,90,90,.12)' } },
          warning: { value: { _light: '#fff4dc', _dark: 'rgba(255,200,87,.12)' } },
        },
        fg: {
          DEFAULT: { value: { _light: '#101511', _dark: '#e9efe9' } },
          muted: { value: { _light: '{colors.gray.700}', _dark: '{colors.gray.300}' } },
          // 400/600 — обе стороны ≥6.7:1 на своём bg; не осветлять в тёмной теме до 500
          // (даёт 4.0:1, ближе к порогу).
          subtle: { value: { _light: '{colors.gray.600}', _dark: '{colors.gray.400}' } },
          // RU-подпись клавиши (key-button.tsx) — тот же уровень приглушённости, что и subtle,
          // но с тёплым красноватым оттенком, чтобы визуально отличаться от EN-подписи
          ru: { value: { _light: '#7d5a5c', _dark: '#b28c8e' } },
          error: { value: { _light: '#c62828', _dark: '#ff7a7a' } },
          warning: { value: { _light: '#8a5300', _dark: '#ffc857' } },
          success: { value: { _light: '#0b7a0b', _dark: '{colors.brand.400}' } },
          info: { value: { _light: '{colors.accent.700}', _dark: '{colors.accent.400}' } },
        },
        border: {
          DEFAULT: { value: { _light: '{colors.gray.200}', _dark: '{colors.gray.800}' } },
          subtle: { value: { _light: '{colors.gray.100}', _dark: '#1d231e' } },
          emphasized: { value: { _light: '{colors.gray.300}', _dark: '{colors.gray.700}' } },
          // Граница контрола — отдельная роль от декоративной DEFAULT, порог 3:1 (WCAG 1.4.11)
          control: { value: { _light: '{colors.gray.500}', _dark: '{colors.gray.500}' } },
          error: { value: { _light: '#c62828', _dark: '#ff7a7a' } },
          warning: { value: { _light: '#8a5300', _dark: '#ffc857' } },
        },
        // colorPalette="brand" — основной акцент (слой AltGr)
        brand: {
          solid: { value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' } },
          contrast: { value: '#031403' },
          fg: { value: { _light: '#0b7a0b', _dark: '{colors.brand.400}' } },
          muted: { value: { _light: '{colors.brand.100}', _dark: 'rgba(57,255,20,.18)' } },
          subtle: { value: { _light: '{colors.brand.50}', _dark: 'rgba(57,255,20,.09)' } },
          emphasized: { value: { _light: '{colors.brand.200}', _dark: 'rgba(57,255,20,.26)' } },
          focusRing: { value: { _light: '#0b7a0b', _dark: '{colors.brand.400}' } },
          border: { value: { _light: '#1f9a1f', _dark: 'rgba(57,255,20,.5)' } },
        },
        // colorPalette="accent" — второй слой (AltGr+Shift)
        accent: {
          solid: { value: { _light: '{colors.accent.500}', _dark: '{colors.accent.400}' } },
          contrast: { value: '#021417' },
          fg: { value: { _light: '{colors.accent.700}', _dark: '{colors.accent.400}' } },
          muted: { value: { _light: '{colors.accent.100}', _dark: 'rgba(34,211,238,.2)' } },
          subtle: { value: { _light: '#ecfeff', _dark: 'rgba(34,211,238,.1)' } },
          emphasized: { value: { _light: '{colors.accent.200}', _dark: 'rgba(34,211,238,.3)' } },
          focusRing: { value: { _light: '{colors.accent.600}', _dark: '{colors.accent.400}' } },
          border: { value: { _light: '{colors.accent.600}', _dark: 'rgba(34,211,238,.5)' } },
        },
      },
    },
  },
  globalCss: {
    'html, body, #root': { height: '100%' },
    html: {
      colorPalette: 'brand',
      colorScheme: 'light',
      // Тонкий скроллбар — оболочка (не body) отвечает за прокрутку страниц редактора/настроек
      scrollbarWidth: 'thin',
    },
    'html.dark': { colorScheme: 'dark' },
    body: { bg: 'bg', color: 'fg', overflow: 'hidden' },
    '::selection': { bg: 'brand.muted' },
  },
})

export const system = createSystem(defaultConfig, customConfig)
