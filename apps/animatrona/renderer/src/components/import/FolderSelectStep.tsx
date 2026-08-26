'use client'

/**
 * Шаг 1: Выбор папки с эпизодами или файла (для фильма)
 */

import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuFile, LuFileVideo, LuFolder, LuFolderOpen, LuLoader } from 'react-icons/lu'

import { type ParsedFolderInfo, parseFileNameForMovie, parseFolderName } from '@/lib/shikimori/parse-folder'

interface FolderSelectStepProps {
  folderPath: string | null
  parsedInfo: ParsedFolderInfo | null
  onFolderSelect: (path: string, info: ParsedFolderInfo) => void
  /** Режим одиночного файла (для фильмов) */
  isFileMode: boolean
  /** Путь к выбранному файлу */
  singleFilePath: string | null
  /** Обработчик выбора файла */
  onFileSelect: (filePath: string, folderPath: string, info: ParsedFolderInfo) => void
}

/**
 * Шаг выбора папки или файла с автоматическим парсингом имени
 */
export function FolderSelectStep({
  folderPath,
  parsedInfo,
  onFolderSelect,
  isFileMode,
  singleFilePath,
  onFileSelect,
}: FolderSelectStepProps) {
  const [isScanning, setIsScanning] = useState(false)

  /** Открыть диалог выбора папки */
  const handleSelectFolder = useCallback(async () => {
    if (!window.electronAPI) {
      console.error('Electron API недоступен')
      return
    }

    // createHandler возвращает { success, data: path }, но типы в preload указывают string
    const rawResult = await window.electronAPI.dialog.selectFolder()
    // Определяем формат ответа — может быть string напрямую или { success, data }
    const path = typeof rawResult === 'string'
      ? rawResult
      : (rawResult as { success: boolean; data?: string } | null)?.data

    if (path) {
      setIsScanning(true)
      try {
        // Сканируем файлы в папке
        // createHandler возвращает { success, data: { files } }
        const scanResult = (await window.electronAPI.fs.scanFolder(path, false)) as {
          success: boolean
          data?: { files: Array<{ name: string }> }
        }
        const fileNames = scanResult.success && scanResult.data?.files ? scanResult.data.files.map((f) => f.name) : []

        // Парсим с учётом имён файлов
        const info = parseFolderName(path, fileNames)
        onFolderSelect(path, info)
      } finally {
        setIsScanning(false)
      }
    }
  }, [onFolderSelect])

  /** Открыть диалог выбора файла (для фильма) */
  const handleSelectFile = useCallback(async () => {
    if (!window.electronAPI) {
      console.error('Electron API недоступен')
      return
    }

    // preload.dialog.selectFile возвращает string | null (уже unwrapped)
    const rawResult = await window.electronAPI.dialog.selectFile([
      { name: 'Видео', extensions: ['mkv', 'mp4', 'avi', 'webm'] },
    ])

    // Определяем формат ответа — может быть string напрямую или { success, data }
    const filePath = typeof rawResult === 'string'
      ? rawResult
      : (rawResult as { success: boolean; data?: string } | null)?.data

    if (filePath) {
      // Получаем директорию файла (для внешних субтитров)
      const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
      const folderPath = filePath.substring(0, lastSlash)

      // Парсим название из имени файла
      const fileName = filePath.substring(lastSlash + 1)
      const info = parseFileNameForMovie(fileName)

      onFileSelect(filePath, folderPath, info)
    }
  }, [onFileSelect])

  return (
    <VStack gap={6} align="stretch" py={4}>
      {/* Кнопки выбора */}
      <HStack gap={4} justify="center">
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
            {isScanning
              ? <LuLoader size={32} className="animate-spin" />
              : <LuFolderOpen size={32} />}
            <Text>{isScanning ? 'Сканирование...' : 'Выбрать папку'}</Text>
            <Text fontSize="xs" color="fg.subtle">
              Сериал
            </Text>
          </VStack>
        </Button>
        <Button size="lg" colorPalette="blue" onClick={handleSelectFile} h="auto" py={6} px={8} disabled={isScanning}>
          <VStack gap={2}>
            <LuFileVideo size={32} />
            <Text>Выбрать файл</Text>
            <Text fontSize="xs" color="fg.subtle">
              Фильм
            </Text>
          </VStack>
        </Button>
      </HStack>

      {/* Выбранная папка или файл */}
      {(folderPath || singleFilePath) && (
        <Box p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderColor="border.subtle">
          <VStack gap={3} align="stretch">
            {/* Путь */}
            <HStack gap={2}>
              {isFileMode
                ? <LuFile color="var(--chakra-colors-blue-400)" />
                : <LuFolder color="var(--chakra-colors-purple-400)" />}
              <Text fontSize="sm" color="fg.muted" truncate flex={1}>
                {isFileMode ? singleFilePath : folderPath}
              </Text>
            </HStack>

            {/* Распознанная информация */}
            {parsedInfo && (
              <Box p={3} bg="bg.subtle" borderRadius="md">
                <VStack gap={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.subtle">
                      Распознанное название:
                    </Text>
                    <HStack gap={2}>
                      <Text fontSize="sm" fontWeight="medium" color="fg">
                        {parsedInfo.animeName}
                      </Text>
                      <Text fontSize="xs" color="fg.subtle">
                        ({parsedInfo.source === 'files' ? 'из файлов' : 'из папки'})
                      </Text>
                    </HStack>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.subtle">
                      Сезон:
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" color="fg">
                      {parsedInfo.seasonNumber ?? 1}
                    </Text>
                  </HStack>

                  {parsedInfo.subGroup && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.subtle">
                        Субгруппа:
                      </Text>
                      <Text fontSize="sm" color="fg.muted">
                        {parsedInfo.subGroup}
                      </Text>
                    </HStack>
                  )}

                  {parsedInfo.quality && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.subtle">
                        Качество:
                      </Text>
                      <Text fontSize="sm" color="fg.muted">
                        {parsedInfo.quality}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </Box>
            )}
          </VStack>
        </Box>
      )}

      {/* Подсказка */}
      {!folderPath && !singleFilePath && (
        <Text textAlign="center" fontSize="sm" color="fg.subtle">
          Выберите папку с эпизодами или файл для полнометражного фильма.
          <br />
          Название будет автоматически распознано.
        </Text>
      )}
    </VStack>
  )
}
