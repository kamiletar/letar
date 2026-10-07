'use client'

/**
 * Редактор стихотворения в режиме чтеца: название, текст, «опубликовано», удаление.
 * Ничего не отправляет сам — отдаёт черновик наверх, там он попадает в очередь правок.
 */

import type { PoemDraft } from '@/lib/offline/poems-store'
import { Box, Button, Checkbox, Flex, Heading, Input, Text, Textarea, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'

interface PoemEditorProps {
  /** Исходные значения; null — новое стихотворение */
  initial: PoemDraft | null
  onSave: (draft: PoemDraft) => void
  onCancel: () => void
  /** Нет у нового стихотворения */
  onDelete?: () => void
}

export function PoemEditor({ initial, onSave, onCancel, onDelete }: PoemEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [text, setText] = useState(initial?.text ?? '')
  const [published, setPublished] = useState(initial?.published ?? false)

  const isNew = initial === null
  const canSave = title.trim().length > 0 && text.trim().length > 0
  const changed = title !== (initial?.title ?? '') || text !== (initial?.text ?? '')
    || published !== (initial?.published ?? false)

  const handleCancel = () => {
    if (changed && !window.confirm('Выйти без сохранения? Изменения пропадут.')) {
      return
    }
    onCancel()
  }

  return (
    <VStack gap={4} align="stretch" pb={32}>
      {/* Кнопки сверху и закреплены: нижние баннеры (cookie, офлайн) их бы закрывали */}
      <Flex
        position="sticky"
        top={0}
        zIndex={1}
        bg="bg"
        borderBottomWidth="1px"
        borderColor="border.muted"
        gap={2}
        py={2}
        justify="space-between"
        align="center"
      >
        <Button variant="ghost" size="lg" onClick={handleCancel}>
          Отмена
        </Button>
        <Heading asChild size="md" lineClamp={1} minW={0}>
          <h1>{isNew ? 'Новое стихотворение' : 'Правка'}</h1>
        </Heading>
        <Button colorPalette="teal" size="lg" disabled={!canSave} onClick={() => onSave({ title, text, published })}>
          Сохранить
        </Button>
      </Flex>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Название</Text>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Название стихотворения"
          maxLength={500}
          size="lg"
        />
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Текст</Text>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Текст стихотворения…"
          rows={16}
          fontSize="md"
          lineHeight="1.5"
          css={{ whiteSpace: 'pre-wrap' }}
        />
      </Box>

      <Checkbox.Root checked={published} onCheckedChange={(event) => setPublished(!!event.checked)}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>Опубликовано на сайте</Checkbox.Label>
      </Checkbox.Root>

      {onDelete && (
        <Button variant="outline" colorPalette="red" alignSelf="start" onClick={onDelete}>
          <LuTrash2 />
          Удалить стихотворение
        </Button>
      )}
    </VStack>
  )
}
