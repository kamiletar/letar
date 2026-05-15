'use client'

import { Box, Spinner } from '@chakra-ui/react'
import dynamic from 'next/dynamic'

// Экспорт типа для использования в других модулях
export type { MetricDataPoint } from './MetricsChart'

/**
 * Заглушка для загрузки графиков
 */
const ChartLoadingFallback = ({ height = 120 }: { height?: number }) => (
  <Box h={height} display="flex" alignItems="center" justifyContent="center">
    <Spinner size="sm" color="brand.solid" />
  </Box>
)

/**
 * Lazy-loaded MetricsChart
 * Recharts не нужен на сервере — отключаем SSR
 */
export const MetricsChart = dynamic(() => import('./MetricsChart').then((mod) => mod.MetricsChart), {
  ssr: false,
  loading: () => <ChartLoadingFallback />,
})
