'use client'
import { createSystem, defaultConfig, defineConfig, defineRecipe, defineSlotRecipe } from '@chakra-ui/react'
import { RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import type { NextFont } from 'next/dist/compiled/@next/font'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'

type Props = PropsWithChildren & {
  fonts: {
    headings: NextFont
    text: NextFont
  }
}

const heading = defineRecipe({
  base: {
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
})

const button = defineRecipe({
  base: {
    _active: {
      transform: 'scale(.95)',
    },
  },
  variants: {
    size: {
      sm: {
        _active: {
          transform: 'scale(.8)',
        },
      },
    },
    variant: {
      solid: {
        _active: {
          '&:hover': {
            bg: 'colorPalette.solid/50',
          },
        },
      },
      outline: {
        _active: {
          '&:hover': {
            bg: 'colorPalette.subtle/50',
          },
        },
      },
      ghost: {
        _active: {
          '&:hover': {
            bg: 'colorPalette.subtle/50',
          },
          color: 'fg',
          _hover: {
            bg: 'bg.muted',
          },
        },
      },
    },
  },
})

const menu = defineSlotRecipe({
  slots: [],
  variants: {
    variant: {
      subtle: {
        item: {
          _active: {
            bg: 'fg.muted',
            transform: 'scale(0.95)',
          },
        },
      },
    },
  },
})

const card = defineSlotRecipe({
  slots: [],
  variants: {
    variant: {
      outline: {
        root: {
          _active: {
            'a&:hover': {
              bg: 'fg.muted',
              transform: 'scale(0.95) !important',
            },
          },
        },
      },
    },
  },
})

const link = defineRecipe({
  base: {
    transition: 'all 0.1s',
    _active: {
      transform: 'scale(.9)',
    },
  },
  variants: {
    variant: {
      plain: {
        color: 'fg',
        _active: {
          '&:hover': {
            bg: 'currentColor/50',
          },
        },
      },
      underline: {
        _active: {
          '&:hover': {
            bg: 'currentColor/50',
          },
        },
      },
    },
  },
})

const toast = defineSlotRecipe({
  base: {
    root: {
      '&[data-type=error]': {
        bg: 'pink.500',
        color: 'pink.50',
      },
      '&[data-type=success]': {
        bg: 'fg.500',
        color: 'fg.50',
      },
    },
  },
  slots: ['root'],
})

export const ThemeProvider = ({ children, fonts }: Props) => {
  const system = useMemo(() => {
    const config = defineConfig({
      theme: {
        slotRecipes: {
          toast,
          card,
          menu,
        },
        tokens: {
          colors: {
            // Кастомная палитра fg для использования с colorPalette="fg"
            fg: {
              // Базовые оттенки для компонентов
              '50': { value: '#F9F5EF' }, // Очень светлый
              '100': { value: '#F0E8DA' }, // Светлый
              '200': { value: '#E5D5B8' }, //
              '300': { value: '#D9C296' }, //
              '400': { value: '#D1B07F' }, // Светлее основного
              '500': { value: '#CA9E67' }, // Основной цвет
              '600': { value: '#B88B53' }, // Темнее основного
              '700': { value: '#9A7344' }, //
              '800': { value: '#7B5C36' }, // Темный
              '900': { value: '#5D4428' }, // Очень темный
              '950': { value: '#3E2D1B' }, // Почти черный
            },
          },
          fonts: {
            heading: {
              value: fonts.headings.style.fontFamily,
            },
            text: {
              value: fonts.text.style.fontFamily,
            },
            body: {
              value: fonts.text.style.fontFamily,
            },
          },
        },
        semanticTokens: {
          colors: {
            fg: {
              DEFAULT: {
                value: {
                  _light: '{colors.fg.500}',
                  _dark: '{colors.fg.500}',
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
                  _light: '{colors.fg.500}',
                  _dark: '{colors.fg.500}',
                },
              },
              muted: {
                value: {
                  _light: '{colors.fg.300}',
                  _dark: '{colors.fg.100}',
                },
              },
              subtle: {
                value: {
                  _light: '{colors.fg.300}',
                  _dark: '{colors.fg.100}',
                },
              },
              emphasized: {
                value: {
                  _light: '{colors.fg.700}',
                  _dark: '{colors.fg.700}',
                },
              },
            },
            border: {
              DEFAULT: {
                value: {
                  _light: '{colors.fg.200}',
                  _dark: '{colors.fg.400}',
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
  }, [fonts.headings.style.fontFamily, fonts.text.style.fontFamily])
  return (
    <RootChakraProvider value={system}>
      <FormI18nProvider locale="ru">{children}</FormI18nProvider>
    </RootChakraProvider>
  )
}
