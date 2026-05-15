'use client'

import { Box, Card, Grid, Heading, HStack, Icon, Slider, Switch, Text, VStack } from '@chakra-ui/react'
import { LuCpu, LuGauge, LuSettings, LuZap } from 'react-icons/lu'

import type { VideoTranscodeOptions } from '../../../../shared/types'

interface TranscodeSettingsProps {
  settings: VideoTranscodeOptions
  onChange: (settings: Partial<VideoTranscodeOptions>) => void
}

const codecs = [
  { value: 'av1', label: 'AV1', description: 'Лучшее сжатие, медленнее' },
  { value: 'hevc', label: 'HEVC/H.265', description: 'Хорошее сжатие, быстрее' },
  { value: 'h264', label: 'H.264', description: 'Максимальная совместимость' },
]

const presets = [
  { value: 'p1', label: 'Быстрый', speed: 90 },
  { value: 'p3', label: 'Средний', speed: 60 },
  { value: 'p5', label: 'Качество', speed: 40 },
  { value: 'p7', label: 'Максимум', speed: 10 },
]

/**
 * Настройки транскодирования
 */
export function TranscodeSettings({ settings, onChange }: TranscodeSettingsProps) {
  return (
    <VStack gap={6} align="stretch">
      {/* Кодек */}
      <Card.Root bg="bg.subtle" border="1px" borderColor="border.subtle">
        <Card.Body>
          <HStack mb={4}>
            <Icon as={LuSettings} color="primary.fg" />
            <Heading size="sm">Видеокодек</Heading>
          </HStack>

          <Grid templateColumns="repeat(3, 1fr)" gap={3}>
            {codecs.map((codec) => (
              <Box
                key={codec.value}
                p={4}
                borderRadius="lg"
                border="2px"
                borderColor={settings.codec === codec.value ? 'primary.solid' : 'border'}
                bg={settings.codec === codec.value ? 'primary.subtle' : 'bg.muted'}
                cursor="pointer"
                onClick={() => onChange({ codec: codec.value as VideoTranscodeOptions['codec'] })}
                _hover={{ borderColor: 'primary.fg' }}
                _active={{ transform: 'scale(0.98)' }}
                transition="all 0.15s ease-out"
              >
                <Text fontWeight="bold">{codec.label}</Text>
                <Text fontSize="sm" color="fg.muted">
                  {codec.description}
                </Text>
              </Box>
            ))}
          </Grid>
        </Card.Body>
      </Card.Root>

      {/* Качество */}
      <Card.Root bg="bg.subtle" border="1px" borderColor="border.subtle">
        <Card.Body>
          <HStack mb={4}>
            <Icon as={LuGauge} color="primary.fg" />
            <Heading size="sm">Качество (CQ: {settings.cq})</Heading>
          </HStack>

          <Box px={2}>
            <Slider.Root
              value={[settings.cq]}
              onValueChange={(details) => onChange({ cq: details.value[0] })}
              min={15}
              max={40}
              step={1}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
            </Slider.Root>
            <HStack justify="space-between" mt={2}>
              <Text fontSize="xs" color="fg.subtle">
                Высокое (15)
              </Text>
              <Text fontSize="xs" color="fg.subtle">
                Низкое (40)
              </Text>
            </HStack>
          </Box>
        </Card.Body>
      </Card.Root>

      {/* Пресет скорости */}
      <Card.Root bg="bg.subtle" border="1px" borderColor="border.subtle">
        <Card.Body>
          <HStack mb={4}>
            <Icon as={LuZap} color="primary.fg" />
            <Heading size="sm">Скорость кодирования</Heading>
          </HStack>

          <Grid templateColumns="repeat(4, 1fr)" gap={3}>
            {presets.map((preset) => (
              <Box
                key={preset.value}
                p={3}
                borderRadius="lg"
                border="2px"
                borderColor={settings.preset === preset.value ? 'primary.solid' : 'border'}
                bg={settings.preset === preset.value ? 'primary.subtle' : 'bg.muted'}
                cursor="pointer"
                onClick={() => onChange({ preset: preset.value })}
                _hover={{ borderColor: 'primary.fg' }}
                _active={{ transform: 'scale(0.98)' }}
                transition="all 0.15s ease-out"
                textAlign="center"
              >
                <Text fontWeight="medium" fontSize="sm">
                  {preset.label}
                </Text>
                <Box mt={2} h="4px" bg="bg.emphasized" borderRadius="full" overflow="hidden">
                  <Box w={`${preset.speed}%`} h="full" bg="primary.solid" />
                </Box>
              </Box>
            ))}
          </Grid>
        </Card.Body>
      </Card.Root>

      {/* GPU */}
      <Card.Root bg="bg.subtle" border="1px" borderColor="border.subtle">
        <Card.Body>
          <HStack justify="space-between">
            <HStack gap={3}>
              <Icon as={LuCpu} color="primary.fg" boxSize={5} />
              <Box>
                <Text fontWeight="medium">Использовать GPU</Text>
                <Text fontSize="sm" color="fg.subtle">
                  NVIDIA NVENC для ускорения кодирования
                </Text>
              </Box>
            </HStack>
            <Switch.Root checked={settings.useGpu} onCheckedChange={(details) => onChange({ useGpu: details.checked })}>
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
