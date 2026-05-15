'use client'

/**
 * Шаг результата перекодировки
 */

import { Box, Button, Dialog, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuX } from 'react-icons/lu'

import type { UseReencodeDialogStateReturn } from './use-reencode-dialog-state'
import { formatBytes } from './utils'

export function ReencodeResultStep({ state }: { state: UseReencodeDialogStateReturn }) {
  const { result, error, handleClose } = state

  if (error && !result) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} py={6}>
            <Icon as={LuX} boxSize={10} color="red.400" />
            <Text fontWeight="medium" color="red.400">
              Ошибка перекодировки
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

  if (!result) return null

  return (
    <>
      <Dialog.Body>
        <VStack gap={4} py={4}>
          <Icon as={LuCheck} boxSize={10} color="green.400" />
          <Text fontWeight="medium" fontSize="lg">
            Перекодировка завершена
          </Text>

          <Box w="full" p={4} bg="bg.subtle" borderRadius="md">
            <VStack gap={2} align="stretch">
              <HStack justify="space-between">
                <Text color="fg.muted">Перекодировано</Text>
                <Text fontWeight="medium">{result.reencoded} дорожек</Text>
              </HStack>

              {result.failed > 0 && (
                <HStack justify="space-between">
                  <Text color="red.400">Ошибки</Text>
                  <Text fontWeight="medium" color="red.400">
                    {result.failed}
                  </Text>
                </HStack>
              )}

              <HStack justify="space-between">
                <Text color="fg.muted">Сэкономлено</Text>
                <Text fontWeight="medium" color="green.400">
                  {formatBytes(result.savedBytes)}
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
