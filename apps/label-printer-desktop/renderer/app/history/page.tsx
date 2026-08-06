'use client'

import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Container,
  Heading,
  HStack,
  IconButton,
  Input,
  Pagination,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuDownload, LuRefreshCw, LuSearch, LuTrash2, LuX } from 'react-icons/lu'
import { useFindManyPrintJob } from '../../lib/hooks'
import { AppEmptyState } from '../_components/ui/empty-state'
import { toaster } from '../_components/ui/toaster'

// Количество записей на странице
const PAGE_SIZE = 20

interface PrintJob {
  id: string
  gtin: string
  serialNumber: string
  scanCount: number
  printed: boolean
  firstScannedAt: Date | string
  lastScannedAt: Date | string
}

/** Мемоизированная строка таблицы истории — предотвращает лишние ререндеры при скролле */
const PrintJobRow = memo(function PrintJobRow({
  job,
  isSelected,
  onToggleSelection,
}: {
  job: PrintJob
  isSelected: boolean
  onToggleSelection: (id: string) => void
}) {
  return (
    <Table.Row bg={isSelected ? 'blue.subtle' : undefined}>
      <Table.Cell>
        <Checkbox.Root checked={isSelected} onCheckedChange={() => onToggleSelection(job.id)}>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
        </Checkbox.Root>
      </Table.Cell>
      <Table.Cell fontFamily="mono" fontSize="sm">
        {job.gtin}
      </Table.Cell>
      <Table.Cell fontFamily="mono" fontSize="sm">
        {job.serialNumber}
      </Table.Cell>
      <Table.Cell>
        <Badge colorPalette={job.scanCount > 1 ? 'yellow' : 'gray'}>{job.scanCount}</Badge>
      </Table.Cell>
      <Table.Cell>
        <Badge colorPalette={job.printed ? 'green' : 'gray'}>{job.printed ? 'Напечатано' : 'Не напечатано'}</Badge>
      </Table.Cell>
      <Table.Cell fontSize="sm" color="fg.muted">
        {new Date(job.firstScannedAt).toLocaleString('ru-RU')}
      </Table.Cell>
      <Table.Cell fontSize="sm" color="fg.muted">
        {new Date(job.lastScannedAt).toLocaleString('ru-RU')}
      </Table.Cell>
    </Table.Row>
  )
})

