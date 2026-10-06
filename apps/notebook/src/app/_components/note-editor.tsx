'use client'

import { deleteNoteAction, saveNoteAction } from '@/app/_actions/notes.action'
import { Box, Button, Field, HStack, Input, Stack, Tabs, Text, Textarea } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import Markdown from 'react-markdown'

interface NoteEditorProps {
  noteId: string | null
  versionId: string | null
  initialTitle: string
  initialBody: string
}

const ERROR_TEXT: Record<string, string> = {
  UNAUTHORIZED: 'Сессия закончилась, войдите снова',
  VALIDATION_ERROR: 'Текст слишком длинный',
  NOT_FOUND: 'Заметка не найдена',
  CONFLICT: 'Заметку изменили на другом устройстве. Обновите страницу, чтобы не потерять версии',
  DATABASE_ERROR: 'Не удалось сохранить, попробуйте ещё раз',
}

const OK_MESSAGES = ['Сохранено', 'Без изменений']

/** Устройство нужно, чтобы в истории видеть, откуда пришла правка */
function getDeviceId(): string | null {
  try {
    let id = localStorage.getItem('notebook-device-id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('notebook-device-id', id)
    }
    return id
  } catch {
    return null
  }
}

export function NoteEditor(
  { noteId: initialNoteId, versionId: initialVersionId, initialTitle, initialBody }: NoteEditorProps,
) {
  const router = useRouter()
  const [noteId, setNoteId] = useState(initialNoteId)
  const [baseVersionId, setBaseVersionId] = useState(initialVersionId)
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [saved, setSaved] = useState({ title: initialTitle, body: initialBody })
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = title !== saved.title || body !== saved.body

  function save() {
    startTransition(async () => {
      const result = await saveNoteAction({
        noteId: noteId ?? undefined,
        baseVersionId,
        title,
        body,
        deviceId: getDeviceId(),
      })
      if (!result.success) {
        setMessage(ERROR_TEXT[result.error] ?? ERROR_TEXT.DATABASE_ERROR)
        return
      }
      const { noteId: savedNoteId, versionId } = result.data
      if (savedNoteId && savedNoteId !== noteId) {
        setNoteId(savedNoteId)
        window.history.replaceState(null, '', `/notes/${savedNoteId}`)
      }
      if (versionId) {
        setBaseVersionId(versionId)
      }
      setSaved({ title, body })
      setMessage(versionId ? OK_MESSAGES[0] : OK_MESSAGES[1])
    })
  }

  // Ctrl+S / Cmd+S сохраняет, а не открывает диалог браузера. Ссылка на save свежая на каждый рендер
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Не даём случайно закрыть вкладку с несохранённым текстом
  useEffect(() => {
    if (!dirty) {
      return
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function remove() {
    if (!noteId || !window.confirm('Удалить заметку? Версии сохранятся в базе, но в списке её не будет.')) {
      return
    }
    startTransition(async () => {
      const result = await deleteNoteAction({ noteId })
      if (result.success) {
        router.push('/')
      } else {
        setMessage(ERROR_TEXT[result.error] ?? ERROR_TEXT.DATABASE_ERROR)
      }
    })
  }

  const isError = message !== null && !OK_MESSAGES.includes(message)

  return (
    <Stack gap={4}>
      <HStack justify="space-between" wrap="wrap" gap={2}>
        <Button asChild variant="ghost" size="sm">
          <NextLink href="/">← К заметкам</NextLink>
        </Button>
        <HStack gap={2}>
          {noteId && (
            <Button asChild variant="outline" size="sm">
              <NextLink href={`/notes/${noteId}/history`}>История</NextLink>
            </Button>
          )}
          {noteId && (
            <Button variant="outline" size="sm" colorPalette="red" onClick={remove} disabled={pending}>
              Удалить
            </Button>
          )}
          <Button size="sm" colorPalette="teal" onClick={save} loading={pending} disabled={!dirty}>
            Сохранить
          </Button>
        </HStack>
      </HStack>

      <Field.Root>
        <Field.Label>Заголовок</Field.Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Без названия" maxLength={200} />
      </Field.Root>

      <Tabs.Root defaultValue="edit" lazyMount>
        <Tabs.List>
          <Tabs.Trigger value="edit">Текст</Tabs.Trigger>
          <Tabs.Trigger value="preview">Предпросмотр</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="edit">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Markdown: # заголовок, **жирный**, - список"
            minH="50vh"
            fontFamily="mono"
            autoresize
          />
        </Tabs.Content>
        <Tabs.Content value="preview">
          <Box minH="50vh">
            {body.trim() ? <Markdown>{body}</Markdown> : <Text color="fg.muted">Пока пусто</Text>}
          </Box>
        </Tabs.Content>
      </Tabs.Root>

      <Text aria-live="polite" fontSize="sm" color={isError ? 'red.fg' : 'fg.muted'}>
        {message ?? (dirty ? 'Есть несохранённые изменения' : '')}
      </Text>
    </Stack>
  )
}
