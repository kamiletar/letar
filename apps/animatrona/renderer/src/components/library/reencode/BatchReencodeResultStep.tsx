'use client'

/**
 * Шаг результата пакетной перекодировки
 */

import { Box, Button, Dialog, HStack, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuX } from 'react-icons/lu'

import { formatBytes } from '@/lib/format-utils'
import type { UseBatchReencodeStateReturn } from './use-batch-reencode-state'

export function BatchReencodeResultStep({ state }: { state: UseBatchReencodeStateReturn }) {
  const { result, error, handleClose } = state

  if (error && !result) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} py={6}>
            <LuX size={40} color="var(--chakra-colors-red-400)" />
            <Text fontWeight="medium" color="red.400">
              Ошибка пакетной перекодировки
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {error}
            </Text>
          </VStack>
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={handleClose}>Закрыть</Button>
        </Dialog.Footer>
      </>
    )
  }

  if (!result) {
    return null
  }

  const successCount = result.animeResults.filter((r) => r.result.reencoded > 0).length
  const failedCount = result.animeResults.filter((r) => r.result.failed > 0).length

  return (
    <>
      <Dialog.Body>
        <VStack gap={4} py={4}>
          <LuCheck size={40} color="var(--chakra-colors-green-400)" />
          <Text fontWeight="medium" fontSize="lg">
            Пакетная перекодировка завершена
          </Text>

          <Box w="full" p={4} bg="bg.subtle" borderRadius="md">
            <VStack gap={2} align="stretch">
              <HStack justify="space-between">
                <Text color="fg.muted">Аниме обработано</Text>
                <Text fontWeight="medium">{successCount}</Text>
              </HStack>

              <HStack justify="space-between">
                <Text color="fg.muted">Дорожек перекодировано</Text>
                <Text fontWeight="medium">{result.totalReencoded}</Text>
              </HStack>

              {result.totalFailed > 0 && (
                <HStack justify="space-between">
                  <Text color="red.400">Ошибки</Text>
                  <Text fontWeight="medium" color="red.400">
                    {result.totalFailed} дорожек
                  </Text>
                </HStack>
              )}

              {failedCount > 0 && (
                <HStack justify="space-between">
                  <Text color="red.400">Аниме с ошибками</Text>
                  <Text fontWeight="medium" color="red.400">
                    {failedCount}
                  </Text>
                </HStack>
              )}

              <HStack justify="space-between">
                <Text color="fg.muted">Сэкономлено</Text>
                <Text fontWeight="medium" color="green.400">
                  {formatBytes(result.totalSavedBytes)}
                </Text>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <Button colorPalette="purple" onClick={handleClose}>
          Готово
        </Button>
      </Dialog.Footer>
    </>
  )
}
