'use client'

/**
 * Компонент редактирования групп дорожек (язык и dubGroup)
 *
 * Позволяет batch-редактировать язык и группу озвучки для:
 * - Всех дорожек из одной папки (внешние)
 * - Всех дорожек с одним streamIndex (встроенные)
 */

import {
  Badge,
  Box,
  Button,
  Collapsible,
  createListCollection,
  For,
  HStack,
  IconButton,
  Input,
  Select,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuAudioLines, LuCaptions, LuChevronDown, LuChevronUp, LuCopy, LuSettings, LuX } from 'react-icons/lu'

import { formatLanguage, LANGUAGE_OPTIONS, normalizeLanguageCode, SUBTITLE_TYPE_OPTIONS } from '@/constants/dub-groups'

import type { SubtitleType, TrackGroup, TrackGroupEdit } from './types'

interface TrackGroupEditorProps {
  /** Группы аудиодорожек */
  audioGroups: TrackGroup[]
  /** Группы субтитров */
  subtitleGroups: TrackGroup[]
  /** Callback при изменении группы (только текущий эпизод) */
  onGroupEdit: (type: 'audio' | 'subtitle', groupId: string, edit: TrackGroupEdit) => void
  /** Callback для применения ко всем эпизодам */
  onApplyToAll?: (type: 'audio' | 'subtitle', groupId: string, edit: TrackGroupEdit) => void
}

/** Коллекция языков для Select */
const languageCollection = createListCollection({
  items: LANGUAGE_OPTIONS.map((opt) => ({
    label: opt.flag ? `${opt.flag} ${opt.label}` : opt.label,
    value: opt.code,
  })),
})

/**
 * Редактор групп дорожек
 */
