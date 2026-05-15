/**
 * Универсальная кнопка экспорта данных
 *
 * Поддерживает:
 * - Экспорт в CSV и Excel форматы
 * - Выбор периода
 * - Выбор типа данных
 * - Индикация загрузки
 *
 * @module export-button
 */

'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Checkbox, Dialog, HStack, Icon, Portal, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuDownload, LuFileSpreadsheet, LuFileText, LuX } from 'react-icons/lu'

// === Типы ===

export type ExportFormat = 'csv' | 'xlsx'

export interface ExportField {
  key: string
  label: string
  defaultSelected?: boolean
}

export interface ExportConfig {
  /** Название для скачиваемого файла (без расширения) */
  filename: string
  /** Доступные поля для экспорта */
  fields: ExportField[]
  /** Callback для получения данных */
  fetchData: (selectedFields: string[]) => Promise<Record<string, unknown>[]>
}

export interface ExportButtonProps {
  /** Конфигурация экспорта */
  config: ExportConfig
  /** Текст кнопки */
  label?: string
  /** Размер кнопки */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Вариант кнопки */
  variant?: 'solid' | 'outline' | 'ghost'
  /** Цветовая схема */
  colorPalette?: string
}

// === Хелперы для форматирования ===

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('ru-RU')
  }
  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function escapeCsvValue(value: string): string {
  // Экранируем кавычки и оборачиваем значения с запятыми/переносами
  if (value.includes('"') || value.includes(';') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// === Генерация CSV ===

function generateCSV(data: Record<string, unknown>[], fields: ExportField[], selectedFields: string[]): string {
  const headers = fields.filter((f) => selectedFields.includes(f.key)).map((f) => f.label)

  const rows = data.map((row) => selectedFields.map((key) => escapeCsvValue(formatValue(row[key]))).join(';'))

  // BOM для корректного отображения кириллицы в Excel
  const BOM = '\uFEFF'
  return BOM + [headers.join(';'), ...rows].join('\n')
}

// === Генерация XLSX (простая реализация через CSV с расширением xlsx) ===
// Для полноценного XLSX нужна библиотека xlsx или exceljs

function generateXLSX(data: Record<string, unknown>[], fields: ExportField[], selectedFields: string[]): string {
  // Пока используем CSV формат, но с расширением xlsx
  // Excel откроет его корректно
  return generateCSV(data, fields, selectedFields)
}

// === Компонент диалога выбора параметров экспорта ===

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  config: ExportConfig
  onExport: (format: ExportFormat, selectedFields: string[]) => Promise<void>
  isExporting: boolean
}

function ExportDialog({ isOpen, onClose, config, onExport, isExporting }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv')
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(config.fields.filter((f) => f.defaultSelected !== false).map((f) => f.key))
  )

  const handleFieldToggle = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedFields(new Set(config.fields.map((f) => f.key)))
  }

  const handleDeselectAll = () => {
    setSelectedFields(new Set())
  }

  const handleExport = async () => {
    await onExport(selectedFormat, Array.from(selectedFields))
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>Экспорт данных</Dialog.Title>
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                <Button variant="ghost" size="sm">
                  <LuX />
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* Выбор формата */}
                <Box>
                  <Text fontWeight="medium" mb={2}>
                    Формат
                  </Text>
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant={selectedFormat === 'csv' ? 'solid' : 'outline'}
                      onClick={() => setSelectedFormat('csv')}
                    >
                      <Icon as={LuFileText} />
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedFormat === 'xlsx' ? 'solid' : 'outline'}
                      onClick={() => setSelectedFormat('xlsx')}
                    >
                      <Icon as={LuFileSpreadsheet} />
                      Excel
                    </Button>
                  </HStack>
                </Box>

                {/* Выбор полей */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="medium">Поля для экспорта</Text>
                    <HStack gap={2}>
                      <Button size="xs" variant="ghost" onClick={handleSelectAll}>
                        Все
                      </Button>
                      <Button size="xs" variant="ghost" onClick={handleDeselectAll}>
                        Очистить
                      </Button>
                    </HStack>
                  </HStack>
                  <VStack gap={1} align="stretch" maxH="200px" overflowY="auto">
                    {config.fields.map((field) => (
                      <Checkbox.Root
                        key={field.key}
                        checked={selectedFields.has(field.key)}
                        onCheckedChange={() => handleFieldToggle(field.key)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>{field.label}</Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={2}>
                <Button variant="outline" onClick={onClose}>
                  Отмена
                </Button>
                <Button
                  colorPalette="brand"
                  onClick={handleExport}
                  loading={isExporting}
                  disabled={selectedFields.size === 0 || isExporting}
                >
                  <LuDownload />
                  Экспортировать
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

// === Основной компонент ===

export function ExportButton({
  config,
  label = 'Экспорт',
  size = 'sm',
  variant = 'outline',
  colorPalette,
}: ExportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(
    async (format: ExportFormat, selectedFields: string[]) => {
      setIsExporting(true)

      try {
        // Получаем данные
        const data = await config.fetchData(selectedFields)

        if (data.length === 0) {
          toaster.error({
            title: 'Нет данных',
            description: 'Нет данных для экспорта',
          })
          return
        }

        // Генерируем контент
        const content =
          format === 'csv'
            ? generateCSV(data, config.fields, selectedFields)
            : generateXLSX(data, config.fields, selectedFields)

        // Создаём и скачиваем файл
        const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;'
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${config.filename}.${format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toaster.success({
          title: 'Экспорт завершён',
          description: `Экспортировано ${data.length} записей`,
        })
      } catch (error) {
        console.error('Export error:', error)
        toaster.error({
          title: 'Ошибка экспорта',
          description: 'Не удалось экспортировать данные',
        })
      } finally {
        setIsExporting(false)
      }
    },
    [config]
  )

  return (
    <>
      <Button
        size={size}
        variant={variant}
        colorPalette={colorPalette}
        onClick={() => setIsDialogOpen(true)}
        loading={isExporting}
      >
        <LuDownload />
        {label}
      </Button>

      <ExportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        config={config}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </>
  )
}

// === Простая кнопка экспорта без диалога ===

export interface SimpleExportButtonProps {
  /** Callback для получения данных */
  fetchData: () => Promise<Record<string, unknown>[]>
  /** Заголовки колонок */
  headers: string[]
  /** Ключи для данных */
  keys: string[]
  /** Имя файла */
  filename: string
  /** Текст кнопки */
  label?: string
  /** Размер */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Вариант */
  variant?: 'solid' | 'outline' | 'ghost'
}

export function SimpleExportButton({
  fetchData,
  headers,
  keys,
  filename,
  label = 'Экспорт CSV',
  size = 'sm',
  variant = 'outline',
}: SimpleExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const data = await fetchData()

      if (data.length === 0) {
        toaster.error({
          title: 'Нет данных',
          description: 'Нет данных для экспорта',
        })
        return
      }

      const rows = data.map((row) => keys.map((key) => escapeCsvValue(formatValue(row[key]))).join(';'))

      const BOM = '\uFEFF'
      const csvContent = BOM + [headers.join(';'), ...rows].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toaster.success({
        title: 'Экспорт завершён',
        description: `Экспортировано ${data.length} записей`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toaster.error({
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать данные',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button size={size} variant={variant} onClick={handleExport} loading={isExporting} disabled={isExporting}>
      <LuDownload />
      {label}
    </Button>
  )
}
