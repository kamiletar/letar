'use client'

/**
 * Редактор названий эпизодов
 * Позволяет задать/изменить названия всех эпизодов аниме
 * v0.6.35
 */

import { Box, Button, CloseButton, Dialog, HStack, Text, Textarea, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuCheck, LuSave, LuX } from 'react-icons/lu'

import { useUpdateEpisode } from '@/lib/hooks'

interface Episode {
  id: string
  number: number
  name: string | null
}

interface EpisodeNameEditorProps {
  /** Открыт ли диалог */
  open: boolean
  /** Колбэк изменения состояния открытия */
  onOpenChange: (open: boolean) => void
  /** Массив эпизодов */
  episodes: Episode[]
  /** ID аниме для регенерации манифестов после сохранения */
  animeId?: string
  /** Колбэк при успешном сохранении */
  onSaved?: () => void
}

/**
 * Диалог редактирования названий эпизодов
 * Формат текста: каждая строка = название эпизода N
 */
export function EpisodeNameEditor({ open, onOpenChange, episodes, animeId, onSaved }: EpisodeNameEditorProps) {
  // Текст в textarea
  const [text, setText] = useState('')
  // Состояние сохранения
  const [isSaving, setIsSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const updateEpisode = useUpdateEpisode()

  // Эпизоды отсортированные по номеру
  const sortedEpisodes = useMemo(() => [...episodes].sort((a, b) => a.number - b.number), [episodes])

  // Инициализация текста при открытии
  useEffect(() => {
    if (open) {
      const lines = sortedEpisodes.map((ep) => ep.name || '')
      setText(lines.join('\n'))
      setSavedCount(0)
    }
  }, [open, sortedEpisodes])

  // Парсинг текста в массив названий
  const parsedNames = useMemo(() => {
    const lines = text.split('\n')
    return sortedEpisodes.map((ep, index) => ({
      episode: ep,
      newName: lines[index]?.trim() || null,
      hasChanged: (lines[index]?.trim() || null) !== (ep.name || null),
    }))
  }, [text, sortedEpisodes])

  // Количество изменённых
  const changedCount = parsedNames.filter((p) => p.hasChanged).length

  // Сохранение изменений
  const handleSave = useCallback(async () => {
    const toUpdate = parsedNames.filter((p) => p.hasChanged)
    if (toUpdate.length === 0) {
      onOpenChange(false)
      return
    }

    setIsSaving(true)
    setSavedCount(0)

    try {
      for (const { episode, newName } of toUpdate) {
        await updateEpisode.mutateAsync({
          where: { id: episode.id },
          data: { name: newName },
        })
        setSavedCount((prev) => prev + 1)
      }

      // Регенерируем EpisodeManifest + AnimeManifest + directoryCid
      if (animeId) {
        try {
          await window.electronAPI?.animeManifest.regenerateForAnime(animeId)
        } catch {
          // Не блокируем закрытие — манифесты обновятся при следующей регенерации
        }
      }

      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Ошибка сохранения названий:', error)
    } finally {
      setIsSaving(false)
    }
  }, [parsedNames, updateEpisode, onOpenChange, onSaved])

  const SaveIcon = changedCount > 0 ? LuSave : LuCheck

  return (
    <Dialog.Root open={open} onOpenChange={(details) => onOpenChange(details.open)} size="lg">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="bg.panel" borderColor="border.subtle">
          <Dialog.Header>
            <Dialog.Title>Редактор названий эпизодов</Dialog.Title>
            <Dialog.Description>
              Каждая строка — название соответствующего эпизода. Пустая строка = без названия.
            </Dialog.Description>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={4} align="stretch">
              {/* Подсказка с номерами эпизодов */}
              <Box bg="bg.subtle" p={3} borderRadius="md" fontSize="sm" color="fg.muted">
                <Text mb={2}>Эпизоды: {sortedEpisodes.map((ep) => ep.number).join(', ')}</Text>
                <Text>Всего: {sortedEpisodes.length} эпизодов</Text>
              </Box>

              {/* Textarea для редактирования */}
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите названия эпизодов (по одному на строку)"
                rows={Math.min(15, Math.max(5, sortedEpisodes.length))}
                fontFamily="mono"
                fontSize="sm"
                bg="bg.subtle"
                borderColor="border.subtle"
                _hover={{ borderColor: 'fg.subtle' }}
                _focus={{ borderColor: 'purple.500', boxShadow: 'none' }}
                disabled={isSaving}
              />

              {/* Статус изменений */}
              {changedCount > 0 && (
                <HStack color="yellow.400" fontSize="sm">
                  <Text>
                    Будет изменено: {changedCount}{' '}
                    {changedCount === 1 ? 'эпизод' : changedCount < 5 ? 'эпизода' : 'эпизодов'}
                  </Text>
                </HStack>
              )}

              {/* Прогресс сохранения */}
              {isSaving && (
                <HStack color="blue.400" fontSize="sm">
                  <Text>
                    Сохранение: {savedCount} / {changedCount}
                  </Text>
                </HStack>
              )}
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={2}>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                <LuX style={{ marginRight: '8px' }} />
                Отмена
              </Button>
              <Button colorPalette="purple" onClick={handleSave} disabled={changedCount === 0} loading={isSaving}>
                <SaveIcon style={{ marginRight: '8px' }} />
                {changedCount > 0 ? 'Сохранить' : 'Без изменений'}
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
