'use client'

import { Badge, Button, Card, HStack, Icon, Input, Text, VStack } from '@chakra-ui/react'
import { Check, Pencil, Trash, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteCategoryAction, deleteTagAction, renameCategoryAction, renameTagAction } from '../_actions/tags.action'

interface Entry {
  name: string
  count: number
}

interface TagsManagerProps {
  categories: Entry[]
  tags: Entry[]
}

/** Одна секция (категории или метки) с inline-переименованием и удалением */
function EntrySection({
  title,
  entries,
  colorPalette,
  emptyText,
  onRename,
  onDelete,
}: {
  title: string
  entries: Entry[]
  colorPalette: string
  emptyText: string
  onRename: (oldValue: string, newValue: string) => Promise<void>
  onDelete: (value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSave = (name: string) => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) {
      setEditing(null)
      return
    }
    startTransition(async () => {
      await onRename(name, trimmed)
      setEditing(null)
    })
  }

  const handleDelete = (name: string) => {
    startTransition(async () => {
      await onDelete(name)
    })
  }

  return (
    <Card.Root>
      <Card.Body>
        <VStack gap={3} align="stretch">
          <Text fontWeight="semibold">{title}</Text>
          {entries.length === 0
            ? <Text color="fg.muted" fontSize="sm">{emptyText}</Text>
            : (
              <VStack gap={2} align="stretch" opacity={isPending ? 0.6 : 1}>
                {entries.map((entry) => (
                  <HStack key={entry.name} justify="space-between">
                    {editing === entry.name
                      ? (
                        <HStack flex={1} gap={2}>
                          <Input size="sm" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                          <Button size="xs" colorPalette="green" onClick={() => handleSave(entry.name)}>
                            <Icon>
                              <Check />
                            </Icon>
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => setEditing(null)}>
                            <Icon>
                              <X />
                            </Icon>
                          </Button>
                        </HStack>
                      )
                      : (
                        <>
                          <HStack gap={2}>
                            <Badge colorPalette={colorPalette} variant="subtle">{entry.name}</Badge>
                            <Text fontSize="xs" color="fg.muted">{entry.count}</Text>
                          </HStack>
                          <HStack gap={1}>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setEditing(entry.name)
                                setDraft(entry.name)
                              }}
                            >
                              <Icon>
                                <Pencil />
                              </Icon>
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => handleDelete(entry.name)}
                            >
                              <Icon>
                                <Trash />
                              </Icon>
                            </Button>
                          </HStack>
                        </>
                      )}
                  </HStack>
                ))}
              </VStack>
            )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

/** Массовое управление категориями и метками ссылок */
export function TagsManager({ categories, tags }: TagsManagerProps) {
  const router = useRouter()

  const handleRenameCategory = async (oldValue: string, newValue: string) => {
    await renameCategoryAction({ oldValue, newValue })
    router.refresh()
  }
  const handleDeleteCategory = async (value: string) => {
    await deleteCategoryAction({ value })
    router.refresh()
  }
  const handleRenameTag = async (oldValue: string, newValue: string) => {
    await renameTagAction({ oldValue, newValue })
    router.refresh()
  }
  const handleDeleteTag = async (value: string) => {
    await deleteTagAction({ value })
    router.refresh()
  }

  return (
    <VStack gap={4} align="stretch">
      <EntrySection
        title="Категории"
        entries={categories}
        colorPalette="purple"
        emptyText="Категорий пока нет"
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
      />
      <EntrySection
        title="Метки"
        entries={tags}
        colorPalette="teal"
        emptyText="Меток пока нет"
        onRename={handleRenameTag}
        onDelete={handleDeleteTag}
      />
    </VStack>
  )
}
