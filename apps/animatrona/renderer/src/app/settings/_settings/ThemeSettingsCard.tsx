'use client'

/**
 * Карточка настроек темы
 */

import { Box, Card, ClientOnly, Heading, HStack, RadioGroup, Skeleton, Text, VStack } from '@chakra-ui/react'
import { LuMonitor, LuMoon, LuPalette, LuSun } from 'react-icons/lu'

import { type ThemeMode, useColorMode } from '@/components/ui/color-mode'

import type { ThemeOption } from './types'

/** Опции темы */
const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', label: 'Системная', description: 'Следовать за настройками ОС', icon: LuMonitor },
  { value: 'dark', label: 'Тёмная', description: 'Всегда тёмная тема', icon: LuMoon },
  { value: 'light', label: 'Светлая', description: 'Всегда светлая тема', icon: LuSun },
]

/**
 * Компонент настроек темы
 * Выбор между светлой, тёмной и системной темой
 */
export function ThemeSettingsCard() {
  const { theme, setTheme } = useColorMode()

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <LuPalette size={20} color="var(--chakra-colors-purple-400)" />
          <Heading size="md">Внешний вид</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          <Box>
            <Text fontWeight="medium" mb={1}>
              Тема оформления
            </Text>
            <Text fontSize="sm" color="fg.subtle" mb={3}>
              Выберите цветовую схему приложения
            </Text>
            <ClientOnly fallback={<Skeleton h="120px" borderRadius="md" />}>
              <RadioGroup.Root
                value={theme || 'system'}
                onValueChange={(details) => setTheme(details.value as ThemeMode)}
                colorPalette="purple"
              >
                <VStack align="stretch" gap={2}>
                  {THEME_OPTIONS.map((option) => {
                    const OptionIcon = option.icon
                    return (
                      <RadioGroup.Item key={option.value} value={option.value}>
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemIndicator />
                        <RadioGroup.ItemText>
                          <HStack gap={2}>
                            <OptionIcon size={16} color="var(--chakra-colors-fg-muted)" />
                            <Box>
                              <Text fontWeight="medium">{option.label}</Text>
                              <Text fontSize="xs" color="fg.subtle">
                                {option.description}
                              </Text>
                            </Box>
                          </HStack>
                        </RadioGroup.ItemText>
                      </RadioGroup.Item>
                    )
                  })}
                </VStack>
              </RadioGroup.Root>
            </ClientOnly>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
