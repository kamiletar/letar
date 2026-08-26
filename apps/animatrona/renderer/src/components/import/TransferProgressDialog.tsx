'use client'

/**
 * Диалог предложения очистить прогресс просмотра из localStorage после импорта
 * После импорта в библиотеку прогресс будет сохраняться в БД,
 * поэтому старый прогресс из папочного режима можно очистить
 */

import { Button, CloseButton, Dialog, HStack, Portal, Text, VStack } from '@chakra-ui/react'
import { useEffect, useMemo } from 'react'
import { LuCheck, LuClock, LuTrash2 } from 'react-icons/lu'

import type { WatchProgressEntry, WatchProgressStorage } from '@/app/player/types'

/** Ключ для localStorage (должен совпадать с useWatchProgress) */
const STORAGE_KEY = 'animatrona-folder-player-progress'

interface TransferProgressDialogProps {
  /** Диалог открыт */
  open: boolean
  /** Обработчик закрытия */
  onOpenChange: (open: boolean) => void
  /** Путь к папке импорта */
  folderPath: string
}

/**
 * Форматирование времени в виде mm:ss или hh:mm:ss
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Получить записи прогресса для указанной папки
 */
function getProgressForFolder(folderPath: string): { path: string; entry: WatchProgressEntry }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const storage = JSON.parse(raw) as WatchProgressStorage
    const normalizedFolder = folderPath.replace(/\\/g, '/')

    return Object.entries(storage)
      .filter(([path]) => {
        const normalizedPath = path.replace(/\\/g, '/')
        return normalizedPath.startsWith(normalizedFolder)
      })
      .map(([path, entry]) => ({ path, entry }))
  } catch {
    return []
  }
}

/**
 * Очистить прогресс для указанной папки
 */
function clearProgressForFolder(folderPath: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }

    const storage = JSON.parse(raw) as WatchProgressStorage
    const normalizedFolder = folderPath.replace(/\\/g, '/')

    // Удаляем записи для этой папки
    const filtered: WatchProgressStorage = {}
    for (const [path, entry] of Object.entries(storage)) {
      const normalizedPath = path.replace(/\\/g, '/')
      if (!normalizedPath.startsWith(normalizedFolder)) {
        filtered[path] = entry
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('[TransferProgressDialog] Error clearing progress:', error)
  }
}

/**
 * Диалог предложения очистить прогресс после импорта
 */
export function TransferProgressDialog({ open, onOpenChange, folderPath }: TransferProgressDialogProps) {
  // Получаем записи прогресса для этой папки
  const progressEntries = useMemo(() => {
    if (!open || !folderPath) {
      return []
    }
    return getProgressForFolder(folderPath)
  }, [open, folderPath])

  // Суммарное время просмотра
  const totalWatched = useMemo(() => {
    return progressEntries.reduce((sum, { entry }) => sum + entry.time, 0)
  }, [progressEntries])

  // Если диалог открыт но прогресса нет — сразу закрываем
  useEffect(() => {
    if (open && progressEntries.length === 0) {
      onOpenChange(false)
    }
  }, [open, progressEntries.length, onOpenChange])

  // Если нет прогресса — не рендерим диалог
  if (progressEntries.length === 0) {
    return null
  }

  const handleClear = () => {
    clearProgressForFolder(folderPath)
    onOpenChange(false)
  }

  const handleKeep = () => {
    onOpenChange(false)
  }

  return (
    <Dialog.Root
      lazyMount
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="sm"
      closeOnEscape
      closeOnInteractOutside
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.panel" borderColor="border.subtle">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title>Прогресс просмотра</Dialog.Title>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>

            <Dialog.Body py={4}>
              <VStack gap={4} align="stretch">
                <HStack gap={3}>
                  <LuClock color="var(--chakra-colors-blue-400)" size={20} />
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">Найден сохранённый прогресс</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {progressEntries.length} {progressEntries.length === 1 ? 'эпизод' : 'эпизодов'} •{' '}
                      {formatTime(totalWatched)} просмотрено
                    </Text>
                  </VStack>
                </HStack>

                <Text fontSize="sm" color="fg.muted">
                  Теперь это аниме в библиотеке и прогресс будет сохраняться автоматически. Хотите очистить старый
                  прогресс из папочного режима?
                </Text>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle">
              <HStack gap={2} justify="flex-end" w="full">
                <Button variant="ghost" onClick={handleKeep} gap={2}>
                  <LuCheck />
                  Оставить
                </Button>
                <Button colorPalette="red" variant="outline" onClick={handleClear} gap={2}>
                  <LuTrash2 />
                  Очистить
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
