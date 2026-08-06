'use client'

import {
  Box,
  Button,
  createListCollection,
  HStack,
  Icon,
  Popover,
  Portal,
  Select,
  Text,
  VStack,
} from '@chakra-ui/react'
import { LuChevronDown, LuMonitor } from 'react-icons/lu'

export interface QualityFilterGroupProps {
  /** Текущее разрешение */
  resolution: string
  /** Callback изменения разрешения */
  onResolutionChange: (value: string) => void
  /** Текущая битность */
  bitDepth: string
  /** Callback изменения битности */
  onBitDepthChange: (value: string) => void
  /** Очистка обоих полей качества за один вызов (атомарный сброс) */
  onQualityClear?: () => void
  /** Счётчики для faceted search (опционально) */
  counts?: {
    resolution?: Record<string, number>
    bitDepth?: Record<string, number>
  }
}

// Коллекции для селектов
const resolutionCollection = createListCollection({
  items: [
    { value: '', label: 'Любое' },
    { value: '4k', label: '4K (2160p)' },
    { value: '1080p', label: '1080p' },
    { value: '720p', label: '720p и ниже' },
  ],
})

const bitDepthCollection = createListCollection({
  items: [
    { value: '', label: 'Любая' },
    { value: '10', label: '10-bit' },
    { value: '8', label: '8-bit' },
  ],
})

/**
 * Группа фильтров качества (разрешение + битность) в Popover
 *
 * @example
 * ```tsx
 * <QualityFilterGroup
 *   resolution={resolution}
 *   onResolutionChange={setResolution}
 *   bitDepth={bitDepth}
 *   onBitDepthChange={setBitDepth}
 * />
 * ```
 */
export function QualityFilterGroup({
  resolution,
  onResolutionChange,
  bitDepth,
  onBitDepthChange,
  onQualityClear,
  counts,
}: QualityFilterGroupProps) {
  const hasActiveFilters = resolution || bitDepth

  // Формируем лейбл для кнопки
  const getButtonLabel = () => {
    const parts: string[] = []
    if (resolution) {
      const item = resolutionCollection.items.find((i) => i.value === resolution)
      if (item) {
        parts.push(item.label)
      }
    }
    if (bitDepth) {
      const item = bitDepthCollection.items.find((i) => i.value === bitDepth)
      if (item) {
        parts.push(item.label)
      }
    }
    return parts.length > 0 ? parts.join(', ') : 'Качество'
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          variant={hasActiveFilters ? 'subtle' : 'outline'}
          size="sm"
          colorPalette={hasActiveFilters ? 'purple' : undefined}
          borderColor={hasActiveFilters ? 'purple.500' : 'border'}
          minH="44px"
        >
          <Icon as={LuMonitor} mr={1} />
          {getButtonLabel()}
          {hasActiveFilters && (
            <Box as="span" color="purple.500" ml={1}>
              •
            </Box>
          )}
          <Icon as={LuChevronDown} ml={1} />
        </Button>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content w="280px">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>

            <Popover.Header fontWeight="semibold" borderBottomWidth={1} pb={2}>
              <HStack>
                <Icon as={LuMonitor} />
                <Text>Качество видео</Text>
              </HStack>
            </Popover.Header>

            <Popover.Body>
              <VStack gap={4} align="stretch">
                {/* Разрешение */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
                    Разрешение
                  </Text>
                  <Select.Root
                    collection={resolutionCollection}
                    value={[resolution]}
                    onValueChange={(details) => onResolutionChange(details.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger minH="44px">
                        <Select.ValueText placeholder="Любое" />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {resolutionCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            <HStack justify="space-between" w="full">
                              <span>{item.label}</span>
                              {counts?.resolution?.[item.value] !== undefined && (
                                <Text as="span" fontSize="xs" color="fg.subtle">
                                  ({counts.resolution[item.value]})
                                </Text>
                              )}
                            </HStack>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Box>

                {/* Битность */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
                    Глубина цвета
                  </Text>
                  <Select.Root
                    collection={bitDepthCollection}
                    value={[bitDepth]}
                    onValueChange={(details) => onBitDepthChange(details.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger minH="44px">
                        <Select.ValueText placeholder="Любая" />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {bitDepthCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            <HStack justify="space-between" w="full">
                              <span>{item.label}</span>
                              {counts?.bitDepth?.[item.value] !== undefined && (
                                <Text as="span" fontSize="xs" color="fg.subtle">
                                  ({counts.bitDepth[item.value]})
                                </Text>
                              )}
                            </HStack>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Box>
              </VStack>
            </Popover.Body>

            {hasActiveFilters && (
              <Popover.Footer borderTopWidth={1} pt={2}>
                <Button
                  variant="ghost"
                  size="sm"
                  w="full"
                  onClick={onQualityClear
                    ?? (() => {
                      onResolutionChange('')
                      onBitDepthChange('')
                    })}
                >
                  Сбросить качество
                </Button>
              </Popover.Footer>
            )}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
