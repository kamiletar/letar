'use client'

/**
 * Шаг 1: Выбор папки-донора
 */

import { Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { LuCaptions, LuFile, LuFolder, LuFolderOpen, LuLoader, LuMusic, LuVideo } from 'react-icons/lu'

import type { DonorFile } from '@/lib/add-tracks'

interface DonorFolderStepProps {
  /** Путь к папке-донору */
  donorPath: string | null
  /** Найденные файлы */
  donorFiles: DonorFile[]
  /** Идёт сканирование */
  isScanning: boolean
  /** Обработчик выбора папки */
  onFolderSelect: (path: string) => void
}

/**
 * Иконка по типу файла
 */
function FileTypeIcon({ type }: { type: DonorFile['type'] }) {
  switch (type) {
    case 'video':
      return <Icon as={LuVideo} color="primary.fg" boxSize={4} />
    case 'audio':
      return <Icon as={LuMusic} color="accent.fg" boxSize={4} />
    case 'subtitle':
      return <Icon as={LuCaptions} color="success.fg" boxSize={4} />
    default:
      return <Icon as={LuFile} color="fg.muted" boxSize={4} />
  }
}

/**
 * Шаг выбора папки-донора с дорожками
 */
export function DonorFolderStep({ donorPath, donorFiles, isScanning, onFolderSelect }: DonorFolderStepProps) {
  /** Открыть диалог выбора папки */
  const handleSelectFolder = useCallback(async () => {
    if (!window.electronAPI) {
      console.error('Electron API недоступен')
      return
    }

    const path = await window.electronAPI.dialog.selectFolder()
    if (path) {
      onFolderSelect(path)
    }
  }, [onFolderSelect])

  // Считаем типы файлов
  const videoCount = donorFiles.filter((f) => f.type === 'video').length
  const audioCount = donorFiles.filter((f) => f.type === 'audio').length
  const subtitleCount = donorFiles.filter((f) => f.type === 'subtitle').length

  return (
    <VStack gap={6} align="stretch" py={4}>
      {/* Кнопка выбора */}
      <Box textAlign="center">
        <Button
          size="lg"
          colorPalette="purple"
          onClick={handleSelectFolder}
          h="auto"
          py={6}
          px={8}
          disabled={isScanning}
        >
          <VStack gap={2}>
            <Icon as={isScanning ? LuLoader : LuFolderOpen} boxSize={8} className={isScanning ? 'animate-spin' : ''} />
            <Text>{isScanning ? 'Сканирование...' : 'Выбрать папку-донор'}</Text>
          </VStack>
        </Button>
      </Box>

      {/* Выбранная папка */}
      {donorPath && !isScanning && (
        <Box p={4} bg="bg.muted" borderRadius="lg" borderWidth="1px" borderColor="border">
          <VStack gap={3} align="stretch">
            {/* Путь */}
            <HStack gap={2}>
              <Icon as={LuFolder} color="primary.fg" />
              <Text fontSize="sm" color="fg.muted" truncate flex={1}>
                {donorPath}
              </Text>
            </HStack>

            {/* Статистика */}
            <Box p={3} bg="bg.emphasized" borderRadius="md">
              <HStack gap={6} justify="center">
                <VStack gap={1}>
                  <HStack gap={1}>
                    <Icon as={LuVideo} color="primary.fg" boxSize={5} />
                    <Text fontSize="lg" fontWeight="bold" color="fg">
                      {videoCount}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="fg.subtle">
                    видео
                  </Text>
                </VStack>

                {audioCount > 0 && (
                  <VStack gap={1}>
                    <HStack gap={1}>
                      <Icon as={LuMusic} color="accent.fg" boxSize={5} />
                      <Text fontSize="lg" fontWeight="bold" color="fg">
                        {audioCount}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="fg.subtle">
                      аудио
                    </Text>
                  </VStack>
                )}

                {subtitleCount > 0 && (
                  <VStack gap={1}>
                    <HStack gap={1}>
                      <Icon as={LuCaptions} color="success.fg" boxSize={5} />
                      <Text fontSize="lg" fontWeight="bold" color="fg">
                        {subtitleCount}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="fg.subtle">
                      субтитры
                    </Text>
                  </VStack>
                )}
              </HStack>
            </Box>

            {/* Файлы не найдены */}
            {donorFiles.length === 0 && (
              <Text fontSize="sm" color="warning.fg" textAlign="center" py={2}>
                В этой папке не найдены видеофайлы. Выберите другую папку.
              </Text>
            )}

            {/* Список файлов (первые 10) */}
            {donorFiles.length > 0 && (
              <VStack gap={1} align="stretch" maxH="200px" overflowY="auto">
                {donorFiles.slice(0, 10).map((file) => (
                  <HStack key={file.path} gap={2} py={1} px={2} bg="bg.subtle" borderRadius="sm">
                    <FileTypeIcon type={file.type} />
                    <Text fontSize="xs" color="fg.muted" truncate flex={1}>
                      {file.name}
                    </Text>
                    {file.episodeNumber !== null && (
                      <Text fontSize="xs" color="primary.fg" fontWeight="medium">
                        EP {file.episodeNumber}
                      </Text>
                    )}
                  </HStack>
                ))}
                {donorFiles.length > 10 && (
                  <Text fontSize="xs" color="fg.subtle" textAlign="center" py={1}>
                    ...и ещё {donorFiles.length - 10} файлов
                  </Text>
                )}
              </VStack>
            )}
          </VStack>
        </Box>
      )}

      {/* Подсказка */}
      {!donorPath && !isScanning && (
        <Text textAlign="center" fontSize="sm" color="fg.subtle">
          Выберите папку с аниме, из которого хотите добавить аудиодорожки и субтитры.
          <br />
          Будут найдены все видеофайлы с дорожками внутри.
        </Text>
      )}
    </VStack>
  )
}
