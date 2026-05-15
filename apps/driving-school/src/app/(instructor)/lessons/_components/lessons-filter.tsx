'use client'

import { Badge, HStack, NativeSelect } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'

interface LessonsFilterProps {
  stats: {
    pending: number
    confirmed: number
    completed: number
    cancelled: number
    noShow: number
  }
  currentFilter?: string
}

export function LessonsFilter({ stats, currentFilter }: LessonsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'ALL') {
      params.delete('status')
    } else {
      params.set('status', value)
    }

    router.push(`/lessons?${params.toString()}`)
  }

  return (
    <HStack
      gap={4}
      wrap="wrap"
      justify="space-between"
      bg="bg.panel"
      p={4}
      borderRadius="lg"
      shadow="sm"
      borderWidth="1px"
    >
      {/* Статистика */}
      <HStack gap={3} wrap="wrap">
        <Badge colorPalette="yellow" size="lg">
          Ожидают: {stats.pending}
        </Badge>
        <Badge colorPalette="blue" size="lg">
          Подтверждено: {stats.confirmed}
        </Badge>
        <Badge colorPalette="green" size="lg">
          Проведено: {stats.completed}
        </Badge>
        <Badge colorPalette="red" size="lg">
          Отменено: {stats.cancelled}
        </Badge>
        <Badge colorPalette="orange" size="lg">
          Неявки: {stats.noShow}
        </Badge>
      </HStack>

      {/* Фильтр */}
      <NativeSelect.Root minW={{ base: '100%', sm: '200px' }}>
        <NativeSelect.Field value={currentFilter || 'ALL'} onChange={handleFilterChange}>
          <option value="ALL">Все занятия</option>
          <option value="PENDING">Ожидают подтверждения</option>
          <option value="CONFIRMED">Подтверждённые</option>
          <option value="COMPLETED">Проведённые</option>
          <option value="CANCELLED">Отменённые</option>
          <option value="NO_SHOW">Неявки</option>
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </HStack>
  )
}
