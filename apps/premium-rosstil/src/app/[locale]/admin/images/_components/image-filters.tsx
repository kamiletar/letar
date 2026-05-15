'use client'

import type { ImageCategory } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { Box, Button, HStack, Input, NativeSelect } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

interface ImageFiltersProps {
  currentCategory?: ImageCategory
  currentSearch?: string
  currentUnused?: boolean
}

export function ImageFilters({ currentCategory, currentSearch, currentUnused }: ImageFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch || '')

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      // Сбрасываем страницу при изменении фильтров
      params.delete('page')

      startTransition(() => {
        router.push(`/admin/images?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: search || undefined })
  }

  const handleClearFilters = () => {
    setSearch('')
    startTransition(() => {
      router.push('/admin/images')
    })
  }

  const hasFilters = currentCategory || currentSearch || currentUnused !== undefined

  return (
    <Box as="form" onSubmit={handleSearchSubmit}>
      <HStack gap={4} wrap="wrap">
        {/* Поиск */}
        <HStack flex="1" minW="200px">
          <Input
            placeholder="Поиск по имени файла..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="sm"
          />
          <Button type="submit" size="sm" colorPalette="fg" loading={isPending}>
            <FiSearch />
          </Button>
        </HStack>

        {/* Категория */}
        <NativeSelect.Root size="sm" width="180px">
          <NativeSelect.Field
            value={currentCategory || ''}
            onChange={(e) => updateFilters({ category: e.target.value || undefined })}
          >
            <option value="">Все категории</option>
            <option value="PRODUCT">Товары</option>
            <option value="AVATAR">Аватары</option>
            <option value="REFERENCE">Ориентиры</option>
            <option value="NOTIFICATION">Уведомления</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {/* Только неиспользуемые */}
        <Button
          size="sm"
          variant={currentUnused ? 'solid' : 'outline'}
          colorPalette={currentUnused ? 'red' : 'gray'}
          onClick={() => updateFilters({ unused: currentUnused ? undefined : 'true' })}
        >
          Неиспользуемые
        </Button>

        {/* Сброс фильтров */}
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={handleClearFilters} loading={isPending}>
            <FiX /> Сбросить
          </Button>
        )}
      </HStack>
    </Box>
  )
}
