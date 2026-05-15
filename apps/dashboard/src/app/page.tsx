'use client'

import { Header } from '@/app/_components/layout/Header'
import { SystemOverview } from '@/app/_components/system/SystemOverview'
import { Box, Container, Heading, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react'
import dynamic from 'next/dynamic'

/**
 * Lazy-loaded компоненты с Recharts
 * Снижает initial bundle size и память при первой загрузке
 */
const SystemHistoryChart = dynamic(
  () => import('@/app/_components/system/SystemHistoryChart').then((mod) => mod.SystemHistoryChart),
  {
    ssr: false,
    loading: () => (
      <Box h="400px" display="flex" alignItems="center" justifyContent="center" bg="bg.muted" borderRadius="lg">
        <Spinner size="lg" color="brand.solid" />
      </Box>
    ),
  }
)

const ProcessList = dynamic(() => import('@/app/_components/system/ProcessList').then((mod) => mod.ProcessList), {
  ssr: false,
  loading: () => (
    <Box h="300px" display="flex" alignItems="center" justifyContent="center" bg="bg.muted" borderRadius="lg">
      <Spinner size="md" color="brand.solid" />
    </Box>
  ),
})

const DiskUsage = dynamic(() => import('@/app/_components/system/DiskUsage').then((mod) => mod.DiskUsage), {
  ssr: false,
  loading: () => (
    <Box h="300px" display="flex" alignItems="center" justifyContent="center" bg="bg.muted" borderRadius="lg">
      <Spinner size="md" color="brand.solid" />
    </Box>
  ),
})

export default function Index() {
  return (
    <>
      <Header />
      <Container maxW="container.2xl" py={8}>
        <VStack gap={8} align="stretch">
          <Box>
            <Heading as="h1" size="2xl" mb={4} color="fg">
              Система мониторинга и управления
            </Heading>
            <Text fontSize="lg" color="gray.300">
              Мониторинг сервера в реальном времени. Обновление каждые 5 секунд.
            </Text>
          </Box>

          <SystemOverview />

          <SystemHistoryChart />

          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
            <ProcessList />
            <DiskUsage />
          </SimpleGrid>
        </VStack>
      </Container>
    </>
  )
}
