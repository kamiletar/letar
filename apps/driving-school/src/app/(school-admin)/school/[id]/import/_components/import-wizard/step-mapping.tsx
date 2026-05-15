'use client'

import { Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'

import { ColumnMappingEditor } from '../column-mapping'
import type { ColumnMapping, SystemField } from './types'

interface StepMappingProps {
  headers: string[]
  systemFields: SystemField[]
  mapping: ColumnMapping[]
  onMappingChange: (mapping: ColumnMapping[]) => void
  onNext: () => void
  onBack: () => void
}

/**
 * Шаг 3: Сопоставление колонок.
 */
export function StepMapping({ headers, systemFields, mapping, onMappingChange, onNext, onBack }: StepMappingProps) {
  return (
    <VStack align="stretch" gap={6}>
      <VStack align="start" gap={2}>
        <Heading size="lg">Сопоставьте колонки</Heading>
        <Text color="fg.muted">Укажите, какие колонки файла соответствуют полям системы</Text>
      </VStack>

      <ColumnMappingEditor
        headers={headers}
        systemFields={systemFields}
        mapping={mapping}
        onMappingChange={onMappingChange}
      />

      <HStack justify="space-between">
        <Button variant="ghost" onClick={onBack}>
          Назад
        </Button>
        <Button colorPalette="brand" onClick={onNext}>
          Далее
        </Button>
      </HStack>
    </VStack>
  )
}
