'use client'

/**
 * Карточка настроек транскодирования
 */

import { Box, Card, Heading, HStack, Icon, Slider, Switch, Text, VStack } from '@chakra-ui/react'
import { LuCpu, LuSettings, LuZap } from 'react-icons/lu'

import type { Settings } from '@/generated/prisma'

interface TranscodingSettingsCardProps {
  settings: Settings | null | undefined
  onSave: (field: string, value: unknown) => void
}

/**
 * Настройки транскодирования (GPU, битрейт)
 */
export function TranscodingSettingsCard({ settings, onSave }: TranscodingSettingsCardProps) {
  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <Icon as={LuSettings} color="purple.400" boxSize={5} />
          <Heading size="md">Транскодирование</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* GPU */}
          <HStack justify="space-between">
            <HStack gap={3}>
              <Icon as={LuCpu} color="fg.muted" />
              <Box>
                <Text fontWeight="medium">Использовать GPU</Text>
                <Text fontSize="sm" color="fg.subtle">
                  NVIDIA NVENC для ускорения
                </Text>
              </Box>
            </HStack>
            <Switch.Root
              checked={settings?.useGpu ?? true}
              onCheckedChange={(details) => onSave('useGpu', details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

          {/* Битрейт аудио */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <HStack gap={3}>
                <Icon as={LuZap} color="fg.muted" />
                <Text fontWeight="medium">Битрейт аудио (kbps)</Text>
              </HStack>
              <Text color="purple.400" fontWeight="bold">
                {settings?.audioBitrate ?? 256}
              </Text>
            </HStack>
            <Slider.Root
              value={[settings?.audioBitrate ?? 256]}
              onValueChange={(details) => onSave('audioBitrate', details.value[0])}
              min={64}
              max={512}
              step={32}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
            </Slider.Root>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
