'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { WishlistPriority } from '@/generated/prisma'
import {
  Badge,
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Input,
  Popover,
  Portal,
  Tag,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaEdit, FaStar, FaTag, FaTimes } from 'react-icons/fa'
import { updateWishlistItem } from '../_actions/update-wishlist-item'

// Конфигурация приоритетов
const PRIORITY_CONFIG: Record<WishlistPriority, { label: string; icon: string; color: string }> = {
  DREAM: { label: 'Мечта', icon: '⭐', color: 'yellow' },
  WANT: { label: 'Хочу', icon: '💫', color: 'purple' },
  MAYBE: { label: 'Может быть', icon: '✨', color: 'gray' },
}

interface WishlistItemDetailsProps {
  itemId: string
  note: string | null
  priority: WishlistPriority
  tags: string[]
}

/**
 * Компонент для отображения и редактирования деталей wishlist item:
 * - Заметка
 * - Приоритет (Мечта, Хочу, Может быть)
 * - Теги
 */
export function WishlistItemDetails({
  itemId,
  note: initialNote,
  priority: initialPriority,
  tags: initialTags,
}: WishlistItemDetailsProps) {
  const [note, setNote] = useState(initialNote || '')
  const [priority, setPriority] = useState<WishlistPriority>(initialPriority)
  const [tags, setTags] = useState<string[]>(initialTags || [])
  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const priorityConfig = PRIORITY_CONFIG[priority]

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateWishlistItem({
        itemId,
        note: note || null,
        priority,
        tags,
      })
      toaster.success({ title: 'Сохранено' })
      setIsEditOpen(false)
    } catch {
      toaster.error({ title: 'Ошибка сохранения' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handlePriorityChange = (newPriority: WishlistPriority) => {
    setPriority(newPriority)
  }

  return (
    <VStack align="stretch" gap={2} mt={2}>
      {/* Бейдж приоритета */}
      <HStack gap={2}>
        <Badge colorPalette={priorityConfig.color} variant="subtle" size="sm">
          {priorityConfig.icon} {priorityConfig.label}
        </Badge>
        {tags.length > 0 && (
          <HStack gap={1} flexWrap="wrap">
            {tags.slice(0, 2).map((tag) => (
              <Tag.Root key={tag} size="sm" colorPalette="gray" variant="subtle">
                <Tag.Label>{tag}</Tag.Label>
              </Tag.Root>
            ))}
            {tags.length > 2 && (
              <Text fontSize="xs" color="fg.muted">
                +{tags.length - 2}
              </Text>
            )}
          </HStack>
        )}
      </HStack>

      {/* Заметка (если есть) */}
      {note && (
        <Text fontSize="sm" color="fg.muted" lineClamp={2}>
          {note}
        </Text>
      )}

      {/* Кнопка редактирования */}
      <Popover.Root
        open={isEditOpen}
        onOpenChange={(e) => setIsEditOpen(e.open)}
        positioning={{ placement: 'bottom-start' }}
      >
        <Popover.Trigger asChild>
          <Button size="xs" variant="ghost" colorPalette="fg">
            <Icon as={FaEdit} mr={1} />
            Редактировать
          </Button>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content width="auto">
              <Popover.Arrow>
                <Popover.ArrowTip />
              </Popover.Arrow>
              <Popover.Header>
                <Popover.Title>Детали товара</Popover.Title>
              </Popover.Header>
              <Popover.Body>
                <VStack align="stretch" gap={4}>
                  {/* Приоритет */}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      <Icon as={FaStar} mr={1} />
                      Приоритет
                    </Text>
                    <HStack gap={2}>
                      {(Object.keys(PRIORITY_CONFIG) as WishlistPriority[]).map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant={priority === p ? 'solid' : 'outline'}
                          colorPalette={PRIORITY_CONFIG[p].color}
                          onClick={() => handlePriorityChange(p)}
                        >
                          {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
                        </Button>
                      ))}
                    </HStack>
                  </Box>

                  {/* Заметка */}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      Заметка
                    </Text>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Например: Хочу к свадьбе Маши"
                      size="sm"
                      rows={2}
                    />
                  </Box>

                  {/* Теги */}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      <Icon as={FaTag} mr={1} />
                      Теги
                    </Text>
                    <HStack gap={2} flexWrap="wrap" mb={2}>
                      {tags.map((tag) => (
                        <Tag.Root key={tag} size="sm" colorPalette="gray">
                          <Tag.Label>{tag}</Tag.Label>
                          <Tag.EndElement>
                            <IconButton
                              aria-label={`Удалить тег ${tag}`}
                              size="2xs"
                              variant="ghost"
                              onClick={() => handleRemoveTag(tag)}
                            >
                              <FaTimes />
                            </IconButton>
                          </Tag.EndElement>
                        </Tag.Root>
                      ))}
                    </HStack>
                    <HStack gap={2}>
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Новый тег"
                        size="sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                      />
                      <Button size="sm" onClick={handleAddTag} disabled={!newTag.trim()}>
                        Добавить
                      </Button>
                    </HStack>
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      Примеры: лето, офис, особый случай
                    </Text>
                  </Box>
                </VStack>
              </Popover.Body>
              <Popover.Footer>
                <HStack gap={2} justify="flex-end">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)}>
                    Отмена
                  </Button>
                  <Button colorPalette="fg" size="sm" loading={isLoading} onClick={handleSave}>
                    Сохранить
                  </Button>
                </HStack>
              </Popover.Footer>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
    </VStack>
  )
}
