'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Heading,
  HStack,
  Icon,
  Progress,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useId, useState } from 'react'
import {
  LuCircleAlert,
  LuCircleCheck,
  LuFile,
  LuFileUp,
  LuPause,
  LuPlay,
  LuTrash2,
  LuUpload,
  LuX,
} from 'react-icons/lu'
import { toaster } from '../_components/ui/toaster'

// Состояние парсинга PDF
type PDFParseState = 'idle' | 'parsing' | 'done' | 'error'

// Состояние кода в очереди
interface QueueItem {
  id: string
  code: string
  status: 'pending' | 'printing' | 'done' | 'error'
  error?: string
  selected: boolean
}

// Состояние батч-печати
type BatchState = 'idle' | 'ready' | 'printing' | 'paused' | 'done'

/** Мемоизированная строка таблицы очереди — предотвращает лишние ререндеры */
const QueueItemRow = memo(function QueueItemRow({
  item,
  onToggleSelect,
  onRemove,
}: {
  item: QueueItem
  onToggleSelect: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <Table.Row
      bg={item.status === 'printing' ? 'blue.50' : undefined}
      _dark={{ bg: item.status === 'printing' ? 'blue.950' : undefined }}
    >
      <Table.Cell>
        <Checkbox.Root
          checked={item.selected}
          onCheckedChange={() => onToggleSelect(item.id)}
          disabled={item.status !== 'pending'}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
        </Checkbox.Root>
      </Table.Cell>
      <Table.Cell>
        <Text fontFamily="mono" fontSize="sm" wordBreak="break-all">
          {item.code}
        </Text>
        {item.error && (
          <Text fontSize="xs" color="red.500">
            {item.error}
          </Text>
        )}
      </Table.Cell>
      <Table.Cell>
        {item.status === 'pending' && <Badge colorPalette="gray">Ожидает</Badge>}
        {item.status === 'printing' && (
          <Badge colorPalette="blue">
            <LuFileUp />
            Печать...
          </Badge>
        )}
        {item.status === 'done' && (
          <Badge colorPalette="green">
            <LuCircleCheck />
            Готово
          </Badge>
        )}
        {item.status === 'error' && (
          <Badge colorPalette="red">
            <LuCircleAlert />
            Ошибка
          </Badge>
        )}
      </Table.Cell>
      <Table.Cell>
        {item.status === 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            colorPalette="red"
            onClick={() => onRemove(item.id)}
          >
            <LuX />
          </Button>
        )}
      </Table.Cell>
    </Table.Row>
  )
})

