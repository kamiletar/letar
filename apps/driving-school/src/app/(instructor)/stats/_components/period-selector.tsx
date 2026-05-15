'use client'

import { Button, HStack } from '@chakra-ui/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { PeriodType } from '../_actions/stats.action'

interface PeriodSelectorProps {
  currentPeriod: PeriodType
}

const periods: { value: PeriodType; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
]

export function PeriodSelector({ currentPeriod }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePeriodChange = (period: PeriodType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    // Используем текущий путь вместо захардкоженного /stats
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <HStack gap={2} flexWrap="wrap">
      {periods.map((period) => (
        <Button
          key={period.value}
          size="sm"
          variant={currentPeriod === period.value ? 'solid' : 'outline'}
          colorPalette={currentPeriod === period.value ? 'fg' : 'gray'}
          onClick={() => handlePeriodChange(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </HStack>
  )
}
