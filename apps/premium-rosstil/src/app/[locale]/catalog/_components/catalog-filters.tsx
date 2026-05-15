'use client'

import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from '@/app/_components/ui/select'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Badge, Box, Button, ColorSwatch, createListCollection, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocalStorage } from '@letar/hooks'
import { Tooltip } from '@letar/ui'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { LuFilter, LuSparkles, LuX } from 'react-icons/lu'
import { PriceFilter } from './price-filter'

interface Category {
  id: string
  name: string
  slug: string
}

interface Color {
  id: string
  name: string
  slug: string
  hex: string
}

interface Size {
  id: string
  international: string
}

interface CatalogFiltersProps {
  categories: Category[]
  /** Доступные цвета для фильтрации */
  colors: Color[]
  /** Доступные размеры для фильтрации */
  sizes: Size[]
  totalProducts: number
  filteredCount: number
  /** Текущий поисковый запрос */
  currentQuery?: string
  /** Диапазон цен для слайдера */
  priceRange: { min: number; max: number }
  /** Текущее минимальное значение фильтра цены */
  currentMinPrice?: number
  /** Текущее максимальное значение фильтра цены */
  currentMaxPrice?: number
}

// Опции для фильтра по полу
const genderOptions = createListCollection({
  items: [
    { value: '', label: 'Все' },
    { value: 'MALE', label: 'Мужское' },
    { value: 'FEMALE', label: 'Женское' },
  ],
})

// Опции для сортировки
const sortOptions = createListCollection({
  items: [
    { value: '', label: 'По умолчанию' },
    { value: 'price_asc', label: 'Сначала стандартные' },
    { value: 'price_desc', label: 'Сначала премиум, люкссдела' },
    { value: 'newest', label: 'Сначала новые' },
  ],
})

