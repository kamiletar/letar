'use client'

import type { Gender } from '@/generated/prisma'
import { Badge, Box, Grid, Text, Tooltip, VStack } from '@chakra-ui/react'

interface SizeSelectorProps {
  items: Array<{
    id: string
    price: number
    availableCount: number
    size: {
      id: string
      gender: Gender
      international: string
      ru: string
      de: string
      it: string
      fr: string
      uk: string
      us: string
      jeansFrom: string
      jeansTo: string
      bustMin: number | null
      bustMax: number | null
      waistMin: number | null
      waistMax: number | null
      hipsMin: number | null
      hipsMax: number | null
    }
  }>
  selectedItemId: string | null
  onSelectItem: (itemId: string) => void
}

export function SizeSelector({ items, selectedItemId, onSelectItem }: SizeSelectorProps) {
  return (
    <Grid templateColumns="repeat(auto-fill, minmax(100px, 1fr))" gap={3}>
      {items.map((item) => {
        const isSelected = item.id === selectedItemId
        const sizeInfo = item.size
        const isAvailable = item.availableCount > 0

        return (
          <Tooltip.Root key={item.id} positioning={{ placement: 'top' }}>
            <Tooltip.Trigger asChild>
              <Box
                px={4}
                py={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor={isSelected ? 'fg' : 'border'}
                bg={isSelected ? 'fg.muted' : 'transparent'}
                cursor={isAvailable ? 'pointer' : 'not-allowed'}
                role="button"
                tabIndex={isAvailable ? 0 : -1}
                aria-label={`Размер ${sizeInfo.international}${!isAvailable ? ', нет в наличии' : ''}`}
                aria-pressed={isSelected}
                aria-disabled={!isAvailable}
                onClick={() => isAvailable && onSelectItem(item.id)}
                onKeyDown={(e) => {
                  if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelectItem(item.id)
                  }
                }}
                transition="all 0.2s"
                opacity={isAvailable ? (isSelected ? 1 : 0.5) : 0.4}
                textAlign="center"
                position="relative"
                _hover={
                  isAvailable
                    ? {
                        borderColor: 'fg',
                        bg: isSelected ? 'fg.muted' : 'bg.subtle',
                        opacity: 1,
                      }
                    : undefined
                }
                _focusVisible={{
                  outline: '2px solid',
                  outlineColor: 'fg',
                  outlineOffset: '2px',
                }}
              >
                <VStack gap={1}>
                  <Text
                    fontWeight={isSelected ? 'bold' : 'semibold'}
                    fontSize="lg"
                    color={isSelected ? 'fg.emphasized' : 'fg.muted'}
                  >
                    {sizeInfo.international}
                  </Text>
                  {!isAvailable && (
                    <Badge size="xs" colorPalette="red" variant="subtle">
                      Нет
                    </Badge>
                  )}
                </VStack>
              </Box>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                <VStack align="start" gap={1} fontSize="sm">
                  {/* Информация о наличии */}
                  <Text fontWeight="bold" color={isAvailable ? 'green.400' : 'red.400'}>
                    {isAvailable ? `В наличии: ${item.availableCount} шт` : 'Нет в наличии'}
                  </Text>

                  <Text fontWeight="bold" mt={1}>
                    Размеры:
                  </Text>
                  <Text>Россия: {sizeInfo.ru}</Text>
                  <Text>Германия: {sizeInfo.de}</Text>
                  <Text>Италия: {sizeInfo.it}</Text>
                  <Text>Франция: {sizeInfo.fr}</Text>
                  <Text>Великобритания: {sizeInfo.uk}</Text>
                  <Text>США: {sizeInfo.us}</Text>
                  <Text>
                    Джинсы: {sizeInfo.jeansFrom} - {sizeInfo.jeansTo}
                  </Text>

                  {/* Show measurements if available */}
                  {(sizeInfo.bustMin ||
                    sizeInfo.bustMax ||
                    sizeInfo.waistMin ||
                    sizeInfo.waistMax ||
                    sizeInfo.hipsMin ||
                    sizeInfo.hipsMax) && (
                    <>
                      <Text fontWeight="bold" mt={2}>
                        Измерения (см):
                      </Text>
                      {(sizeInfo.bustMin || sizeInfo.bustMax) && (
                        <Text>
                          Обхват груди: {sizeInfo.bustMin || '—'} - {sizeInfo.bustMax || '—'}
                        </Text>
                      )}
                      {(sizeInfo.waistMin || sizeInfo.waistMax) && (
                        <Text>
                          Обхват талии: {sizeInfo.waistMin || '—'} - {sizeInfo.waistMax || '—'}
                        </Text>
                      )}
                      {(sizeInfo.hipsMin || sizeInfo.hipsMax) && (
                        <Text>
                          Обхват бедер: {sizeInfo.hipsMin || '—'} - {sizeInfo.hipsMax || '—'}
                        </Text>
                      )}
                    </>
                  )}
                </VStack>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        )
      })}
    </Grid>
  )
}
