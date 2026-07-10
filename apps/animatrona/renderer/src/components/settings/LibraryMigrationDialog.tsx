'use client'

import { Box, Button, CloseButton, Dialog, HStack, Icon, Progress, RadioGroup, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { LuFolder, LuHardDrive } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'
import type { MigrationProgress } from '@/types/electron'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLibraryPath: string | null
}

/** Форматирует байты в читаемую строку */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const PHASE_LABELS: Record<MigrationProgress['phase'], string> = {
  'stopping-kubo': 'Остановка IPFS...',
  copying: 'Копирование файлов...',
  'updating-settings': 'Обновление настроек...',
  'starting-kubo': 'Запуск IPFS с новым путём...',
  done: 'Готово!',
  error: 'Ошибка',
}

/**
 * Диалог переноса библиотеки и IPFS хранилища на новый диск.
 * Поддерживает режимы «Копировать» и «Переместить».
 */
export function LibraryMigrationDialog({ open, onOpenChange, currentLibraryPath }: Props) {
  const [toPath, setToPath] = useState('')
  const [mode, setMode] = useState<'copy' | 'move'>('copy')
  const [freeSpace, setFreeSpace] = useState<number | null>(null)
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [isMigrating, setIsMigrating] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null | undefined>(null)

  // Загружаем свободное место при выборе папки
  useEffect(() => {
    if (!toPath) return
    window.electronAPI?.app.getDiskInfo(toPath).then((info) => {
      setFreeSpace(info?.free ?? null)
    })
  }, [toPath])

  // Отписываемся от прогресса при закрытии
  useEffect(() => {
    if (!open) {
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
    }
  }, [open])

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI?.dialog.selectFolder()
    if (folder) setToPath(folder)
  }

  const handleStart = async () => {
    if (!toPath) return
    setIsMigrating(true)
    setProgress({ phase: 'stopping-kubo', progress: 0 })

    // Подписываемся на прогресс
    unsubscribeRef.current = window.electronAPI?.app.onMigrationProgress((p) => {
      setProgress(p)
      if (p.phase === 'done') {
        setIsMigrating(false)
        toaster.success({
          title: 'Перенос завершён',
          description: `Библиотека перенесена в ${toPath}`,
        })
        setTimeout(() => window.location.reload(), 1000)
      }
      if (p.phase === 'error') {
        setIsMigrating(false)
        toaster.error({
          title: 'Ошибка переноса',
          description: p.error || 'Неизвестная ошибка',
        })
      }
    })

    await window.electronAPI?.app.startLibraryMigration({ toPath, mode })
  }

  const handleClose = () => {
    if (!isMigrating) onOpenChange(false)
  }

  const resetState = () => {
    setToPath('')
    setMode('copy')
    setFreeSpace(null)
    setProgress(null)
    setIsMigrating(false)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open: o }) => {
        if (!o) {
          handleClose()
          if (!isMigrating) resetState()
        }
      }}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="480px">
          <Dialog.Header>
            <Dialog.Title>Перенести библиотеку</Dialog.Title>
            {!isMigrating && (
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={5} align="stretch">
              {/* Текущий путь */}
              <Box>
                <Text fontSize="sm" color="fg.subtle" mb={1}>
                  Текущая папка
                </Text>
                <Box p={2} bg="bg.subtle" borderRadius="md">
                  <Text fontSize="sm" fontFamily="mono" color="fg.muted">
                    {currentLibraryPath || '(по умолчанию)'}
                  </Text>
                </Box>
              </Box>

              {/* Новая папка */}
              <Box>
                <Text fontSize="sm" color="fg.subtle" mb={2}>
                  Новая папка
                </Text>
                <HStack gap={2}>
                  <Box flex={1} p={2} bg="bg.subtle" borderRadius="md" borderWidth="1px" borderColor="border.subtle">
                    <Text fontSize="sm" color={toPath ? 'fg' : 'fg.muted'} wordBreak="break-all">
                      {toPath || 'Не выбрана'}
                    </Text>
                  </Box>
                  <Button variant="outline" onClick={handleSelectFolder} disabled={isMigrating}>
                    <Icon as={LuFolder} />
                    Выбрать
                  </Button>
                </HStack>
                {freeSpace !== null && (
                  <HStack mt={2} gap={1}>
                    <Icon as={LuHardDrive} color="fg.muted" boxSize={3.5} />
                    <Text fontSize="xs" color="fg.muted">
                      Свободно: {formatBytes(freeSpace)}
                    </Text>
                  </HStack>
                )}
              </Box>

              {/* Режим */}
              <Box>
                <Text fontSize="sm" color="fg.subtle" mb={2}>
                  Режим переноса
                </Text>
                <RadioGroup.Root
                  value={mode}
                  onValueChange={({ value }) => setMode(value as 'copy' | 'move')}
                  disabled={isMigrating}
                >
                  <VStack align="stretch" gap={2}>
                    <RadioGroup.Item value="copy">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText>
                        <VStack align="start" gap={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            Копировать
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            Безопасно — файлы останутся на старом месте
                          </Text>
                        </VStack>
                      </RadioGroup.ItemText>
                    </RadioGroup.Item>
                    <RadioGroup.Item value="move">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText>
                        <VStack align="start" gap={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            Переместить
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            Быстро — файлы удалятся со старого места
                          </Text>
                        </VStack>
                      </RadioGroup.ItemText>
                    </RadioGroup.Item>
                  </VStack>
                </RadioGroup.Root>
              </Box>

              {/* Прогресс */}
              {progress && (
                <Box>
                  <HStack mb={2} justify="space-between">
                    <Text fontSize="sm" color="fg.muted">
                      {PHASE_LABELS[progress.phase]}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {progress.progress}%
                    </Text>
                  </HStack>
                  <Progress.Root value={progress.progress} colorPalette={progress.phase === 'error' ? 'red' : 'purple'}>
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  {progress.currentFile && (
                    <Text fontSize="xs" color="fg.subtle" mt={1} truncate>
                      {progress.currentFile}
                    </Text>
                  )}
                </Box>
              )}
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <Button variant="outline" onClick={handleClose} disabled={isMigrating}>
              Отмена
            </Button>
            <Button colorPalette="purple" onClick={handleStart} disabled={!toPath || isMigrating} loading={isMigrating}>
              Начать перенос
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
