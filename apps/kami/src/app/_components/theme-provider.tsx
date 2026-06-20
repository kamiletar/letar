'use client'

import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react'
import { RootChakraProvider } from '@letar/chakra-provider'
import type { NextFont } from 'next/dist/compiled/@next/font'
import type { PropsWithChildren } from 'react'
import { useEffect, useMemo } from 'react'

type Props = PropsWithChildren & {
  fonts: {
    heading: NextFont
    body: NextFont
    mono: NextFont
  }
}

// Рецепт для заголовков
const heading = defineRecipe({
  base: {
    fontWeight: 'bold',
  },
})

// Рецепт для ссылок
const link = defineRecipe({
  variants: {
    variant: {
      plain: {
        color: 'fg',
      },
    },
  },
})

// Рецепт для кнопок — spring-анимация нажатия
const button = defineRecipe({
  base: {
    touchAction: 'manipulation',
    // spring при отпускании (небольшой overshoot)
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    _active: {
      transform: 'scale(0.93)',
      // быстрое нажатие перекрывает outer transition
      transition: 'transform 0.06s ease-out',
    },
    _disabled: {
      _active: { transform: 'none' },
    },
  },
  variants: {
    variant: {
      ghost: {
        color: 'fg',
        _hover: { bg: 'bg.muted' },
        _active: { bg: 'bg.muted' },
      },
      outline: {
        bg: { base: 'white/15', _dark: 'transparent' },
        backdropFilter: { base: 'blur(10px)', _dark: 'blur(8px)' },
        _active: { bg: 'colorPalette.muted' },
      },
      solid: {
        _active: { bg: 'colorPalette.solid/80' },
      },
    },
  },
})

export const ThemeProvider = ({ children, fonts }: Props) => {
  const system = useMemo(() => {
    const config = defineConfig({
      globalCss: {
        // Любой элемент с data-pressable получает spring-анимацию
        '[data-pressable]': {
          touchAction: 'manipulation',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          _active: {
            transform: 'scale(0.93)',
            transition: 'transform 0.06s ease-out',
          },
        },
      },
      theme: {
        keyframes: {
          'ripple-expand': {
            from: { transform: 'scale(0)', opacity: '1' },
            to: { transform: 'scale(1)', opacity: '0' },
          },
          'matrix-zoom': {
            '0%': { transform: 'scale(3)' },
            '10%': { transform: 'scale(6)' },
            '20%': { transform: 'scale(12)' },
            '50%': { transform: 'scale(108)' },
            '70%': { transform: 'scale(100)' },
            '100%': { transform: 'scale(3)' },
          },
        },
        tokens: {
          colors: {
            // Кастомная палитра fg - изумрудно-зелёный для Matrix-стиля
            fg: {
              '50': { value: '#ECFDF5' },
              '100': { value: '#D1FAE5' },
              '200': { value: '#A7F3D0' },
              '300': { value: '#6EE7B7' },
              '400': { value: '#34D399' },
              '500': { value: '#10B981' }, // Основной цвет (emerald)
              '600': { value: '#059669' },
              '700': { value: '#047857' },
              '800': { value: '#065F46' },
              '900': { value: '#064E3B' },
              '950': { value: '#022C22' },
            },
            // Matrix-зелёный для эффектов
            matrix: {
              '500': { value: '#00FF41' }, // Классический Matrix green
              '600': { value: '#00CC33' },
              '700': { value: '#009926' },
            },
          },
          fonts: {
            heading: {
              value: fonts.heading.style.fontFamily,
            },
            body: {
              value: fonts.body.style.fontFamily,
            },
            mono: {
              value: fonts.mono.style.fontFamily,
            },
          },
        },
        semanticTokens: {
          colors: {
            fg: {
              DEFAULT: {
                value: {
                  _light: '{colors.fg.500}',
                  _dark: '{colors.fg.400}',
                },
              },
              solid: {
                value: {
                  _light: '{colors.fg.500}',
                  _dark: '{colors.fg.500}',
                },
              },
              contrast: {
                value: {
                  _light: 'white',
                  _dark: 'white',
                },
              },
              fg: {
                value: {
                  _light: '{colors.fg.600}',
                  _dark: '{colors.fg.400}',
                },
              },
              muted: {
                value: {
                  _light: '{colors.fg.700}',
                  _dark: '{colors.fg.300}',
                },
              },
              subtle: {
                value: {
                  _light: '{colors.fg.600}',
                  _dark: '{colors.fg.300}',
                },
              },
              emphasized: {
                value: {
                  _light: '{colors.fg.700}',
                  _dark: '{colors.fg.300}',
                },
              },
            },
            // Фон страницы
            bg: {
              DEFAULT: {
                value: {
                  _light: 'white',
                  _dark: '#0D0D0D', // Почти чёрный для Matrix-вайба
                },
              },
              subtle: {
                value: {
                  _light: '{colors.gray.50}',
                  _dark: '{colors.gray.900}',
                },
              },
              panel: {
                value: {
                  _light: 'white',
                  _dark: '{colors.gray.800}',
                },
              },
              code: {
                value: {
                  _light: '{colors.gray.900}',
                  _dark: '{colors.gray.900}',
                },
              },
            },
            border: {
              DEFAULT: {
                value: {
                  _light: '{colors.gray.200}',
                  _dark: '{colors.gray.700}',
                },
              },
              subtle: {
                value: {
                  _light: '{colors.gray.200}',
                  _dark: '{colors.gray.700}',
                },
              },
            },
          },
        },
        recipes: {
          heading,
          link,
          button,
        },
      },
    })
    return createSystem(defaultConfig, config)
  }, [fonts.heading.style.fontFamily, fonts.body.style.fontFamily, fonts.mono.style.fontFamily])

  // iOS-фикс: без touchstart-листенера :active не срабатывает
  useEffect(() => {
    document.addEventListener('touchstart', () => {}, { passive: true })
  }, [])

  return <RootChakraProvider value={system}>{children}</RootChakraProvider>
}
