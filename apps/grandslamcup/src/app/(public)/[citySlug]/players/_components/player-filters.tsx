'use client'

/**
 * Фильтры поэтов — сезон, команда, поиск по имени.
 * Город определяется из URL (citySlug), отдельного фильтра нет.
 */

import { Box, Flex, Input, NativeSelect } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuSearch } from 'react-icons/lu'

interface FilterOption {
  value: string
  label: string
}

interface PlayerFiltersProps {
  seasons: FilterOption[]
  teams: FilterOption[]
  currentSeason?: string
  currentTeam?: string
  currentQuery?: string
  /** Базовый путь для навигации (с citySlug) */
  basePath?: string
}

export function PlayerFilters({
  seasons,
  teams,
  currentSeason,
  currentTeam,
  currentQuery,
  basePath = '/players',
}: PlayerFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(currentQuery ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [router, searchParams, basePath]
  )

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    setQuery(newValue)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => updateFilter('q', newValue.trim()), 300)
  }

  return (
    <Flex gap={3} wrap="wrap" align="center">
      {/* Поиск по имени */}
      <Box position="relative" minW="200px" flex={{ base: '1 1 100%', sm: '0 1 auto' }}>
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted" pointerEvents="none">
          <LuSearch size={16} />
        </Box>
        <Input
          value={query}
          onChange={handleQueryChange}
          placeholder="Поиск по имени..."
          size="sm"
          pl={9}
          borderRadius="lg"
        />
      </Box>

      {/* Сезон */}
      <NativeSelect.Root size="sm" w="auto" minW="160px">
        <NativeSelect.Field value={currentSeason ?? ''} onChange={(e) => updateFilter('season', e.target.value)}>
          <option value="">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      {/* Команда */}
      <NativeSelect.Root size="sm" w="auto" minW="160px">
        <NativeSelect.Field value={currentTeam ?? ''} onChange={(e) => updateFilter('team', e.target.value)}>
          <option value="">Все команды</option>
          {teams.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Flex>
  )
}