export default function BatchPage() {
  const fileInputId = useId()
  const [items, setItems] = useState<QueueItem[]>([])
  const [batchState, setBatchState] = useState<BatchState>('idle')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [pdfParseState, setPdfParseState] = useState<PDFParseState>('idle')

  // Статистика
  const total = items.length
  const printed = items.filter((i) => i.status === 'done').length
  const errors = items.filter((i) => i.status === 'error').length
  const selected = items.filter((i) => i.selected).length

  // Добавление кодов в очередь
  const addCodesToQueue = useCallback((codes: string[], source: string) => {
    const newItems: QueueItem[] = codes.map((code, index) => ({
      id: `${Date.now()}-${index}`,
      code,
      status: 'pending',
      selected: true,
    }))

    setItems((prev) => [...prev, ...newItems])
    setBatchState('ready')
    toaster.success({
      title: 'Файл загружен',
      description: `Добавлено ${newItems.length} кодов из ${source}`,
      closable: true,
    })
  }, [])

  // Парсинг текстового файла (CSV/TXT)
  const parseTextFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (!text) {
          return
        }

        // Разбиваем на строки и фильтруем пустые
        const lines = text
          .split(/[\r\n]+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)

        // Для CSV берём первую колонку
        const codes = lines.map((line) => {
          if (line.includes(',') || line.includes(';')) {
            return line.split(/[,;]/)[0].trim()
          }
          return line
        })

        addCodesToQueue(codes, file.name)
      }
      reader.readAsText(file)
    },
    [addCodesToQueue],
  )

  // Парсинг PDF файла (извлечение DataMatrix кодов)
  const parsePDFFile = useCallback(
    async (file: File) => {
      // Проверяем наличие Electron API
      if (typeof window === 'undefined' || !window.electronAPI?.pdf) {
        toaster.error({
          title: 'Недоступно',
          description: 'Парсинг PDF доступен только в desktop приложении',
          closable: true,
        })
        return
      }

      setPdfParseState('parsing')
      toaster.info({
        title: 'Обработка PDF',
        description: `Сканирование ${file.name}...`,
        closable: true,
      })

      try {
        // Читаем файл как base64
        const buffer = await file.arrayBuffer()
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))

        // Парсим через Electron API
        const result = await window.electronAPI.pdf.parseBase64(base64)

        if (result.success && result.data) {
          const { codes, totalPages, foundCount, errors: parseErrors } = result.data

          if (codes.length > 0) {
            addCodesToQueue(codes, file.name)
            setPdfParseState('done')

            if (parseErrors.length > 0) {
              toaster.warning({
                title: 'Частичный успех',
                description: `Найдено ${foundCount} кодов из ${totalPages} страниц. Ошибок: ${parseErrors.length}`,
                closable: true,
              })
            }
          } else {
            setPdfParseState('error')
            toaster.error({
              title: 'Коды не найдены',
              description: `В PDF (${totalPages} стр.) не найдено DataMatrix кодов маркировки`,
              closable: true,
            })
          }
        } else {
          setPdfParseState('error')
          toaster.error({
            title: 'Ошибка парсинга PDF',
            description: result.error || 'Неизвестная ошибка',
            closable: true,
          })
        }
      } catch (error) {
        setPdfParseState('error')
        toaster.error({
          title: 'Ошибка чтения PDF',
          description: error instanceof Error ? error.message : String(error),
          closable: true,
        })
      }
    },
    [addCodesToQueue],
  )

  // Универсальный парсинг файла
  const parseFile = useCallback(
    (file: File) => {
      const ext = file.name.toLowerCase().split('.').pop()

      if (ext === 'pdf') {
        parsePDFFile(file)
      } else if (ext === 'csv' || ext === 'txt') {
        parseTextFile(file)
      } else {
        toaster.error({
          title: 'Неподдерживаемый формат',
          description: 'Поддерживаются PDF, CSV и TXT файлы',
          closable: true,
        })
      }
    },
    [parsePDFFile, parseTextFile],
  )

  // Обработка drag & drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        Array.from(files).forEach((file) => {
          parseFile(file)
        })
      }
    },
    [parseFile],
  )

  // Выбор файла через input
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        Array.from(files).forEach(parseFile)
      }
      e.target.value = '' // Сброс для повторного выбора того же файла
    },
    [parseFile],
  )

  // Печать одного элемента
  const printItem = async (item: QueueItem): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.electronAPI?.print) {
      // Dev режим — имитация печати
      await new Promise((resolve) => setTimeout(resolve, 500))
      return Math.random() > 0.1 // 90% успех
    }

    try {
      const result = await window.electronAPI.print.execute(item.code)
      return result.success
    } catch {
      return false
    }
  }

  // Запуск батч-печати
  const startPrinting = async () => {
    setBatchState('printing')
    const itemsToPrint = items.filter((i) => i.selected && i.status === 'pending')

    for (let i = 0; i < itemsToPrint.length; i++) {
      // Проверяем на паузу
      if (batchState === 'paused') {
        return
      }

      const item = itemsToPrint[i]
      setCurrentIndex(items.findIndex((x) => x.id === item.id))

      // Обновляем статус на "печатается"
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'printing' } : x)))

      // Печатаем
      const success = await printItem(item)

      // Обновляем статус
      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id
            ? { ...x, status: success ? 'done' : 'error', error: success ? undefined : 'Ошибка печати' }
            : x
        )
      )
    }

    setBatchState('done')
    toaster.success({
      title: 'Печать завершена',
      description: `Напечатано: ${printed + itemsToPrint.filter((i) => i.status !== 'error').length}`,
      closable: true,
    })
  }

  // Пауза
  const pausePrinting = () => {
    setBatchState('paused')
  }

  // Продолжение
  const resumePrinting = () => {
    startPrinting()
  }

  // Очистка списка
  const clearList = () => {
    setItems([])
    setBatchState('idle')
    setCurrentIndex(0)
  }

  // Удаление элемента
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  // Выбор/снятие выбора
  const toggleSelect = (id: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, selected: !x.selected } : x)))
  }

  // Выбрать все / снять все
  const toggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected)
    setItems((prev) => prev.map((x) => ({ ...x, selected: !allSelected })))
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="2xl" mb={2}>
            Пакетная печать
          </Heading>
          <Text color="fg.muted">Загрузите файл с кодами маркировки для массовой печати</Text>
        </Box>

        {/* Зона загрузки */}
        <Card.Root
          borderStyle="dashed"
          borderWidth={2}
          borderColor={dragActive ? 'blue.500' : 'border.subtle'}
          bg={dragActive ? 'blue.50' : 'transparent'}
          _dark={{ bg: dragActive ? 'blue.950' : 'transparent' }}
          transition="all 0.2s"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Card.Body py={12}>
            <VStack gap={4}>
              <Icon fontSize="4xl" color={dragActive ? 'blue.500' : 'fg.muted'}>
                <LuUpload />
              </Icon>
              <VStack gap={1}>
                <Text fontWeight="medium">
                  Перетащите файл сюда или{' '}
                  <Text asChild color="blue.500" cursor="pointer" _hover={{ textDecoration: 'underline' }}>
                    <label htmlFor={fileInputId}>выберите файл</label>
                  </Text>
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv,.txt,.pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Поддерживаются PDF (DataMatrix), CSV и TXT файлы
                </Text>
                {pdfParseState === 'parsing' && (
                  <Badge colorPalette="blue" mt={2}>
                    <LuFile />
                    Сканирование PDF...
                  </Badge>
                )}
              </VStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Статистика и управление */}
        {items.length > 0 && (
          <Card.Root>
            <Card.Body>
              <HStack justify="space-between" wrap="wrap" gap={4}>
                {/* Статистика */}
                <HStack gap={6}>
                  <VStack gap={0} align="start">
                    <Text fontSize="2xl" fontWeight="bold">
                      {total}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      Всего
                    </Text>
                  </VStack>
                  <VStack gap={0} align="start">
                    <Text fontSize="2xl" fontWeight="bold" color="green.500">
                      {printed}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      Напечатано
                    </Text>
                  </VStack>
                  {errors > 0 && (
                    <VStack gap={0} align="start">
                      <Text fontSize="2xl" fontWeight="bold" color="red.500">
                        {errors}
                      </Text>
                      <Text fontSize="sm" color="fg.muted">
                        Ошибок
                      </Text>
                    </VStack>
                  )}
                  <VStack gap={0} align="start">
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {selected}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      Выбрано
                    </Text>
                  </VStack>
                </HStack>

                {/* Кнопки управления */}
                <HStack gap={2}>
                  {batchState === 'idle' || batchState === 'ready' || batchState === 'done'
                    ? (
                      <Button
                        colorPalette="blue"
                        onClick={startPrinting}
                        disabled={selected === 0 || items.every((i) => i.status !== 'pending')}
                      >
                        <LuPlay />
                        Начать печать ({selected})
                      </Button>
                    )
                    : batchState === 'printing'
                    ? (
                      <Button colorPalette="yellow" onClick={pausePrinting}>
                        <LuPause />
                        Пауза
                      </Button>
                    )
                    : (
                      <Button colorPalette="blue" onClick={resumePrinting}>
                        <LuPlay />
                        Продолжить
                      </Button>
                    )}
                  <Button variant="outline" colorPalette="red" onClick={clearList}>
                    <LuTrash2 />
                    Очистить
                  </Button>
                </HStack>
              </HStack>

              {/* Прогресс */}
              {batchState === 'printing' && (
                <Box mt={4}>
                  <Progress.Root value={(printed / total) * 100} size="sm" colorPalette="blue">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  <Text fontSize="sm" color="fg.muted" mt={1}>
                    Печать {currentIndex + 1} из {total}...
                  </Text>
                </Box>
              )}
            </Card.Body>
          </Card.Root>
        )}

        {/* Таблица кодов */}
        {items.length > 0 && (
          <Card.Root>
            <Card.Body p={0}>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader width="50px">
                      <Checkbox.Root checked={items.every((i) => i.selected)} onCheckedChange={toggleSelectAll}>
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>Код маркировки</Table.ColumnHeader>
                    <Table.ColumnHeader width="120px">Статус</Table.ColumnHeader>
                    <Table.ColumnHeader width="60px"></Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {items.map((item) => (
                    <QueueItemRow key={item.id} item={item} onToggleSelect={toggleSelect} onRemove={removeItem} />
                  ))}
                </Table.Body>
              </Table.Root>
            </Card.Body>
          </Card.Root>
        )}

        {/* Пустое состояние */}
        {items.length === 0 && (
          <Card.Root>
            <Card.Body py={12}>
              <VStack gap={4}>
                <Icon fontSize="4xl" color="fg.muted">
                  <LuFileUp />
                </Icon>
                <Text color="fg.muted">Загрузите файл с кодами для начала работы</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Container>
  )
}
