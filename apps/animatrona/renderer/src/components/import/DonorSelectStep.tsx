'use client'

/**
 * Шаг 4: Выбор папки донора (опционально)
 *
 * Донор — это другой релиз, из которого можно взять аудиодорожки и субтитры.
 * Видеоряд донора может быть рассинхронизирован с оригиналом.
 */

import { Badge, Box, Button, Checkbox, HStack, Icon, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuCheck, LuFileVideo, LuFolder, LuFolderOpen, LuX } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'
import { parseEpisodeNumber } from '@/lib/parse-filename'
import type { ParsedFile } from './FileScanStep'

interface DonorSelectStepProps {
  /** Включён ли донор */
  enabled: boolean
  /** Переключение режима донора */
  onEnabledChange: (enabled: boolean) => void
  /** Путь к папке донора */
  donorPath: string | null
  /** Callback при выборе папки */
  onDonorPathChange: (path: string | null) => void
  /** Файлы донора */
  donorFiles: ParsedFile[]
  /** Callback при изменении файлов донора */
  onDonorFilesChange: (files: ParsedFile[]) => void
  /** Файлы оригинала (для матчинга) */
  originalFiles: ParsedFile[]
}

/**
 * Проверяет наличие внешних дорожек в папке
 */
async function hasExternalTracks(folderPath: string): Promise<{ audio: number; subs: number }> {
  if (!window.electronAPI) {
    return { audio: 0, subs: 0 }
  }

  try {
    const result = await window.electronAPI.fs.scanFolder(folderPath, false)
    if (!result.success) {
      return { audio: 0, subs: 0 }
    }

    const audioExts = ['.mka', '.aac', '.ac3', '.dts', '.flac', '.opus', '.mp3']
    const subExts = ['.ass', '.srt', '.ssa', '.sub']

    const audio = result.files.filter((f) => audioExts.some((ext) => f.name.toLowerCase().endsWith(ext))).length

    const subs = result.files.filter((f) => subExts.some((ext) => f.name.toLowerCase().endsWith(ext))).length

    return { audio, subs }
  } catch {
    return { audio: 0, subs: 0 }
  }
}

/**
 * Шаг выбора папки донора
 */
