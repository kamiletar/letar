'use client'

import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react'
import { RootChakraProvider } from '@letar/chakra-provider'
import type { NextFont } from 'next/dist/compiled/@next/font'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'

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

// Рецепт для кнопок
const button = defineRecipe({
  base: {
    _active: {
      transform: 'scale(0.95)',
      transition: 'all 0.15s ease-out',
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
      theme: {
        keyframes: {
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
  console.log('!!!!!!', system)

  return <RootChakraProvider value={system}>{children}</RootChakraProvider>
}