export function CatalogFilters({
  categories,
  colors,
  sizes,
  totalProducts,
  filteredCount,
  currentQuery,
  priceRange,
  currentMinPrice,
  currentMaxPrice,
}: CatalogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Persist фильтров в localStorage (без q и page)
  const STORAGE_KEY = 'premium-rosstil:catalog-filters'
  const [savedFilters, setSavedFilters, removeSavedFilters] = useLocalStorage<Record<string, string>>(STORAGE_KEY, {})
  const restoredRef = useRef(false)

  // Восстановление фильтров из localStorage при первом mount (если URL пустой)
  useEffect(() => {
    if (restoredRef.current) {
      return
    }
    restoredRef.current = true

    // Проверяем, есть ли уже фильтры в URL (кроме q и page)
    const filterKeys = ['category', 'gender', 'new', 'sort', 'color', 'size', 'minPrice', 'maxPrice']
    const hasUrlFilters = filterKeys.some((key) => searchParams.has(key))

    if (!hasUrlFilters && Object.keys(savedFilters).length > 0) {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(savedFilters) as [string, string][]) {
        params.set(key, value)
      }
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [])

  // Текущие значения фильтров
  const currentCategory = searchParams.get('category') || ''
  const currentGender = searchParams.get('gender') || ''
  const currentNewCollection = searchParams.get('new') === 'true'
  const currentSort = searchParams.get('sort') || ''
  const currentColor = searchParams.get('color') || ''
  const currentSize = searchParams.get('size') || ''

  // Создаём коллекцию размеров
  const sizeOptions = createListCollection({
    items: [
      { value: '', label: 'Все размеры' },
      ...sizes.map((s) => ({ value: s.international, label: s.international })),
    ],
  })

  // Создаём коллекцию категорий
  const categoryOptions = createListCollection({
    items: [{ value: '', label: 'Все категории' }, ...categories.map((c) => ({ value: c.slug, label: c.name }))],
  })

  // Обновление URL с параметрами фильтра
  const updateFilter = useCallback(
    (key: string, value: string | boolean) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === '' || value === false) {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }

      // Сбрасываем пагинацию при изменении фильтров
      params.delete('page')

      // Сохраняем фильтры в localStorage (без q и page)
      setSavedFilters((prev: Record<string, string>) => {
        const next = { ...prev }
        if (value === '' || value === false) {
          delete next[key]
        } else {
          next[key] = String(value)
        }
        return next
      })

      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams, setSavedFilters]
  )

  // Сброс всех фильтров
  const resetFilters = useCallback(() => {
    removeSavedFilters()
    router.push(pathname)
  }, [router, pathname, removeSavedFilters])

  // Проверяем, активны ли какие-то фильтры
  const hasPriceFilter = currentMinPrice !== undefined || currentMaxPrice !== undefined
  const hasActiveFilters =
    currentCategory ||
    currentGender ||
    currentNewCollection ||
    currentSort ||
    currentQuery ||
    currentColor ||
    currentSize ||
    hasPriceFilter

  return (
    <VStack align="stretch" gap={4} mb={6} data-testid="catalog-filters">
      {/* Основные фильтры */}
      <HStack gap={3} flexWrap="wrap">
        <HStack gap={2}>
          <LuFilter size={16} />
          <Text fontSize="sm" fontWeight="medium">
            Фильтры:
          </Text>
        </HStack>

        {/* Категория */}
        <SelectRoot
          collection={categoryOptions}
          value={currentCategory ? [currentCategory] : []}
          onValueChange={(e: { value: string[] }) => updateFilter('category', e.value[0] || '')}
          size="sm"
          width="180px"
          data-testid="filter-category"
        >
          <SelectTrigger>
            <SelectValueText placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.items.map((item) => (
              <SelectItem key={item.value} item={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        {/* Пол */}
        <SelectRoot
          collection={genderOptions}
          value={currentGender ? [currentGender] : []}
          onValueChange={(e: { value: string[] }) => updateFilter('gender', e.value[0] || '')}
          size="sm"
          width="140px"
          data-testid="filter-gender"
        >
          <SelectTrigger>
            <SelectValueText placeholder="Пол" />
          </SelectTrigger>
          <SelectContent>
            {genderOptions.items.map((item) => (
              <SelectItem key={item.value} item={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        {/* Новинки */}
        <Button
          size="sm"
          variant={currentNewCollection ? 'solid' : 'outline'}
          colorPalette={'fg'}
          onClick={() => updateFilter('new', !currentNewCollection)}
          data-testid="filter-new-collection"
        >
          <LuSparkles size={14} />
          Новинки
        </Button>

        {/* Фильтр по цвету */}
        {colors.length > 0 && (
          <HStack gap={1} data-testid="filter-colors">
            {colors.map((color) => (
              <Tooltip key={color.id} content={color.name} positioning={{ placement: 'top' }}>
                <Box
                  as="button"
                  onClick={() => updateFilter('color', currentColor === color.slug ? '' : color.slug)}
                  borderRadius="full"
                  p="2px"
                  borderWidth={2}
                  borderColor={color.slug === currentColor ? 'fg' : 'transparent'}
                  cursor="pointer"
                  _hover={{ borderColor: 'fg.muted' }}
                  transition="border-color 0.2s"
                  aria-label={color.name}
                >
                  <ColorSwatch
                    value={color.hex}
                    size="md"
                    borderRadius="full"
                    shadow={color.hex.toUpperCase() === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined}
                  />
                </Box>
              </Tooltip>
            ))}
          </HStack>
        )}

        {/* Фильтр по размеру */}
        {sizes.length > 0 && (
          <SelectRoot
            collection={sizeOptions}
            value={currentSize ? [currentSize] : []}
            onValueChange={(e: { value: string[] }) => updateFilter('size', e.value[0] || '')}
            size="sm"
            width="140px"
            data-testid="filter-size"
          >
            <SelectTrigger>
              <SelectValueText placeholder="Размер" />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.items.map((item) => (
                <SelectItem key={item.value} item={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        )}

        {/* Фильтр по цене */}
        <PriceFilter
          min={priceRange.min}
          max={priceRange.max}
          currentMin={currentMinPrice}
          currentMax={currentMaxPrice}
          onPriceChange={(min, max) => {
            const params = new URLSearchParams(searchParams.toString())

            // Устанавливаем или удаляем параметры цены
            if (min !== undefined && min !== priceRange.min) {
              params.set('minPrice', String(min))
            } else {
              params.delete('minPrice')
            }

            if (max !== undefined && max !== priceRange.max) {
              params.set('maxPrice', String(max))
            } else {
              params.delete('maxPrice')
            }

            // Сбрасываем пагинацию
            params.delete('page')

            // Сохраняем в localStorage
            setSavedFilters((prev: Record<string, string>) => {
              const next = { ...prev }
              if (min !== undefined && min !== priceRange.min) {
                next.minPrice = String(min)
              } else {
                delete next.minPrice
              }
              if (max !== undefined && max !== priceRange.max) {
                next.maxPrice = String(max)
              } else {
                delete next.maxPrice
              }
              return next
            })

            router.push(`${pathname}?${params.toString()}`)
          }}
        />

        {/* Сортировка */}
        <SelectRoot
          collection={sortOptions}
          value={currentSort ? [currentSort] : []}
          onValueChange={(e: { value: string[] }) => updateFilter('sort', e.value[0] || '')}
          size="sm"
          width="180px"
          data-testid="filter-sort"
        >
          <SelectTrigger>
            <SelectValueText placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.items.map((item) => (
              <SelectItem key={item.value} item={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        {/* Сброс фильтров */}
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" colorPalette="red" onClick={resetFilters}>
            <LuX size={14} />
            Сбросить
          </Button>
        )}
      </HStack>

      {/* Информация о результатах */}
      <HStack gap={2}>
        <Text fontSize="sm" color="fg.muted">
          {filteredCount === totalProducts
            ? `Показано ${totalProducts} ${getProductsWord(totalProducts)}`
            : `Найдено ${filteredCount} из ${totalProducts} ${getProductsWord(totalProducts)}`}
        </Text>

        {/* Активные фильтры как бейджи */}
        {hasActiveFilters && (
          <HStack gap={1}>
            {currentCategory && (
              <Badge size="sm" colorPalette="cyan">
                {categories.find((c) => c.slug === currentCategory)?.name}
              </Badge>
            )}
            {currentGender && (
              <Badge size="sm" colorPalette={currentGender === 'MALE' ? 'blue' : 'pink'}>
                {currentGender === 'MALE' ? 'Мужское' : 'Женское'}
              </Badge>
            )}
            {currentNewCollection && (
              <Badge size="sm" colorPalette="yellow">
                <LuSparkles size={10} />
                Новинки
              </Badge>
            )}
            {currentQuery && (
              <Badge size="sm" colorPalette="purple">
                Поиск: {currentQuery}
              </Badge>
            )}
            {currentColor && (
              <Badge size="sm" variant="outline">
                <ColorSwatch value={colors.find((c) => c.slug === currentColor)?.hex || '#000'} size="2xs" />
                {colors.find((c) => c.slug === currentColor)?.name}
              </Badge>
            )}
            {currentSize && (
              <Badge size="sm" colorPalette="gray">
                Размер: {currentSize}
              </Badge>
            )}
            {hasPriceFilter && (
              <Badge size="sm" colorPalette="green">
                Цена: {currentMinPrice?.toLocaleString('ru-RU') || priceRange.min.toLocaleString('ru-RU')} —{' '}
                {currentMaxPrice?.toLocaleString('ru-RU') || priceRange.max.toLocaleString('ru-RU')} ₽
              </Badge>
            )}
          </HStack>
        )}
      </HStack>
    </VStack>
  )
}

// Склонение слова "продукт"
function getProductsWord(count: number): string {
  const lastTwo = count % 100
  const lastOne = count % 10

  if (lastTwo >= 11 && lastTwo <= 19) {
    return 'продуктов'
  }

  if (lastOne === 1) {
    return 'продукт'
  }

  if (lastOne >= 2 && lastOne <= 4) {
    return 'продукта'
  }

  return 'продуктов'
}
