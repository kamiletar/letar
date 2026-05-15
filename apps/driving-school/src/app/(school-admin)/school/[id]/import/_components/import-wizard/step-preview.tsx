'use client'

import { Box, Button, Checkbox, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'

import { DataPreview } from '../data-preview'
import type { ColumnMapping, ImportOptions, ImportRow, ParsedRow, SystemField } from './types'

interface StepPreviewProps {
  parsedRows: ParsedRow<ImportRow>[]
  systemFields: SystemField[]
  mapping: ColumnMapping[]
  options: ImportOptions
  onOptionsChange: (options: ImportOptions) => void
  onImport: () => void
  onBack: () => void
  isPending: boolean
}

/**
 * Шаг 4: Предпросмотр и опции.
 */
export function StepPreview({
  parsedRows,
  systemFields,
  mapping,
  options,
  onOptionsChange,
  onImport,
  onBack,
  isPending,
}: StepPreviewProps) {
  return (
    <VStack align="stretch" gap={6}>
      <VStack align="start" gap={2}>
        <Heading size="lg">Проверьте данные</Heading>
        <Text color="fg.muted">Просмотрите данные перед импортом и настройте параметры</Text>
      </VStack>

      <DataPreview rows={parsedRows} systemFields={systemFields} mapping={mapping} />

      <Box p={4} bg="bg.muted" borderRadius="lg">
        <VStack align="stretch" gap={3}>
          <Text fontWeight="medium">Параметры импорта</Text>

          <Checkbox.Root
            checked={options.updateExisting}
            onCheckedChange={(e) => onOptionsChange({ ...options, updateExisting: !!e.checked })}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>Обновлять существующие записи (по email)</Checkbox.Label>
          </Checkbox.Root>

          <Checkbox.Root
            checked={options.skipErrors}
            onCheckedChange={(e) => onOptionsChange({ ...options, skipErrors: !!e.checked })}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>Пропускать строки с ошибками</Checkbox.Label>
          </Checkbox.Root>
        </VStack>
      </Box>

      <HStack justify="space-between">
        <Button variant="ghost" onClick={onBack}>
          Назад
        </Button>
        <Button colorPalette="brand" onClick={onImport} disabled={isPending}>
          {isPending && <Spinner size="sm" />}
          Импортировать
        </Button>
      </HStack>
    </VStack>
  )
}
