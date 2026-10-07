'use client'

/**
 * Редактор стихотворения в режиме чтеца: название, текст, «опубликовано», удаление.
 * Ничего не отправляет сам — отдаёт черновик наверх, там он попадает в очередь правок.
 */

import { createPendingBlobKey, putBlob } from '@/lib/offline/blob-store'
import { type CoverEdit, coverSource, type PoemDraft, type PoemEdit } from '@/lib/offline/poems-store'
import { shrinkImage } from '@/lib/offline/shrink-image'
import { Box, Button, Checkbox, Flex, Heading, HStack, Input, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { LuImagePlus, LuTrash2, LuX } from 'react-icons/lu'

import { CoverThumb } from './cover-thumb'

/** Исходные значения редактора: текст и обложка (на сайте и правка, которая ещё не отправлена) */
export interface PoemEditorInitial extends PoemDraft {
  coverImage: string | null
  cover: CoverEdit | undefined
}

interface PoemEditorProps {
  /** Исходные значения; null — новое стихотворение */
  initial: PoemEditorInitial | null
  onSave: (draft: PoemEdit) => void
  onCancel: () => void
  /** Нет у нового стихотворения */
  onDelete?: () => void
}

function sameCover(a: CoverEdit | undefined, b: CoverEdit | undefined): boolean {
  if (a?.kind !== b?.kind) {
    return false
  }
  return a?.kind !== 'set' || (b?.kind === 'set' && a.blobKey === b.blobKey)
}

export function PoemEditor({ initial, onSave, onCancel, onDelete }: PoemEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [text, setText] = useState(initial?.text ?? '')
  const [published, setPublished] = useState(initial?.published ?? false)
  const [cover, setCover] = useState<CoverEdit | undefined>(initial?.cover)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const isNew = initial === null
  const canSave = title.trim().length > 0 && text.trim().length > 0 && !coverBusy
  const changed = title !== (initial?.title ?? '') || text !== (initial?.text ?? '')
    || published !== (initial?.published ?? false) || !sameCover(cover, initial?.cover)

  const shown = coverSource({ coverImage: initial?.coverImage ?? null, cover })
  const hasCover = shown.blobKey !== null || shown.path !== null

  /** Фото сразу уменьшается и кладётся в память телефона: дальше оно переживёт и перезагрузку, и обрыв сети */
  const handlePick = async (file: File | undefined) => {
    if (!file) {
      return
    }
    setCoverError(null)
    setCoverBusy(true)
    const blob = await shrinkImage(file)
    const blobKey = createPendingBlobKey()
    const stored = await putBlob(blobKey, blob)
    setCoverBusy(false)
    if (stored) {
      setCover({ kind: 'set', blobKey })
    } else {
      setCoverError('Не удалось сохранить фото на телефоне: нет места или память браузера отключена.')
    }
  }

  /** Убрать: с сайта — запоминаем удаление, выбранное на телефоне — просто забываем */
  const handleRemove = () => {
    setCoverError(null)
    setCover(initial?.coverImage ? { kind: 'remove' } : undefined)
  }

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
        <Button
          colorPalette="teal"
          size="lg"
          disabled={!canSave}
          onClick={() => onSave({ title, text, published, cover })}
        >
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

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Обложка</Text>
        {hasCover && (
          <Box maxW="320px" mb={2}>
            <CoverThumb blobKey={shown.blobKey} path={shown.path} />
          </Box>
        )}
        <HStack gap={2} wrap="wrap">
          <Button variant="outline" loading={coverBusy} onClick={() => fileInput.current?.click()}>
            <LuImagePlus />
            {hasCover ? 'Заменить фото' : 'Выбрать фото'}
          </Button>
          {hasCover && (
            <Button variant="ghost" colorPalette="red" onClick={handleRemove}>
              <LuX />
              Убрать
            </Button>
          )}
        </HStack>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void handlePick(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <Text fontSize="xs" color="fg.muted" mt={1}>
          Фото сохранится на телефоне и уйдёт на сайт, когда появится интернет.
        </Text>
        {coverError && <Text fontSize="sm" color="red.fg" mt={1}>{coverError}</Text>}
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
