'use client'

/**
 * Кнопка пересчёта рейтинга поэтов для сезона
 */

import { toaster } from '@/app/_components/ui/toaster'
import { recalculateRatingsAction } from '@/app/admin/_actions/ratings.action'
import { Button } from '@chakra-ui/react'
import { useState } from 'react'

export function RecalculateRatingsButton({ seasonId }: { seasonId: string }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const result = await recalculateRatingsAction(seasonId)
      if ('error' in result) {
        toaster.error({ title: 'Ошибка', description: result.error })
      } else {
        toaster.success({
          title: 'Рейтинги пересчитаны',
          description: `${result.updated} поэтов, ${result.totalPerformances} выступлений`,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" colorPalette="teal" onClick={handleClick} loading={loading}>
      Пересчитать рейтинги
    </Button>
  )
}
