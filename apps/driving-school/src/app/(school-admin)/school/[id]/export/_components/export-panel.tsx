'use client'

import type { ExportDataType, ExportFormat } from '@/lib/excel'
import {
  Box,
  Button,
  Card,
  createListCollection,
  Fieldset,
  Heading,
  HStack,
  Icon,
  Input,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { LuCalendar, LuChartBar, LuDownload, LuFileSpreadsheet, LuGraduationCap, LuUserCog } from 'react-icons/lu'

interface ExportPanelProps {
  schoolId: string
  schoolName: string
  stats: {
    studentCount: number
    instructorCount: number
    lessonCount: number
  }
  instructors: Array<{ id: string; name: string }>
}

// Типы данных для экспорта
const dataTypes: Array<{
  value: ExportDataType
  label: string
  description: string
  icon: typeof LuGraduationCap
  count?: number
}> = [
  {
    value: 'students',
    label: 'Ученики',
    description: 'ФИО, email, телефон, категория',
    icon: LuGraduationCap,
  },
  {
    value: 'instructors',
    label: 'Инструкторы',
    description: 'ФИО, email, категории, описание',
    icon: LuUserCog,
  },
  {
    value: 'lessons',
    label: 'Занятия',
    description: 'Дата, ученик, инструктор, статус',
    icon: LuCalendar,
  },
  {
    value: 'stats',
    label: 'Статистика',
    description: 'Сводка по занятиям и посещаемости',
    icon: LuChartBar,
  },
]

// Форматы экспорта
const formats: Array<{ value: ExportFormat; label: string; description: string }> = [
  { value: 'xlsx', label: 'Excel (.xlsx)', description: 'Microsoft Excel' },
  { value: 'ods', label: 'LibreOffice (.ods)', description: 'OpenDocument' },
  { value: 'csv', label: 'CSV (.csv)', description: 'Универсальный формат' },
]

// Коллекции для Select
const formatCollection = createListCollection({
  items: formats.map((f) => ({ label: f.label, value: f.value })),
})

export function ExportPanel({ schoolId, schoolName, stats, instructors }: ExportPanelProps) {
  const [selectedType, setSelectedType] = useState<ExportDataType | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx')
  const [isDownloading, setIsDownloading] = useState(false)

  // Фильтры для занятий
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedInstructor, setSelectedInstructor] = useState<string>('')

  const instructorCollection = createListCollection({
    items: [{ label: 'Все инструкторы', value: '' }, ...instructors.map((i) => ({ label: i.name, value: i.id }))],
  })

  // Обработчик скачивания
  const handleDownload = async () => {
    if (!selectedType) {
      return
    }

    setIsDownloading(true)

    try {
      // Формируем URL с параметрами
      const params = new URLSearchParams({
        type: selectedType,
        format: selectedFormat,
        schoolId,
      })

      // Добавляем фильтры для занятий
      if (selectedType === 'lessons') {
        if (dateFrom) {
          params.set('dateFrom', dateFrom)
        }
        if (dateTo) {
          params.set('dateTo', dateTo)
        }
        if (selectedInstructor) {
          params.set('instructorId', selectedInstructor)
        }
      }

      const response = await fetch(`/api/export?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка экспорта')
      }

      // Получаем имя файла из заголовка
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `export.${selectedFormat}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (match) {
          filename = decodeURIComponent(match[1].replace(/['"]/g, ''))
        }
      }

      // Скачиваем файл
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Ошибка экспорта:', error)
      // Можно добавить toast с ошибкой
    } finally {
      setIsDownloading(false)
    }
  }

  // Добавляем количество записей к типам
  const dataTypesWithCounts = dataTypes.map((type) => {
    switch (type.value) {
      case 'students':
        return { ...type, count: stats.studentCount }
      case 'instructors':
        return { ...type, count: stats.instructorCount }
      case 'lessons':
        return { ...type, count: stats.lessonCount }
      default:
        return type
    }
  })

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <Box>
        <Heading size="lg" mb={2}>
          Экспорт данных
        </Heading>
        <Text color="fg.muted">Выгрузите данные школы «{schoolName}» в удобном формате</Text>
      </Box>

      {/* Шаг 1: Выбор типа данных */}
      <Fieldset.Root>
        <Fieldset.Legend fontWeight="semibold" mb={3}>
          1. Выберите тип данных
        </Fieldset.Legend>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {dataTypesWithCounts.map((type) => (
            <Card.Root
              key={type.value}
              cursor="pointer"
              onClick={() => setSelectedType(type.value)}
              borderWidth="2px"
              borderColor={selectedType === type.value ? 'fg.DEFAULT' : 'border'}
              bg={selectedType === type.value ? 'fg.subtle/10' : 'bg.panel'}
              _hover={{ borderColor: 'fg.DEFAULT', bg: 'fg.subtle/5' }}
              transition="all 0.2s"
            >
              <Card.Body>
                <HStack gap={4}>
                  <Icon boxSize={8} color={selectedType === type.value ? 'fg.DEFAULT' : 'fg.muted'}>
                    <type.icon />
                  </Icon>
                  <Box flex={1}>
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">{type.label}</Text>
                      {type.count !== undefined && (
                        <Text color="fg.muted" fontSize="sm">
                          {type.count} записей
                        </Text>
                      )}
                    </HStack>
                    <Text color="fg.muted" fontSize="sm">
                      {type.description}
                    </Text>
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      </Fieldset.Root>

      {/* Шаг 2: Фильтры для занятий */}
      {selectedType === 'lessons' && (
        <Fieldset.Root>
          <Fieldset.Legend fontWeight="semibold" mb={3}>
            2. Фильтры (необязательно)
          </Fieldset.Legend>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Дата от
              </Text>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Дата до
              </Text>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Инструктор
              </Text>
              <SelectRoot
                collection={instructorCollection}
                value={selectedInstructor ? [selectedInstructor] : []}
                onValueChange={(e) => setSelectedInstructor(e.value[0] || '')}
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Все инструкторы" />
                </SelectTrigger>
                <SelectContent>
                  {instructorCollection.items.map((item) => (
                    <SelectItem key={item.value} item={item}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Box>
          </SimpleGrid>
        </Fieldset.Root>
      )}

      {/* Шаг 3: Выбор формата */}
      <Fieldset.Root>
        <Fieldset.Legend fontWeight="semibold" mb={3}>
          {selectedType === 'lessons' ? '3. Выберите формат' : '2. Выберите формат'}
        </Fieldset.Legend>
        <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
          <Box flex={1} maxW={{ md: '300px' }}>
            <SelectRoot
              collection={formatCollection}
              value={[selectedFormat]}
              onValueChange={(e) => setSelectedFormat((e.value[0] as ExportFormat) || 'xlsx')}
            >
              <SelectLabel srOnly>Формат файла</SelectLabel>
              <SelectTrigger>
                <SelectValueText placeholder="Выберите формат" />
              </SelectTrigger>
              <SelectContent>
                {formatCollection.items.map((item) => (
                  <SelectItem key={item.value} item={item}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </Box>
          <Text color="fg.muted" fontSize="sm" alignSelf="center">
            {formats.find((f) => f.value === selectedFormat)?.description}
          </Text>
        </Stack>
      </Fieldset.Root>

      {/* Кнопка скачивания */}
      <Box pt={4}>
        <Button
          colorPalette="brand"
          size="lg"
          onClick={handleDownload}
          disabled={!selectedType}
          loading={isDownloading}
          loadingText="Экспорт..."
        >
          <Icon>{isDownloading ? <LuFileSpreadsheet /> : <LuDownload />}</Icon>
          Скачать файл
        </Button>
      </Box>
    </VStack>
  )
}
