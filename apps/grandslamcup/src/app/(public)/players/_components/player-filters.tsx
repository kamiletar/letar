'use client'

/**
 * Фильтры рейтинга поэтов — сезон, город, команда
 *
 * Работает через searchParams (серверная навигация).
 */

import { Flex, NativeSelect } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface FilterOption {
  value: string
  label: string
}

interface PlayerFiltersProps {
  seasons: FilterOption[]
  cities: FilterOption[]
  teams: FilterOption[]
  currentSeason?: string
  currentCity?: string
  currentTeam?: string
}

export function PlayerFilters({ seasons, cities, teams, currentSeason, currentCity, currentTeam }: PlayerFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`/players?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <Flex gap={3} wrap="wrap">
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

      <NativeSelect.Root size="sm" w="auto" minW="140px">
        <NativeSelect.Field value={currentCity ?? ''} onChange={(e) => updateFilter('city', e.target.value)}>
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

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
