'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Skeleton,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { LuArrowDown, LuArrowUp, LuBan, LuCalendar, LuFileText, LuMinus, LuPrinter, LuTrendingUp } from 'react-icons/lu'
import type { DailyStats, PeriodStats, PrintJobStats } from '../../types/electron'
import { MetricCard } from '../_components/metric-card'
import { toaster } from '../_components/ui/toaster'

// Динамический импорт графика (~500 KB recharts + @chakra-ui/charts)
const StatsChart = dynamic(() => import('./_components/stats-chart').then((mod) => mod.StatsChart), {
  loading: () => <Skeleton height="300px" />,
  ssr: false,
})

/**
 * Вычисляет процент изменения между двумя значениями
 */
function calcDelta(current: number, previous: number): { value: number; type: 'up' | 'down' | 'same' } {
  if (previous === 0) {
    if (current === 0) {
      return { value: 0, type: 'same' }
    }
    return { value: 100, type: 'up' }
  }
  const delta = ((current - previous) / previous) * 100
  if (delta > 0) {
    return { value: Math.round(delta), type: 'up' }
  }
  if (delta < 0) {
    return { value: Math.abs(Math.round(delta)), type: 'down' }
  }
  return { value: 0, type: 'same' }
}

export default function StatsPage() {
  const [stats, setStats] = useState<PrintJobStats | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Сравнение периодов
  const [compareMode, setCompareMode] = useState(false)
  const [startDate2, setStartDate2] = useState('')
  const [endDate2, setEndDate2] = useState('')
  const [period1Stats, setPeriod1Stats] = useState<PeriodStats | null>(null)
  const [period2Stats, setPeriod2Stats] = useState<PeriodStats | null>(null)
  const [isComparing, setIsComparing] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          // Загружаем общую статистику
          const statsData = await window.electronAPI.database.getStats()
          setStats(statsData)

          // Загружаем статистику по дням
          const daily = await window.electronAPI.database.getDailyStats(7)
          setDailyStats(daily)
        } catch (error) {
          console.error('[Stats] Failed to load stats:', error)
        }
      }
      setIsLoading(false)
    }

    loadData()
  }, [])

  // Экспорт в PDF
  const handleExportPdf = async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.export) {
      toaster.error({ title: 'Экспорт недоступен', description: 'Требуется Electron', closable: true })
      return
    }

    setIsExporting(true)
    try {
      const result = await window.electronAPI.export.statsToPdf({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })

      if (result.success) {
        toaster.success({
          title: 'PDF сохранён',
          description: `Файл: ${result.filePath}`,
          closable: true,
        })
      } else {
        toaster.error({
          title: 'Ошибка экспорта',
          description: result.error,
          closable: true,
        })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось экспортировать',
        closable: true,
      })
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Сравнить два периода
   */
  const handleCompare = async () => {
    if (!startDate || !endDate || !startDate2 || !endDate2) {
      toaster.error({
        title: 'Заполните даты',
        description: 'Укажите оба периода для сравнения',
        closable: true,
      })
      return
    }

    if (typeof window === 'undefined' || !window.electronAPI?.database) {
      return
    }

    setIsComparing(true)
    try {
      const [stats1, stats2] = await Promise.all([
        window.electronAPI.database.getStatsForPeriod(startDate, endDate),
        window.electronAPI.database.getStatsForPeriod(startDate2, endDate2),
      ])
      setPeriod1Stats(stats1)
      setPeriod2Stats(stats2)
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось загрузить данные',
        closable: true,
      })
    } finally {
      setIsComparing(false)
    }
  }

  // Вычисляем дельты для сравнения
  const printedDelta = period1Stats && period2Stats
    ? calcDelta(period1Stats.totalPrinted, period2Stats.totalPrinted)
    : null
  const scannedDelta = period1Stats && period2Stats
    ? calcDelta(period1Stats.totalScanned, period2Stats.totalScanned)
    : null
  const duplicatesDelta = period1Stats && period2Stats
    ? calcDelta(period1Stats.duplicatesBlocked, period2Stats.duplicatesBlocked)
    : null

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <Box>
            <Heading size="2xl" mb={2}>
              Статистика
            </Heading>
            <Text color="fg.muted">Обзор активности печати</Text>
          </Box>
        </HStack>

        {/* Фильтры и экспорт */}
        <Card.Root>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <HStack justify="space-between" wrap="wrap" gap={4}>
                <HStack gap={4}>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>
                      {compareMode ? 'Период 1: начало' : 'Начало периода'}
                    </Text>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} w="160px" />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>
                      {compareMode ? 'Период 1: конец' : 'Конец периода'}
                    </Text>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} w="160px" />
                  </Box>
                </HStack>
                <HStack gap={4}>
                  <HStack gap={2}>
                    <Switch.Root
                      checked={compareMode}
                      onCheckedChange={(e) => {
                        setCompareMode(e.checked)
                        if (!e.checked) {
                          setPeriod1Stats(null)
                          setPeriod2Stats(null)
                        }
                      }}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                    <Text fontSize="sm">Сравнить</Text>
                  </HStack>
                  <Button colorPalette="blue" onClick={handleExportPdf} loading={isExporting}>
                    <LuFileText />
                    Экспорт в PDF
                  </Button>
                </HStack>
              </HStack>

              {/* Второй период (при включённом сравнении) */}
              {compareMode && (
                <HStack justify="space-between" wrap="wrap" gap={4}>
                  <HStack gap={4}>
                    <Box>
                      <Text fontSize="sm" color="fg.muted" mb={1}>
                        Период 2: начало
                      </Text>
                      <Input type="date" value={startDate2} onChange={(e) => setStartDate2(e.target.value)} w="160px" />
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted" mb={1}>
                        Период 2: конец
                      </Text>
                      <Input type="date" value={endDate2} onChange={(e) => setEndDate2(e.target.value)} w="160px" />
                    </Box>
                  </HStack>
                  <Button
                    colorPalette="green"
                    onClick={handleCompare}
                    loading={isComparing}
                    disabled={!startDate || !endDate || !startDate2 || !endDate2}
                  >
                    <LuTrendingUp />
                    Сравнить
                  </Button>
                </HStack>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Статистика */}
        {isLoading
          ? (
            <Card.Root>
              <Card.Body>
                <Text textAlign="center" color="fg.muted">
                  Загрузка статистики...
                </Text>
              </Card.Body>
            </Card.Root>
          )
          : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
              <MetricCard
                title="Всего напечатано"
                value={stats?.totalPrinted ?? 0}
                description="этикеток за всё время"
                icon={<LuPrinter />}
                colorScheme="blue"
              />

              <MetricCard
                title="Сегодня"
                value={stats?.todayPrinted ?? 0}
                description="этикеток напечатано"
                icon={<LuTrendingUp />}
                colorScheme="green"
              />

              <MetricCard
                title="Дубликаты"
                value={stats?.duplicatesBlocked ?? 0}
                description="заблокировано"
                icon={<LuBan />}
                colorScheme="orange"
              />

              <MetricCard
                title="Последняя печать"
                value={stats?.lastPrintTime ? new Date(stats.lastPrintTime).toLocaleTimeString('ru-RU') : '—'}
                description={stats?.lastPrintTime
                  ? new Date(stats.lastPrintTime).toLocaleDateString('ru-RU')
                  : 'нет данных'}
                icon={<LuCalendar />}
                colorScheme="purple"
              />
            </SimpleGrid>
          )}

        {/* Результаты сравнения периодов */}
        {compareMode && period1Stats && period2Stats && (
          <Card.Root>
            <Card.Header>
              <Heading size="md">Сравнение периодов</Heading>
            </Card.Header>
            <Card.Body>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
                {/* Напечатано */}
                <Box textAlign="center" p={4} borderRadius="lg" bg="bg.subtle">
                  <Text fontSize="sm" color="fg.muted" mb={2}>
                    Напечатано
                  </Text>
                  <HStack justify="center" gap={4}>
                    <VStack gap={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        {period1Stats.totalPrinted}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Период 1
                      </Text>
                    </VStack>
                    <Text fontSize="lg" color="fg.muted">
                      vs
                    </Text>
                    <VStack gap={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        {period2Stats.totalPrinted}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Период 2
                      </Text>
                    </VStack>
                  </HStack>
                  {printedDelta && (
                    <Badge
                      mt={2}
                      colorPalette={printedDelta.type === 'up'
                        ? 'green'
                        : printedDelta.type === 'down'
                        ? 'red'
                        : 'gray'}
                    >
                      {printedDelta.type === 'up' && <LuArrowUp />}
                      {printedDelta.type === 'down' && <LuArrowDown />}
                      {printedDelta.type === 'same' && <LuMinus />}
                      {printedDelta.value}%
                    </Badge>
                  )}
                </Box>

                {/* Отсканировано */}
                <Box textAlign="center" p={4} borderRadius="lg" bg="bg.subtle">
                  <Text fontSize="sm" color="fg.muted" mb={2}>
                    Отсканировано
                  </Text>
                  <HStack justify="center" gap={4}>
                    <VStack gap={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        {period1Stats.totalScanned}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Период 1
                      </Text>
                    </VStack>
                    <Text fontSize="lg" color="fg.muted">
                      vs
                    </Text>
                    <VStack gap={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        {period2Stats.totalScanned}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Период 2
                      </Text>
                    </VStack>
                  </HStack>
                  {scannedDelta && (
                    <Badge
                      mt={2}
                      colorPalette={scannedDelta.type === 'up'
                        ? 'green'
                        : scannedDelta.type === 'down'
                        ? 'red'
                        : 'gray'}
                    >
                      {scannedDelta.type === 'up' && <LuArrowUp />}
                      {scannedDelta.type === 'down' && <LuArrowDown />}
                      {scannedDelta.type === 'same' && <LuMinus />}
                      {scannedDelta.value}%
                    </Badge>
                  )}
                </Box>

                {/* Дубликаты */}
                <Box textAlign="center" p={4} borderRadius="lg" bg="bg.subtle">
                  <Text fontSize="sm" color="fg.muted" mb={2}>
                    Дубликаты
                  </Text>
                  <HStack justify="center" gap={4}>
                    <VStack gap={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        {period1Stats.duplicatesBlocked}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Период 1
                      </Text>
                    </VStack>
                    <Text fontSize="lg" color="fg.muted">
                      vs
                    </Text>
                    <VStack gap={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        {period2Stats.duplicatesBlocked}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Период 2
                      </Text>
                    </VStack>
                  </HStack>
                  {duplicatesDelta && (
                    <Badge
                      mt={2}
                      colorPalette={duplicatesDelta.type === 'down'
                        ? 'green'
                        : duplicatesDelta.type === 'up'
                        ? 'red'
                        : 'gray'}
                    >
                      {duplicatesDelta.type === 'up' && <LuArrowUp />}
                      {duplicatesDelta.type === 'down' && <LuArrowDown />}
                      {duplicatesDelta.type === 'same' && <LuMinus />}
                      {duplicatesDelta.value}%
                    </Badge>
                  )}
                </Box>
              </SimpleGrid>
            </Card.Body>
          </Card.Root>
        )}

        {/* График печати по дням — динамически загружается */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Печать за последние 7 дней</Heading>
          </Card.Header>
          <Card.Body>{isLoading ? <Skeleton height="300px" /> : <StatsChart dailyStats={dailyStats} />}</Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