export default function HistoryPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Формируем фильтр для запроса
  const where = useMemo(() => {
    const conditions: Record<string, unknown>[] = []

    // Фильтр по дате
    if (startDate) {
      conditions.push({ lastScannedAt: { gte: new Date(startDate) } })
    }
    if (endDate) {
      // Добавляем 1 день чтобы включить весь день
      const endDateTime = new Date(endDate)
      endDateTime.setDate(endDateTime.getDate() + 1)
      conditions.push({ lastScannedAt: { lt: endDateTime } })
    }

    // Фильтр по поиску (GTIN или серийный номер)
    if (searchQuery.trim()) {
      conditions.push({
        OR: [{ gtin: { contains: searchQuery.trim() } }, { serialNumber: { contains: searchQuery.trim() } }],
      })
    }

    return conditions.length > 0 ? { AND: conditions } : undefined
  }, [startDate, endDate, searchQuery])

  // Запрос с фильтрацией и пагинацией
  const {
    data: printJobs,
    isLoading,
    refetch,
  } = useFindManyPrintJob({
    where,
    orderBy: { lastScannedAt: 'desc' },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  })

  // Подсчёт общего количества для пагинации
  // Для простоты будем считать что если вернулось PAGE_SIZE записей — есть ещё страницы
  const hasNextPage = printJobs?.length === PAGE_SIZE
  const hasPrevPage = page > 1

  // Экспорт в Excel
  const handleExportExcel = async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.export) {
      toaster.error({ title: 'Экспорт недоступен', description: 'Требуется Electron', closable: true })
      return
    }

    setIsExporting(true)
    try {
      const result = await window.electronAPI.export.historyToExcel({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })

      if (result.success) {
        toaster.success({
          title: 'Экспорт завершён',
          description: `Файл сохранён: ${result.filePath}`,
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

  // Сброс фильтров
  const handleResetFilters = () => {
    setStartDate('')
    setEndDate('')
    setSearchQuery('')
    setPage(1)
  }

  // При изменении фильтров сбрасываем на первую страницу
  const handleDateChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setPage(1)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  const hasFilters = startDate || endDate || searchQuery

  // Выбор/снятие выбора одной записи — useCallback предотвращает ререндеры memo-компонентов
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Выбрать/снять все на текущей странице
  const toggleSelectAll = () => {
    if (!printJobs) {
      return
    }
    const allSelected = printJobs.every((job) => selectedIds.has(job.id))
    if (allSelected) {
      // Снять выбор со всех на текущей странице
      setSelectedIds((prev) => {
        const next = new Set(prev)
        printJobs.forEach((job) => next.delete(job.id))
        return next
      })
    } else {
      // Выбрать все на текущей странице
      setSelectedIds((prev) => {
        const next = new Set(prev)
        printJobs.forEach((job) => next.add(job.id))
        return next
      })
    }
  }

  // Удаление выбранных записей
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      return
    }
    if (!confirm(`Удалить ${selectedIds.size} записей? Это действие нельзя отменить.`)) {
      return
    }

    setIsDeleting(true)
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.database) {
        const result = await window.electronAPI.database.deleteJobs(Array.from(selectedIds))
        if (result.success) {
          toaster.success({
            title: 'Записи удалены',
            description: `Удалено ${result.deletedCount} записей`,
            closable: true,
          })
          setSelectedIds(new Set())
          refetch()
        } else {
          toaster.error({
            title: 'Ошибка удаления',
            description: result.error,
            closable: true,
          })
        }
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить',
        closable: true,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Проверка, все ли на текущей странице выбраны
  const allPageSelected = printJobs && printJobs.length > 0 && printJobs.every((job) => selectedIds.has(job.id))
  const somePageSelected = printJobs && printJobs.some((job) => selectedIds.has(job.id))

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <Box>
            <Heading size="2xl" mb={2}>
              История печати
            </Heading>
            <Text color="fg.muted">Список напечатанных этикеток</Text>
          </Box>
          <HStack gap={2}>
            <Button onClick={() => refetch()} variant="outline">
              <LuRefreshCw />
              Обновить
            </Button>
          </HStack>
        </HStack>

        {/* Фильтры и экспорт */}
        <Card.Root>
          <Card.Body>
            <VStack gap={4} align="stretch">
              {/* Поиск */}
              <HStack gap={4}>
                <Box flex={1} position="relative">
                  <Input
                    placeholder="Поиск по GTIN или серийному номеру..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    pl={10}
                  />
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted">
                    <LuSearch />
                  </Box>
                </Box>
              </HStack>

              {/* Даты и кнопки */}
              <HStack justify="space-between" wrap="wrap" gap={4}>
                <HStack gap={4}>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>
                      Начало периода
                    </Text>
                    <Input type="date" value={startDate} onChange={handleDateChange(setStartDate)} w="180px" />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>
                      Конец периода
                    </Text>
                    <Input type="date" value={endDate} onChange={handleDateChange(setEndDate)} w="180px" />
                  </Box>
                  {hasFilters && (
                    <Button variant="ghost" onClick={handleResetFilters} alignSelf="flex-end">
                      <LuX />
                      Сбросить
                    </Button>
                  )}
                </HStack>
                <Button
                  colorPalette="green"
                  onClick={handleExportExcel}
                  loading={isExporting}
                  disabled={!printJobs?.length}
                >
                  <LuDownload />
                  Экспорт в Excel
                </Button>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Панель массовых действий */}
        {selectedIds.size > 0 && (
          <Card.Root bg="blue.subtle">
            <Card.Body py={3}>
              <HStack justify="space-between">
                <Text fontWeight="medium">Выбрано: {selectedIds.size}</Text>
                <HStack gap={2}>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                    Снять выделение
                  </Button>
                  <Button size="sm" colorPalette="red" onClick={handleDeleteSelected} loading={isDeleting}>
                    <LuTrash2 />
                    Удалить выбранные
                  </Button>
                </HStack>
              </HStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Таблица */}
        <Card.Root>
          <Card.Body p={0}>
            {isLoading
              ? (
                <Box p={8} textAlign="center">
                  <Text color="fg.muted">Загрузка...</Text>
                </Box>
              )
              : !printJobs?.length
              ? (
                <Box py={12}>
                  {hasFilters
                    ? (
                      <AppEmptyState
                        type="history"
                        action={{
                          label: 'Сбросить фильтры',
                          onClick: handleResetFilters,
                        }}
                      />
                    )
                    : <AppEmptyState type="history" />}
                </Box>
              )
              : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader w="40px">
                        <Checkbox.Root
                          checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                          onCheckedChange={toggleSelectAll}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>GTIN</Table.ColumnHeader>
                      <Table.ColumnHeader>Серийный номер</Table.ColumnHeader>
                      <Table.ColumnHeader>Сканирований</Table.ColumnHeader>
                      <Table.ColumnHeader>Статус</Table.ColumnHeader>
                      <Table.ColumnHeader>Первое сканирование</Table.ColumnHeader>
                      <Table.ColumnHeader>Последнее</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {printJobs.map((job) => (
                      <PrintJobRow
                        key={job.id}
                        job={job}
                        isSelected={selectedIds.has(job.id)}
                        onToggleSelection={toggleSelection}
                      />
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
          </Card.Body>
        </Card.Root>

        {/* Пагинация */}
        {printJobs && printJobs.length > 0 && (
          <HStack justify="center">
            <Pagination.Root
              count={hasNextPage ? (page + 1) * PAGE_SIZE : page * PAGE_SIZE}
              pageSize={PAGE_SIZE}
              page={page}
              onPageChange={(e) => setPage(e.page)}
            >
              <ButtonGroup variant="ghost" size="sm">
                <Pagination.PrevTrigger asChild>
                  <IconButton disabled={!hasPrevPage}>
                    <LuChevronLeft />
                  </IconButton>
                </Pagination.PrevTrigger>

                <Pagination.PageText format="short" />

                <Pagination.NextTrigger asChild>
                  <IconButton disabled={!hasNextPage}>
                    <LuChevronRight />
                  </IconButton>
                </Pagination.NextTrigger>
              </ButtonGroup>
            </Pagination.Root>
          </HStack>
        )}
      </VStack>
    </Container>
  )
}
