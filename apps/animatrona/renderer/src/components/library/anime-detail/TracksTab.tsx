'use client'

/**
 * Вкладка "Дорожки"
 *
 * Пакетное редактирование аудиодорожек и субтитров для всего аниме.
 * Позволяет изменять язык и группу озвучки/субтитров для выбранных дорожек.
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  createListCollection,
  Dialog,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { LuAudioLines, LuCaptions, LuCheck, LuPencil, LuTrash2, LuX } from 'react-icons/lu'

import { batchDeleteAudioTracks, batchUpdateAudioTracks } from '@/app/_actions/audio-track.action'
import { batchDeleteSubtitleTracks, batchUpdateSubtitleTracks } from '@/app/_actions/subtitle-track.action'
import { toaster } from '@/components/ui/toaster'
import { formatLanguage, LANGUAGE_OPTIONS } from '@/constants/dub-groups'
import type { AudioTrack, SubtitleFont, SubtitleTrack } from '@/generated/prisma'
import { formatBytes } from '@/lib/format-utils'

/** Группа дорожек для отображения */
interface TrackGroupDisplay {
  /** Уникальный идентификатор группы */
  groupKey: string
  /** Тип дорожки */
  type: 'audio' | 'subtitle'
  /** Название группы (язык + dubGroup) */
  displayName: string
  /** Язык */
  language: string
  /** Группа озвучки/субтитров */
  dubGroup: string | null
  /** ID всех дорожек в группе */
  trackIds: string[]
  /** Номера эпизодов */
  episodeNumbers: number[]
  /** Суммарный размер IPFS всех дорожек в группе (байты) */
  totalSize: number
  /** Кодек аудио (для аудиогрупп) */
  codec?: string
  /** Каналы аудио, напр. "2.0", "5.1" (для аудиогрупп) */
  channels?: string
  /** Битрейт в bps (для аудиогрупп) */
  bitrate?: number | null
}

export interface TracksTabProps {
  /** Аудиодорожки с номерами эпизодов */
  audioTracks: (AudioTrack & { episodeNumber: number })[]
  /** Субтитры с номерами эпизодов (с шрифтами для подсчёта размера) */
  subtitleTracks: (SubtitleTrack & { episodeNumber: number; fonts?: SubtitleFont[] })[]
}

/** Форматирование битрейта: bps → kbps */
function formatBitrate(bps: number): string {
  const kbps = Math.round(bps / 1000)
  return `${kbps} kbps`
}

/** Коллекция языков для Select */
const languageCollection = createListCollection({
  items: LANGUAGE_OPTIONS.map((opt) => ({
    label: opt.flag ? `${opt.flag} ${opt.label}` : opt.label,
    value: opt.code,
  })),
})

/**
 * Вкладка редактирования дорожек
 */