export function TrackGroupEditor({ audioGroups, subtitleGroups, onGroupEdit, onApplyToAll }: TrackGroupEditorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const hasGroups = audioGroups.length > 0 || subtitleGroups.length > 0

  if (!hasGroups) {
    return null
  }

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
      <Collapsible.Trigger asChild>
        <Button variant="ghost" size="sm" w="full" justifyContent="space-between" mb={isOpen ? 2 : 0}>
          <HStack gap={2}>
            <LuSettings size={16} />
            <Text>Настроить язык/команду</Text>
          </HStack>
          {isOpen ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
        </Button>
      </Collapsible.Trigger>

      <Collapsible.Content>
        <VStack align="stretch" gap={3} p={3} bg="bg.subtle" borderRadius="md">
          {/* Аудиогруппы */}
          {audioGroups.length > 0 && (
            <VStack align="stretch" gap={2}>
              <HStack gap={2}>
                <LuAudioLines color="var(--chakra-colors-green-400)" size={16} />
                <Text fontSize="sm" fontWeight="medium">
                  Аудиодорожки
                </Text>
              </HStack>

              <For each={audioGroups}>
                {(group) => (
                  <GroupEditRow
                    key={group.groupId}
                    group={group}
                    onEdit={(edit) => onGroupEdit('audio', group.groupId, edit)}
                    onApplyToAll={onApplyToAll ? (edit) => onApplyToAll('audio', group.groupId, edit) : undefined}
                  />
                )}
              </For>
            </VStack>
          )}

          {/* Субтитры */}
          {subtitleGroups.length > 0 && (
            <VStack align="stretch" gap={2}>
              <HStack gap={2}>
                <LuCaptions color="var(--chakra-colors-yellow-400)" size={16} />
                <Text fontSize="sm" fontWeight="medium">
                  Субтитры
                </Text>
              </HStack>

              <For each={subtitleGroups}>
                {(group) => (
                  <GroupEditRow
                    key={group.groupId}
                    group={group}
                    isSubtitle
                    onEdit={(edit) => onGroupEdit('subtitle', group.groupId, edit)}
                    onApplyToAll={onApplyToAll ? (edit) => onApplyToAll('subtitle', group.groupId, edit) : undefined}
                  />
                )}
              </For>
            </VStack>
          )}
        </VStack>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

interface GroupEditRowProps {
  group: TrackGroup
  /** Показывать селект типа субтитров */
  isSubtitle?: boolean
  onEdit: (edit: TrackGroupEdit) => void
  /** Callback для применения ко всем эпизодам */
  onApplyToAll?: (edit: TrackGroupEdit) => void
}

/**
 * Строка редактирования одной группы
 */
/** Коллекция типов субтитров для Select */
const subtitleTypeCollection = createListCollection({
  items: SUBTITLE_TYPE_OPTIONS.map((opt) => ({
    label: opt.label,
    value: opt.value,
  })),
})

function GroupEditRow({ group, isSubtitle, onEdit, onApplyToAll }: GroupEditRowProps) {
  const [dubGroupInput, setDubGroupInput] = useState(group.dubGroup ?? '')

  // Синхронизируем локальный стейт когда parent обновляет group.dubGroup
  useEffect(() => {
    setDubGroupInput(group.dubGroup ?? '')
  }, [group.dubGroup])

  // Нормализуем код языка для селекта (rus → ru, jpn → ja)
  const normalizedLang = normalizeLanguageCode(group.language)

  const handleLanguageChange = (details: { value: string[] }) => {
    const value = details.value[0]
    if (value) {
      onEdit({ language: value })
    }
  }

  const handleDubGroupCommit = () => {
    const trimmed = dubGroupInput.trim()
    if (trimmed !== (group.dubGroup ?? '')) {
      onEdit({ dubGroup: trimmed || null })
    }
  }

  const handleClearDubGroup = () => {
    onEdit({ dubGroup: null })
    setDubGroupInput('')
  }

  const handleSubtitleTypeChange = (details: { value: string[] }) => {
    const value = details.value[0] as SubtitleType
    if (value) {
      onEdit({ subtitleType: value })
    }
  }

  /** Применить текущие настройки ко всем эпизодам */
  const handleApplyToAll = () => {
    if (onApplyToAll) {
      onApplyToAll({
        language: normalizedLang || group.language,
        dubGroup: group.dubGroup ?? null,
        subtitleType: group.subtitleType,
        enabled: group.enabled ?? true,
      })
    }
  }

  return (
    <Box p={2} bg="bg.muted" borderRadius="md">
      <HStack justify="space-between" mb={2}>
        <HStack gap={2}>
          <Badge colorPalette={group.type === 'external' ? 'blue' : 'gray'} variant="subtle" size="sm">
            {group.type === 'external' ? 'ВНЕШ' : 'MKV'}
          </Badge>
          <Text fontSize="sm" fontWeight="medium" color={group.enabled === false ? 'fg.muted' : undefined}>
            {group.displayName}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            ({group.trackCount} {group.trackCount === 1 ? 'дорожка' : 'дорожек'})
          </Text>
        </HStack>
        <Switch.Root
          size="sm"
          checked={group.enabled !== false}
          onCheckedChange={(e) => onEdit({ enabled: e.checked })}
          title={group.enabled === false ? 'Включить дорожки' : 'Исключить дорожки'}
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>

      <HStack gap={3} flexWrap="wrap">
        {/* Выбор языка */}
        <HStack gap={2} minW="180px">
          <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
            Язык:
          </Text>
          <Select.Root
            collection={languageCollection}
            value={normalizedLang ? [normalizedLang] : []}
            onValueChange={handleLanguageChange}
            size="sm"
          >
            <Select.Trigger>
              <Select.ValueText placeholder="Выбрать...">
                {normalizedLang ? formatLanguage(normalizedLang) : 'Выбрать...'}
              </Select.ValueText>
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

        {/* Ввод dubGroup */}
        <HStack gap={2} flex={1} minW="200px">
          <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
            Команда:
          </Text>
          <HStack flex={1}>
            <Input
              size="sm"
              placeholder="(без группы)"
              value={dubGroupInput}
              onChange={(e) => setDubGroupInput(e.target.value)}
              onBlur={handleDubGroupCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDubGroupCommit()
                }
              }}
            />
            {dubGroupInput && (
              <IconButton aria-label="Очистить" size="sm" variant="ghost" onClick={handleClearDubGroup}>
                <LuX />
              </IconButton>
            )}
          </HStack>
        </HStack>

        {/* Тип субтитров (только для субтитров) */}
        {isSubtitle && (
          <HStack gap={2} minW="160px">
            <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
              Тип:
            </Text>
            <Select.Root
              collection={subtitleTypeCollection}
              value={group.subtitleType ? [group.subtitleType] : ['full']}
              onValueChange={handleSubtitleTypeChange}
              size="sm"
            >
              <Select.Trigger>
                <Select.ValueText>
                  {SUBTITLE_TYPE_OPTIONS.find((o) => o.value === (group.subtitleType || 'full'))?.label || 'Полные'}
                </Select.ValueText>
              </Select.Trigger>
              <Select.Positioner>
                <Select.Content>
                  {subtitleTypeCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </HStack>
        )}

        {/* Кнопка "Применить ко всем" */}
        {onApplyToAll && (
          <Button
            size="xs"
            variant="ghost"
            colorPalette="purple"
            onClick={handleApplyToAll}
            title="Применить эти настройки ко всем эпизодам"
            gap={1}
          >
            <LuCopy size={12} />
            Ко всем
          </Button>
        )}
      </HStack>
    </Box>
  )
}
