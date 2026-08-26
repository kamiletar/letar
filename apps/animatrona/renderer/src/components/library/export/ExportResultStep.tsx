'use client'

/**
 * Шаг отображения результата экспорта
 */

import { Box, Button, Dialog, HStack, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuCopy, LuExternalLink, LuX } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

import type { useExportDialogState } from './use-export-dialog-state'

/**
 * Props для ExportResultStep
 */
export interface ExportResultStepProps {
  state: ReturnType<typeof useExportDialogState>
  onClose: () => void
}

/**
 * Компонент шага результата экспорта
 */
export function ExportResultStep({ state, onClose }: ExportResultStepProps) {
  /**
   * Копирование текста в буфер обмена
   */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toaster.success({
      title: `${label} скопирован`,
      description: text.length > 50 ? `${text.slice(0, 50)}...` : text,
      duration: 3000,
    })
  }

  // Если есть publishResult — показываем результат публикации в IPFS
  if (state.publishResult) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} align="stretch">
            {/* Успех */}
            <Box p={4} bg="green.subtle" borderRadius="md" textAlign="center">
              <LuCheck size={32} color="var(--chakra-colors-green-fg)" style={{ marginBottom: '8px' }} />
              <Text fontWeight="bold" fontSize="lg" color="green.fg">
                Опубликовано в IPFS!
              </Text>
              <Text color="green.fg" opacity={0.8}>
                Web Player доступен для просмотра
              </Text>
            </Box>

            {/* CID */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                CID (Content Identifier)
              </Text>
              <HStack>
                <Box flex={1} p={2} bg="bg.subtle" borderRadius="md" overflow="hidden">
                  <Text fontSize="sm" fontFamily="mono" truncate>
                    {state.publishResult.rootCid}
                  </Text>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(state.publishResult!.rootCid, 'CID')}
                >
                  <LuCopy />
                </Button>
              </HStack>
            </Box>

            {/* Локальный Gateway URL */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Локальный URL (требует запущенный Animatrona)
              </Text>
              <HStack>
                <Box flex={1} p={2} bg="bg.subtle" borderRadius="md" overflow="hidden">
                  <Text fontSize="sm" fontFamily="mono" truncate>
                    {state.publishResult.gatewayUrl}
                  </Text>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(state.publishResult!.gatewayUrl, 'URL')}
                >
                  <LuCopy />
                </Button>
              </HStack>
            </Box>

            {/* Public Gateway URL */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Публичный URL (ipfs.io)
              </Text>
              <HStack>
                <Box flex={1} p={2} bg="bg.subtle" borderRadius="md" overflow="hidden">
                  <Text fontSize="sm" fontFamily="mono" truncate>
                    {state.publishResult.publicGatewayUrl}
                  </Text>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(state.publishResult!.publicGatewayUrl, 'URL')}
                >
                  <LuCopy />
                </Button>
              </HStack>
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Примечание: публичный gateway может быть медленным или недоступным
              </Text>
            </Box>
          </VStack>
        </Dialog.Body>

        <Dialog.Footer>
          <HStack gap={2}>
            <Button
              variant="outline"
              gap={2}
              onClick={() => {
                // Открыть в браузере
                window.open(state.publishResult!.gatewayUrl, '_blank')
              }}
            >
              <LuExternalLink />
              Открыть
            </Button>
            <Button colorPalette="purple" onClick={onClose}>
              Закрыть
            </Button>
          </HStack>
        </Dialog.Footer>
      </>
    )
  }

  // Иначе показываем результат обычного экспорта
  return (
    <>
      <Dialog.Body>
        <VStack gap={4} align="stretch">
          {state.result?.success
            ? (
              <>
                <Box p={4} bg="green.subtle" borderRadius="md" textAlign="center">
                  <LuCheck size={32} color="var(--chakra-colors-green-fg)" style={{ marginBottom: '8px' }} />
                  <Text fontWeight="bold" fontSize="lg" color="green.fg">
                    Экспорт завершён!
                  </Text>
                  <Text color="green.fg" opacity={0.8}>
                    Экспортировано {state.result.exportedFiles.length} файлов
                  </Text>
                </Box>

                {/* Пропущенные эпизоды */}
                {state.result.skippedEpisodes.length > 0 && (
                  <Box>
                    <Text fontWeight="medium" mb={2} color="yellow.300">
                      Пропущено ({state.result.skippedEpisodes.length}):
                    </Text>
                    <VStack gap={1} align="stretch">
                      {state.result.skippedEpisodes.map((ep) => (
                        <Text key={ep.episodeId} fontSize="sm" color="fg.muted">
                          • {ep.reason}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Ошибки */}
                {state.result.failedEpisodes.length > 0 && (
                  <Box>
                    <Text fontWeight="medium" mb={2} color="red.300">
                      Ошибки ({state.result.failedEpisodes.length}):
                    </Text>
                    <VStack gap={1} align="stretch">
                      {state.result.failedEpisodes.map((ep) => (
                        <Text key={ep.episodeId} fontSize="sm" color="red.400">
                          • {ep.error}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                )}
              </>
            )
            : (
              <Box p={4} bg="red.subtle" borderRadius="md" textAlign="center">
                <LuX size={32} color="var(--chakra-colors-red-fg)" style={{ marginBottom: '8px' }} />
                <Text fontWeight="bold" fontSize="lg" color="red.fg">
                  Экспорт не удался
                </Text>
                {state.result?.failedEpisodes.map((ep) => (
                  <Text key={ep.episodeId} color="red.fg" opacity={0.8} fontSize="sm">
                    {ep.error}
                  </Text>
                ))}
              </Box>
            )}
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <Button colorPalette="purple" onClick={onClose}>
          Закрыть
        </Button>
      </Dialog.Footer>
    </>
  )
}
