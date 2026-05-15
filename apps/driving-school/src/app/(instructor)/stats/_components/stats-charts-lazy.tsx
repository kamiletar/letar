'use client'

/**
 * Ленивая загрузка компонента StatsCharts
 * Recharts (~200KB) загружается только когда нужно отобразить графики
 */

import { Center, Spinner } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import type { DailyLessonData, LessonStats } from '../_actions/stats.action'

// Ленивая загрузка StatsCharts — Recharts не попадает в основной бандл
const StatsCharts = dynamic(() => import('./stats-charts').then((mod) => ({ default: mod.StatsCharts })), {
  ssr: false,
  loading: () => (
    <Center h="300px">
      <Spinner size="lg" colorPalette="brand" />
    </Center>
  ),
})

interface StatsChartsLazyProps {
  lessons: LessonStats
  dailyData: DailyLessonData[]
}

export function StatsChartsLazy({ lessons, dailyData }: StatsChartsLazyProps) {
  return <StatsCharts lessons={lessons} dailyData={dailyData} />
}
