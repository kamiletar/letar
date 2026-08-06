'use client'

import type { ImageCategory } from '@/generated/prisma'
import { Box, Button, HStack, Input, NativeSelect } from '@chakra-ui/react'
import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'

interface ImageFiltersProps {
  currentCategory?: ImageCategory
  currentSearch?: string
  locale: string
}

export function ImageFilters({ currentCategory, currentSearch, locale }: ImageFiltersProps) {
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
        router.push(`/${locale}/admin/images?${params.toString()}`)
      })
    },
    [router, searchParams, locale],
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: search || undefined })
  }

  const handleClearFilters = () => {
    setSearch('')
    startTransition(() => {
      router.push(`/${locale}/admin/images`)
    })
  }

  const hasFilters = currentCategory || currentSearch

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
          <Button type="submit" size="sm" colorPalette="purple" loading={isPending}>
            <Search size={16} />
          </Button>
        </HStack>

        {/* Категория */}
        <NativeSelect.Root size="sm" width="180px">
          <NativeSelect.Field
            value={currentCategory || ''}
            onChange={(e) => updateFilters({ category: e.target.value || undefined })}
          >
            <option value="">Все категории</option>
            <option value="BLOG">Блог</option>
            <option value="CONTENT">Контент</option>
            <option value="AVATAR">Аватар</option>
            <option value="OTHER">Прочее</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {/* Сброс фильтров */}
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={handleClearFilters} loading={isPending}>
            <X size={16} /> Сбросить
          </Button>
        )}
      </HStack>
    </Box>
  )
}
