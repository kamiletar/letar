'use client'

import { Alert, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

import type { ImportResult } from './types'

interface StepCompleteProps {
  schoolId: string
  importResult: ImportResult
  onReset: () => void
}

/**
 * Шаг 5: Результат импорта.
 */
export function StepComplete({ schoolId, importResult, onReset }: StepCompleteProps) {
  const router = useRouter()

  return (
    <VStack align="stretch" gap={6}>
      <Alert.Root status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Импорт завершён!</Alert.Title>
          <Alert.Description>
            Добавлено: {importResult.imported}, обновлено: {importResult.updated}, пропущено: {importResult.skipped}
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      {importResult.errors.length > 0 && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Ошибки при импорте ({importResult.errors.length})</Alert.Title>
            <VStack align="start" gap={1} mt={2}>
              {importResult.errors.slice(0, 5).map((err) => (
                <Text key={`error-row-${err.rowIndex}`} fontSize="sm">
                  Строка {err.rowIndex}: {err.error}
                </Text>
              ))}
              {importResult.errors.length > 5 && (
                <Text fontSize="sm" color="fg.muted">
                  ...и ещё {importResult.errors.length - 5} ошибок
                </Text>
              )}
            </VStack>
          </Alert.Content>
        </Alert.Root>
      )}

      <HStack justify="center" gap={4}>
        <Button variant="outline" onClick={() => router.push(`/school/${schoolId}`)}>
          К списку участников
        </Button>
        <Button colorPalette="brand" onClick={onReset}>
          Импортировать ещё
        </Button>
      </HStack>
    </VStack>
  )
}