export function TracksTab({ audioTracks, subtitleTracks }: TracksTabProps) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Выбранные группы для редактирования
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

  // Режим редактирования для группы
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editLanguage, setEditLanguage] = useState('')
  const [editDubGroup, setEditDubGroup] = useState('')

  /**
   * Группировка дорожек по language + dubGroup
   */
  const trackGroups = useMemo(() => {
    const groups: TrackGroupDisplay[] = []

    // Группируем аудиодорожки по language + студии (dubGroup или title)
    const audioMap = new Map<string, TrackGroupDisplay>()
    for (const track of audioTracks) {
      const studio = track.dubGroup || track.title || ''
      const key = `audio:${track.language}:${studio}`
      const existing = audioMap.get(key)
      if (existing) {
        existing.trackIds.push(track.id)
        existing.totalSize += track.ipfsSize ?? 0
        if (!existing.episodeNumbers.includes(track.episodeNumber)) {
          existing.episodeNumbers.push(track.episodeNumber)
        }
      } else {
        audioMap.set(key, {
          groupKey: key,
          type: 'audio',
          displayName: studio ? `${formatLanguage(track.language)} (${studio})` : formatLanguage(track.language),
          language: track.language,
          dubGroup: track.dubGroup || track.title || null,
          trackIds: [track.id],
          episodeNumbers: [track.episodeNumber],
          totalSize: track.ipfsSize ?? 0,
          codec: track.codec,
          channels: track.channels,
          bitrate: track.bitrate,
        })
      }
    }
    groups.push(...audioMap.values())

    // Группируем субтитры по language + студии (dubGroup или title)
    const subMap = new Map<string, TrackGroupDisplay>()
    for (const track of subtitleTracks) {
      const studio = track.dubGroup || track.title || ''
      const key = `subtitle:${track.language}:${studio}`
      const fontsSize = track.fonts?.reduce((sum, f) => sum + (f.ipfsSize ?? 0), 0) ?? 0
      const trackSize = (track.ipfsSize ?? 0) + fontsSize
      const existing = subMap.get(key)
      if (existing) {
        existing.trackIds.push(track.id)
        existing.totalSize += trackSize
        if (!existing.episodeNumbers.includes(track.episodeNumber)) {
          existing.episodeNumbers.push(track.episodeNumber)
        }
      } else {
        subMap.set(key, {
          groupKey: key,
          type: 'subtitle',
          displayName: studio ? `${formatLanguage(track.language)} (${studio})` : formatLanguage(track.language),
          language: track.language,
          dubGroup: track.dubGroup || track.title || null,
          trackIds: [track.id],
          episodeNumbers: [track.episodeNumber],
          totalSize: trackSize,
        })
      }
    }
    groups.push(...subMap.values())

    // Сортируем эпизоды в каждой группе
    for (const group of groups) {
      group.episodeNumbers.sort((a, b) => a - b)
    }

    return groups
  }, [audioTracks, subtitleTracks])

  // Группы по типу
  const audioGroups = trackGroups.filter((g) => g.type === 'audio')
  const subtitleGroups = trackGroups.filter((g) => g.type === 'subtitle')

  /**
   * Переключить выбор группы
   */
  const toggleGroupSelection = useCallback((groupKey: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])

  /**
   * Начать редактирование группы
   */
  const startEditing = useCallback((group: TrackGroupDisplay) => {
    setEditingGroup(group.groupKey)
    setEditLanguage(group.language)
    setEditDubGroup(group.dubGroup || '')
  }, [])

  /**
   * Отменить редактирование
   */
  const cancelEditing = useCallback(() => {
    setEditingGroup(null)
  }, [])

  /**
   * Сохранить изменения группы
   */
  const saveGroupChanges = useCallback(
    async (group: TrackGroupDisplay) => {
      const finalDubGroup = editDubGroup

      startTransition(async () => {
        try {
          const data: { language?: string; dubGroup?: string | null } = {}

          if (editLanguage !== group.language) {
            data.language = editLanguage
          }

          const newDubGroup = finalDubGroup || null
          if (newDubGroup !== group.dubGroup) {
            data.dubGroup = newDubGroup
          }

          if (Object.keys(data).length === 0) {
            cancelEditing()
            return
          }

          if (group.type === 'audio') {
            await batchUpdateAudioTracks(group.trackIds, data)
          } else {
            await batchUpdateSubtitleTracks(group.trackIds, data)
          }

          // Инвалидируем кэш
          await queryClient.invalidateQueries({ queryKey: ['animes'] })

          toaster.success({
            title: 'Дорожки обновлены',
            description: `Обновлено ${group.trackIds.length} дорожек`,
          })

          cancelEditing()
        } catch (error) {
          toaster.error({
            title: 'Ошибка',
            description: error instanceof Error ? error.message : 'Не удалось обновить дорожки',
          })
        }
      })
    },
    [editLanguage, editDubGroup, cancelEditing, queryClient],
  )

  /**
   * Форматирование диапазона эпизодов
   */
  const formatEpisodeRange = useCallback((numbers: number[]) => {
    if (numbers.length === 0) {
      return ''
    }
    if (numbers.length === 1) {
      return `Серия ${numbers[0]}`
    }

    // Группируем последовательные номера
    const ranges: string[] = []
    let rangeStart = numbers[0]
    let rangeEnd = numbers[0]

    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === rangeEnd + 1) {
        rangeEnd = numbers[i]
      } else {
        ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`)
        rangeStart = numbers[i]
        rangeEnd = numbers[i]
      }
    }
    ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`)

    return `Серии ${ranges.join(', ')}`
  }, [])

  // Суммарные размеры секций
  const audioTotalSize = audioGroups.reduce((sum, g) => sum + g.totalSize, 0)
  const subtitleTotalSize = subtitleGroups.reduce((sum, g) => sum + g.totalSize, 0)

  // Удаление группы дорожек
  const [deleteTarget, setDeleteTarget] = useState<TrackGroupDisplay | null>(null)

  const handleDeleteGroup = useCallback(
    async (group: TrackGroupDisplay) => {
      startTransition(async () => {
        try {
          if (group.type === 'audio') {
            await batchDeleteAudioTracks(group.trackIds)
          } else {
            await batchDeleteSubtitleTracks(group.trackIds)
          }
          await queryClient.invalidateQueries({ queryKey: ['animes'] })
          toaster.success({
            title: 'Дорожки удалены',
            description: `Удалено ${group.trackIds.length} дорожек (${formatBytes(group.totalSize)})`,
          })
          setDeleteTarget(null)
        } catch (error) {
          toaster.error({
            title: 'Ошибка удаления',
            description: error instanceof Error ? error.message : 'Не удалось удалить дорожки',
          })
        }
      })
    },
    [queryClient],
  )

  if (trackGroups.length === 0) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body py={8} textAlign="center">
          <Text color="fg.subtle">Дорожки не найдены</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      {/* Аудиодорожки */}
      {audioGroups.length > 0 && (
        <Box>
          <HStack gap={2} mb={3}>
            <Icon as={LuAudioLines} color="green.400" boxSize={5} />
            <Heading size="md">Аудиодорожки</Heading>
            <Badge colorPalette="green" variant="subtle">
              {audioGroups.length}
            </Badge>
            {audioTotalSize > 0 && (
              <Text fontSize="sm" color="fg.muted">
                {formatBytes(audioTotalSize)}
              </Text>
            )}
          </HStack>

          <VStack align="stretch" gap={2}>
            {audioGroups.map((group) => (
              <TrackGroupRow
                key={group.groupKey}
                group={group}
                isSelected={selectedGroups.has(group.groupKey)}
                isEditing={editingGroup === group.groupKey}
                isPending={isPending}
                editLanguage={editLanguage}
                editDubGroup={editDubGroup}
                onToggleSelect={() => toggleGroupSelection(group.groupKey)}
                onStartEdit={() => startEditing(group)}
                onCancelEdit={cancelEditing}
                onSaveEdit={() => saveGroupChanges(group)}
                onLanguageChange={(v) => setEditLanguage(v)}
                onDubGroupChange={(v) => setEditDubGroup(v)}
                onDelete={() => setDeleteTarget(group)}
                formatEpisodeRange={formatEpisodeRange}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* Субтитры */}
      {subtitleGroups.length > 0 && (
        <Box>
          <HStack gap={2} mb={3}>
            <Icon as={LuCaptions} color="yellow.400" boxSize={5} />
            <Heading size="md">Субтитры</Heading>
            <Badge colorPalette="yellow" variant="subtle">
              {subtitleGroups.length}
            </Badge>
            {subtitleTotalSize > 0 && (
              <Text fontSize="sm" color="fg.muted">
                {formatBytes(subtitleTotalSize)}
              </Text>
            )}
          </HStack>

          <VStack align="stretch" gap={2}>
            {subtitleGroups.map((group) => (
              <TrackGroupRow
                key={group.groupKey}
                group={group}
                isSelected={selectedGroups.has(group.groupKey)}
                isEditing={editingGroup === group.groupKey}
                isPending={isPending}
                editLanguage={editLanguage}
                editDubGroup={editDubGroup}
                onToggleSelect={() => toggleGroupSelection(group.groupKey)}
                onStartEdit={() => startEditing(group)}
                onCancelEdit={cancelEditing}
                onSaveEdit={() => saveGroupChanges(group)}
                onLanguageChange={(v) => setEditLanguage(v)}
                onDubGroupChange={(v) => setEditDubGroup(v)}
                onDelete={() => setDeleteTarget(group)}
                formatEpisodeRange={formatEpisodeRange}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* Диалог подтверждения удаления */}
      <Dialog.Root open={!!deleteTarget} onOpenChange={(e) => !e.open && setDeleteTarget(null)} placement="center">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Удалить группу дорожек?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                Будет удалено <strong>{deleteTarget?.trackIds.length}</strong> дорожек группы{' '}
                <strong>{deleteTarget?.displayName}</strong>
                {deleteTarget?.totalSize ? ` (${formatBytes(deleteTarget.totalSize)})` : ''}.
              </Text>
              <Text mt={2} fontSize="sm" color="fg.muted">
                Место в IPFS освободится при следующей сборке мусора (GC).
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Отмена
              </Button>
              <Button
                colorPalette="red"
                onClick={() => deleteTarget && handleDeleteGroup(deleteTarget)}
                loading={isPending}
              >
                Удалить
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  )
}

/** Props для TrackGroupRow */
interface TrackGroupRowProps {
  group: TrackGroupDisplay
  isSelected: boolean
  isEditing: boolean
  isPending: boolean
  editLanguage: string
  editDubGroup: string
  onToggleSelect: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onLanguageChange: (value: string) => void
  onDubGroupChange: (value: string) => void
  onDelete: () => void
  formatEpisodeRange: (numbers: number[]) => string
}

/**
 * Строка группы дорожек
 */
function TrackGroupRow({
  group,
  isSelected,
  isEditing,
  isPending,
  editLanguage,
  editDubGroup,
  onToggleSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onLanguageChange,
  onDubGroupChange,
  onDelete,
  formatEpisodeRange,
}: TrackGroupRowProps) {
  if (isEditing) {
    return (
      <Box p={3} bg="bg.subtle" borderRadius="md" borderWidth="1px" borderColor="purple.500">
        <VStack align="stretch" gap={3}>
          <HStack justify="space-between">
            <Text fontWeight="medium">{group.displayName}</Text>
            <HStack gap={2}>
              <IconButton
                aria-label="Сохранить"
                size="sm"
                colorPalette="green"
                onClick={onSaveEdit}
                loading={isPending}
              >
                <LuCheck />
              </IconButton>
              <IconButton aria-label="Отмена" size="sm" variant="ghost" onClick={onCancelEdit}>
                <LuX />
              </IconButton>
            </HStack>
          </HStack>

          <HStack gap={4} flexWrap="wrap">
            {/* Язык */}
            <HStack gap={2} minW="180px">
              <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                Язык:
              </Text>
              <Select.Root
                collection={languageCollection}
                value={editLanguage ? [editLanguage] : []}
                onValueChange={(details) => onLanguageChange(details.value[0])}
                size="sm"
              >
                <Select.Trigger>
                  <Select.ValueText placeholder="Выбрать...">{formatLanguage(editLanguage)}</Select.ValueText>
                </Select.Trigger>
                <Select.Positioner>
                  <Select.Content>
                    {languageCollection.items.map((item) => (
                      <Select.Item key={item.value} item={item}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </HStack>

            {/* Группа */}
            <HStack gap={2} flex={1} minW="200px">
              <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                Группа:
              </Text>
              <Input
                size="sm"
                placeholder="(без группы)"
                value={editDubGroup}
                onChange={(e) => onDubGroupChange(e.target.value)}
              />
            </HStack>
          </HStack>
        </VStack>
      </Box>
    )
  }

  return (
    <Box
      p={3}
      bg="bg.subtle"
      borderRadius="md"
      borderWidth="1px"
      borderColor={isSelected ? 'purple.500' : 'border.subtle'}
      transition="border-color 0.2s"
    >
      <HStack justify="space-between">
        <HStack gap={3}>
          <Checkbox.Root checked={isSelected} onCheckedChange={onToggleSelect}>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
          </Checkbox.Root>
          <VStack align="start" gap={0}>
            <Text fontWeight="medium">{group.displayName}</Text>
            <Text fontSize="xs" color="fg.muted">
              {formatEpisodeRange(group.episodeNumbers)} • {group.trackIds.length}{' '}
              {group.trackIds.length === 1 ? 'дорожка' : 'дорожек'}
              {group.codec && ` • ${group.codec.toUpperCase()}`}
              {group.channels && ` ${group.channels}`}
              {group.bitrate != null && group.bitrate > 0 && ` • ${formatBitrate(group.bitrate)}`}
              {group.totalSize > 0 && ` • ${formatBytes(group.totalSize)}`}
            </Text>
          </VStack>
        </HStack>

        <HStack gap={1}>
          <Button variant="ghost" size="sm" onClick={onStartEdit}>
            <Icon as={LuPencil} mr={2} />
            Изменить
          </Button>
          <IconButton aria-label="Удалить группу" variant="ghost" size="sm" colorPalette="red" onClick={onDelete}>
            <LuTrash2 />
          </IconButton>
        </HStack>
      </HStack>
    </Box>
  )
}