export function DonorSelectStep({
  enabled,
  onEnabledChange,
  donorPath,
  onDonorPathChange,
  donorFiles,
  onDonorFilesChange,
  originalFiles,
}: DonorSelectStepProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [externalTracks, setExternalTracks] = useState<{ audio: number; subs: number } | null>(null)

  /** Открыть диалог выбора папки */
  const handleSelectFolder = useCallback(async () => {
    if (!window.electronAPI) {
      console.error('Electron API недоступен')
      return
    }

    const path = await window.electronAPI.dialog.selectFolder()
    if (!path) {
      return
    }

    setIsScanning(true)
    try {
      // Сканируем видеофайлы
      const result = await window.electronAPI.fs.scanFolder(path, true)
      if (result.success) {
        const parsed: ParsedFile[] = result.files
          .map((file) => {
            const episodeNumber = parseEpisodeNumber(file.name)
            return {
              ...file,
              episodeNumber,
              episodeType: 'regular' as const,
              selected: episodeNumber !== null,
            }
          })
          .sort((a, b) => {
            if (a.episodeNumber === null) {
              return 1
            }
            if (b.episodeNumber === null) {
              return -1
            }
            return a.episodeNumber - b.episodeNumber
          })

        onDonorPathChange(path)
        onDonorFilesChange(parsed)

        // Проверяем внешние дорожки
        const tracks = await hasExternalTracks(path)
        setExternalTracks(tracks)

        // Показываем результат
        if (parsed.length === 0) {
          toaster.error({
            title: 'Видео не найдены',
            description: 'В выбранной папке нет видеофайлов',
          })
        }
      } else {
        toaster.error({
          title: 'Ошибка сканирования',
          description: 'Не удалось просканировать папку донора',
        })
      }
    } catch (error) {
      console.error('Ошибка сканирования донора:', error)
      toaster.error({
        title: 'Ошибка сканирования',
        description: error instanceof Error ? error.message : 'Не удалось просканировать папку донора',
      })
    } finally {
      setIsScanning(false)
    }
  }, [onDonorPathChange, onDonorFilesChange])

  /** Очистить выбор донора */
  const handleClearDonor = useCallback(() => {
    onDonorPathChange(null)
    onDonorFilesChange([])
    setExternalTracks(null)
  }, [onDonorPathChange, onDonorFilesChange])

  /** Проверка матчинга эпизодов */
  const getMatchInfo = useCallback(() => {
    const selectedOriginal = originalFiles.filter((f) => f.selected && f.episodeNumber !== null)
    const donorEpisodes = new Set(donorFiles.filter((f) => f.episodeNumber !== null).map((f) => f.episodeNumber))

    let matched = 0
    let unmatched = 0

    for (const file of selectedOriginal) {
      if (donorEpisodes.has(file.episodeNumber)) {
        matched++
      } else {
        unmatched++
      }
    }

    return { matched, unmatched, total: selectedOriginal.length }
  }, [originalFiles, donorFiles])

  const matchInfo = donorFiles.length > 0 ? getMatchInfo() : null

  return (
    <VStack gap={6} align="stretch" py={4}>
      {/* Чекбокс включения */}
      <Box p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderColor="border.subtle">
        <Checkbox.Root checked={enabled} onCheckedChange={(e) => onEnabledChange(!!e.checked)}>
          <Checkbox.HiddenInput />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>
            <VStack align="start" gap={1}>
              <Text fontWeight="medium">Использовать дорожки из другого релиза</Text>
              <Text fontSize="sm" color="fg.subtle">
                Выберите папку донора, чтобы взять из неё аудиодорожки и субтитры
              </Text>
            </VStack>
          </Checkbox.Label>
        </Checkbox.Root>
      </Box>

      {/* Контент если включено */}
      {enabled && (
        <>
          {/* Кнопка выбора папки или выбранная папка */}
          {!donorPath ? (
            <Box textAlign="center">
              <Button
                size="lg"
                variant="outline"
                colorPalette="purple"
                onClick={handleSelectFolder}
                h="auto"
                py={6}
                px={8}
                disabled={isScanning}
              >
                <VStack gap={2}>
                  <Icon as={isScanning ? Spinner : LuFolderOpen} boxSize={8} />
                  <Text>{isScanning ? 'Сканирование...' : 'Выбрать папку донора'}</Text>
                </VStack>
              </Button>
            </Box>
          ) : (
            <Box p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderColor="purple.700">
              <VStack gap={3} align="stretch">
                {/* Путь и кнопка удаления */}
                <HStack justify="space-between">
                  <HStack gap={2} flex={1} minW={0}>
                    <Icon as={LuFolder} color="purple.400" flexShrink={0} />
                    <Text fontSize="sm" color="fg.muted" truncate>
                      {donorPath}
                    </Text>
                  </HStack>
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={handleClearDonor}>
                    <Icon as={LuX} />
                  </Button>
                </HStack>

                {/* Статистика */}
                <HStack gap={4} flexWrap="wrap">
                  <Badge colorPalette="purple" variant="subtle">
                    {donorFiles.length} видео
                  </Badge>
                  {externalTracks && externalTracks.audio > 0 && (
                    <Badge colorPalette="green" variant="subtle">
                      {externalTracks.audio} внешних аудио
                    </Badge>
                  )}
                  {externalTracks && externalTracks.subs > 0 && (
                    <Badge colorPalette="blue" variant="subtle">
                      {externalTracks.subs} внешних субтитров
                    </Badge>
                  )}
                </HStack>

                {/* Информация о матчинге */}
                {matchInfo && (
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.subtle">
                        Соответствие эпизодов:
                      </Text>
                      <HStack gap={2}>
                        {matchInfo.matched > 0 && (
                          <HStack gap={1} color="green.400">
                            <Icon as={LuCheck} boxSize={4} />
                            <Text fontSize="sm" fontWeight="medium">
                              {matchInfo.matched} найдено
                            </Text>
                          </HStack>
                        )}
                        {matchInfo.unmatched > 0 && (
                          <HStack gap={1} color="orange.400">
                            <Icon as={LuX} boxSize={4} />
                            <Text fontSize="sm" fontWeight="medium">
                              {matchInfo.unmatched} не найдено
                            </Text>
                          </HStack>
                        )}
                      </HStack>
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Box>
          )}

          {/* Таблица файлов донора */}
          {donorPath && donorFiles.length > 0 && (
            <Box maxH="250px" overflowY="auto" borderWidth="1px" borderColor="border.subtle" borderRadius="md">
              <Table.Root size="sm" variant="line">
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader w="80px">#</Table.ColumnHeader>
                    <Table.ColumnHeader>Файл донора</Table.ColumnHeader>
                    <Table.ColumnHeader w="100px">Статус</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {donorFiles.map((file) => {
                    const hasMatch = originalFiles.some((o) => o.selected && o.episodeNumber === file.episodeNumber)
                    return (
                      <Table.Row
                        key={file.path}
                        opacity={file.episodeNumber === null ? 0.5 : 1}
                        _hover={{ bg: 'bg.subtle' }}
                      >
                        <Table.Cell>
                          {file.episodeNumber !== null ? (
                            <Badge colorPalette="purple" variant="subtle">
                              {file.episodeNumber}
                            </Badge>
                          ) : (
                            <Text color="fg.subtle">—</Text>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <HStack gap={2}>
                            <Icon as={LuFileVideo} color="purple.400" flexShrink={0} />
                            <Text truncate maxW="300px" title={file.name}>
                              {file.name}
                            </Text>
                          </HStack>
                        </Table.Cell>
                        <Table.Cell>
                          {file.episodeNumber !== null &&
                            (hasMatch ? (
                              <Badge colorPalette="green" variant="subtle">
                                <Icon as={LuCheck} mr={1} />
                                Найден
                              </Badge>
                            ) : (
                              <Badge colorPalette="gray" variant="subtle">
                                Пропущен
                              </Badge>
                            ))}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          {/* Предупреждение */}
          {donorPath && matchInfo && matchInfo.unmatched > 0 && (
            <Box p={3} bg="orange.900/20" borderRadius="md" borderWidth="1px" borderColor="orange.800/50">
              <Text fontSize="sm" color="orange.400">
                ⚠️ Для {matchInfo.unmatched} эпизод(ов) не найдены соответствующие файлы в доноре. Они будут
                импортированы без дорожек донора.
              </Text>
            </Box>
          )}

          {/* Подсказка о следующем шаге */}
          {donorPath && matchInfo && matchInfo.matched > 0 && (
            <Box p={3} bg="purple.900/20" borderRadius="md" borderWidth="1px" borderColor="purple.800/50">
              <Text fontSize="sm" color="purple.400">
                💡 На следующем шаге вы сможете откалибровать синхронизацию между оригиналом и донором.
              </Text>
            </Box>
          )}
        </>
      )}

      {/* Подсказка если выключено */}
      {!enabled && (
        <Text textAlign="center" fontSize="sm" color="fg.subtle">
          Если дорожки оригинала вас устраивают, можете пропустить этот шаг.
        </Text>
      )}
    </VStack>
  )
}
