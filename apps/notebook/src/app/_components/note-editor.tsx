'use client'

import { deleteNoteAction, saveNoteAction } from '@/app/_actions/notes.action'
import { flushOutbox, getOutbox, queueEdit } from '@/lib/offline/outbox-store'
import type { OutboxItem } from '@/lib/outbox'
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
  DATABASE_ERROR: 'Не удалось сохранить, попробуйте ещё раз',
}

const OK_MESSAGES = [
  'Сохранено',
  'Без изменений',
  'Сохранено отдельной веткой: заметку менял другой экран. Слить ветки можно в истории',
]

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

/** Правки, которые устройство уже приняло, но сервер ещё не получил, важнее того, что пришло в HTML */
export function NoteEditor(props: NoteEditorProps) {
  const [draft, setDraft] = useState<OutboxItem | null>(null)
  const { noteId } = props

  useEffect(() => {
    let active = true
    void getOutbox().then((queue) => {
      const found = noteId ? queue.find((item) => item.noteId === noteId) : undefined
      if (active && found) {
        setDraft(found)
      }
    })
    return () => {
      active = false
    }
  }, [noteId])

  return (
    <NoteEditorForm
      key={draft?.queuedAt ?? 'server'}
      {...props}
      initialTitle={draft?.title ?? props.initialTitle}
      initialBody={draft?.body ?? props.initialBody}
      versionId={draft ? draft.baseVersionId : props.versionId}
    />
  )
}

function NoteEditorForm(
  { noteId: initialNoteId, versionId: initialVersionId, initialTitle, initialBody }: NoteEditorProps,
) {
  const router = useRouter()
  const [noteId, setNoteId] = useState(initialNoteId)
  const [baseVersionId, setBaseVersionId] = useState(initialVersionId)
  // Идентификатор черновика на устройстве: у новой заметки серверного id ещё нет
  const [localId] = useState(() => (initialNoteId ? `note:${initialNoteId}` : `new:${crypto.randomUUID()}`))
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [saved, setSaved] = useState({ title: initialTitle, body: initialBody })
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = title !== saved.title || body !== saved.body

  function save() {
    startTransition(async () => {
      const item: OutboxItem = {
        localId,
        noteId,
        baseVersionId,
        title,
        body,
        deviceId: getDeviceId(),
        queuedAt: Date.now(),
      }
      // Сначала на устройство, потом на сервер: правка не пропадёт, даже если сеть оборвётся на полпути
      const queued = await queueEdit(item)
      if (!queued) {
        await saveDirect(item)
        return
      }
      setSaved({ title, body })
      const report = await flushOutbox()
      const result = report.synced.get(localId)
      if (!result) {
        setMessage(
          report.unauthorized
            ? ERROR_TEXT.UNAUTHORIZED
            : report.offline
            ? 'Сохранено на устройстве, отправится при появлении сети'
            : ERROR_TEXT.DATABASE_ERROR,
        )
        return
      }
      applyResult(result)
    })
  }

  /** Запасной путь, если IndexedDB недоступна */
  async function saveDirect(item: OutboxItem) {
    try {
      const result = await saveNoteAction({ ...item, noteId: item.noteId ?? undefined })
      if (!result.success) {
        setMessage(ERROR_TEXT[result.error] ?? ERROR_TEXT.DATABASE_ERROR)
        return
      }
      setSaved({ title, body })
      applyResult(result.data)
    } catch {
      setMessage('Нет сети, а память устройства недоступна: текст не сохранён')
    }
  }

  function applyResult(
    { noteId: savedNoteId, versionId, branched }: {
      noteId: string | null
      versionId: string | null
      branched: boolean
    },
  ) {
    if (savedNoteId && savedNoteId !== noteId) {
      setNoteId(savedNoteId)
      window.history.replaceState(null, '', `/notes/${savedNoteId}`)
    }
    if (versionId) {
      setBaseVersionId(versionId)
    }
    setMessage(branched ? OK_MESSAGES[2] : versionId ? OK_MESSAGES[0] : OK_MESSAGES[1])
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
