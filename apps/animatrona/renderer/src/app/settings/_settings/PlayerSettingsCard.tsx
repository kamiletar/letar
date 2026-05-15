'use client'

/**
 * Карточка настроек плеера
 */

import { Box, Card, Heading, HStack, Icon, RadioGroup, Switch, Text, VStack } from '@chakra-ui/react'
import { LuZap } from 'react-icons/lu'

import type { Settings } from '@/generated/prisma'

interface PlayerSettingsCardProps {
  settings: Settings | null | undefined
  onSave: (field: string, value: unknown) => void
}

/**
 * Настройки плеера (автопропуск, предпочтения дорожек)
 */
export function PlayerSettingsCard({ settings, onSave }: PlayerSettingsCardProps) {
  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <Icon as={LuZap} color="purple.400" boxSize={5} />
          <Heading size="md">Плеер</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Автопропуск опенинга */}
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium">Автопропуск опенинга</Text>
              <Text fontSize="sm" color="fg.subtle">
                Автоматически пропускать начальную заставку
              </Text>
            </Box>
            <Switch.Root
              checked={settings?.skipOpening ?? false}
              onCheckedChange={(details) => onSave('skipOpening', details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

          {/* Автопропуск эндинга */}
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium">Автопропуск эндинга</Text>
              <Text fontSize="sm" color="fg.subtle">
                Автоматически пропускать финальную заставку
              </Text>
            </Box>
            <Switch.Root
              checked={settings?.skipEnding ?? false}
              onCheckedChange={(details) => onSave('skipEnding', details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

          {/* Автовоспроизведение */}
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium">Автовоспроизведение</Text>
              <Text fontSize="sm" color="fg.subtle">
                Автоматически переключать на следующий эпизод
              </Text>
            </Box>
            <Switch.Root
              checked={settings?.autoplay ?? true}
              onCheckedChange={(details) => onSave('autoplay', details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

          {/* Предпочтение дорожек */}
          <Box>
            <Text fontWeight="medium" mb={1}>
              Предпочтение дорожек
            </Text>
            <Text fontSize="sm" color="fg.subtle" mb={3}>
              Какие дорожки выбирать автоматически при первом просмотре
            </Text>
            <RadioGroup.Root
              value={settings?.trackPreference ?? 'AUTO'}
              onValueChange={(details) => onSave('trackPreference', details.value)}
              colorPalette="purple"
            >
              <VStack align="stretch" gap={2}>
                <RadioGroup.Item value="RUSSIAN_DUB">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>
                    <Text fontWeight="medium">Русская озвучка</Text>
                    <Text fontSize="xs" color="fg.subtle">
                      Русский дубляж + субтитры надписей
                    </Text>
                  </RadioGroup.ItemText>
                </RadioGroup.Item>
                <RadioGroup.Item value="ORIGINAL_SUB">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>
                    <Text fontWeight="medium">Оригинал + субтитры</Text>
                    <Text fontSize="xs" color="fg.subtle">
                      Японская/английская дорожка + полные субтитры
                    </Text>
                  </RadioGroup.ItemText>
                </RadioGroup.Item>
                <RadioGroup.Item value="AUTO">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>
                    <Text fontWeight="medium">Автовыбор</Text>
                    <Text fontSize="xs" color="fg.subtle">
                      Русская если есть, иначе оригинал + субтитры
                    </Text>
                  </RadioGroup.ItemText>
                </RadioGroup.Item>
              </VStack>
            </RadioGroup.Root>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
