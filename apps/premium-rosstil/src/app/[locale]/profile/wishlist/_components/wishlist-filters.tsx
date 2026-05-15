'use client'

import type { WishlistPriority } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { Box, Button, createListCollection, HStack, Icon, Select, Tag, Text, VStack, Wrap } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { FaSortAmountDown, FaStar, FaTag, FaTimes } from 'react-icons/fa'

// Конфигурация приоритетов
const PRIORITY_OPTIONS: { value: WishlistPriority; label: string; icon: string }[] = [
  { value: 'DREAM', label: 'Мечта', icon: '⭐' },
  { value: 'WANT', label: 'Хочу', icon: '💫' },
  { value: 'MAYBE', label: 'Может быть', icon: '✨' },
]

// Опции сортировки
const SORT_OPTIONS = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'oldest', label: 'Сначала старые' },
  { value: 'priority', label: 'По приоритету' },
]

interface WishlistFiltersProps {
  allTags: string[]
  currentPriority?: string
  currentTag?: string
  currentSort: string
  totalItems: number
  filteredItems: number
}

/**
 * Компонент фильтров и сортировки для страницы избранного.
 */
export function WishlistFilters({
  allTags,
  currentPriority,
  currentTag,
  currentSort,
  totalItems,
  filteredItems,
}: WishlistFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`/profile/wishlist?${params.toString()}`)
    },
    [router, searchParams]
  )

  const clearFilters = useCallback(() => {
    router.push('/profile/wishlist')
  }, [router])

  const hasActiveFilters = currentPriority || currentTag

  // Создаём коллекцию для Select
  const sortCollection = createListCollection({
    items: SORT_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })),
  })

  return (
    <Box mb={6}>
      <VStack align="stretch" gap={4}>
        {/* Строка с фильтрами и сортировкой */}
        <HStack gap={4} flexWrap="wrap" justify="space-between">
          {/* Фильтры по приоритету */}
          <HStack gap={2} flexWrap="wrap">
            <Icon as={FaStar} color="fg.muted" />
            <Text fontSize="sm" fontWeight="medium" color="fg.muted">
              Приоритет:
            </Text>
            {PRIORITY_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="xs"
                variant={currentPriority === opt.value ? 'solid' : 'outline'}
                colorPalette={currentPriority === opt.value ? 'fg' : 'gray'}
                onClick={() => updateParams('priority', currentPriority === opt.value ? null : opt.value)}
              >
                {opt.icon} {opt.label}
              </Button>
            ))}
          </HStack>

          {/* Сортировка */}
          <HStack gap={2}>
            <Icon as={FaSortAmountDown} color="fg.muted" />
            <Select.Root
              collection={sortCollection}
              value={[currentSort]}
              onValueChange={(e) => updateParams('sort', e.value[0])}
              size="sm"
              width="180px"
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Сортировка" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {sortCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      {item.label}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </HStack>
        </HStack>

        {/* Теги (если есть) */}
        {allTags.length > 0 && (
          <HStack gap={2} flexWrap="wrap">
            <Icon as={FaTag} color="fg.muted" />
            <Text fontSize="sm" fontWeight="medium" color="fg.muted">
              Теги:
            </Text>
            <Wrap gap={2}>
              {allTags.map((tag) => (
                <Tag.Root
                  key={tag}
                  size="sm"
                  colorPalette={currentTag === tag ? 'fg' : 'gray'}
                  variant={currentTag === tag ? 'solid' : 'outline'}
                  cursor="pointer"
                  onClick={() => updateParams('tag', currentTag === tag ? null : tag)}
                >
                  <Tag.Label>{tag}</Tag.Label>
                </Tag.Root>
              ))}
            </Wrap>
          </HStack>
        )}

        {/* Строка с результатами и кнопкой сброса */}
        <HStack justify="space-between">
          <Text fontSize="sm" color="fg.muted">
            {hasActiveFilters ? (
              <>
                Показано {filteredItems} из {totalItems} товаров
              </>
            ) : (
              <>Всего {totalItems} товаров</>
            )}
          </Text>
          {hasActiveFilters && (
            <Button size="xs" variant="ghost" onClick={clearFilters}>
              <Icon as={FaTimes} mr={1} />
              Сбросить фильтры
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  )
}
