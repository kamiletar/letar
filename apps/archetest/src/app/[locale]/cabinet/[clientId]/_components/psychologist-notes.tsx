'use client'

import { Button, Card, Dialog, Heading, HStack, Portal, Text, Textarea, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useRef, useState } from 'react'
import { LuPlus, LuTrash2 } from 'react-icons/lu'
import { addNoteAction, deleteNoteAction } from '../../../_actions/cabinet.action'

interface Note {
  id: string
  content: string
  createdAt: Date
}

interface PsychologistNotesProps {
  linkId: string
  notes: Note[]
  onUpdate: () => void
}

/**
 * Заметки психолога о клиенте
 */
export function PsychologistNotes({ linkId, notes, onUpdate }: PsychologistNotesProps) {
  const t = useTranslations('cabinet')
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const handleAdd = useCallback(async () => {
    if (!content.trim()) {
      return
    }
    setAdding(true)
    await addNoteAction({ linkId, content: content.trim() })
    setContent('')
    setAdding(false)
    onUpdate()
  }, [content, linkId, onUpdate])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) {
      return
    }
    await deleteNoteAction(deleteTarget)
    setDeleteTarget(null)
    onUpdate()
  }, [deleteTarget, onUpdate])

  return (
    <VStack align="start" gap={3} w="100%">
      <Heading size="md">{t('notes')}</Heading>

      {/* Форма добавления */}
      <HStack w="100%" gap={2} align="end">
        <Textarea
          placeholder={t('notePlaceholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          flex={1}
        />
        <Button onClick={handleAdd} loading={adding} colorPalette="blue" size="sm">
          <LuPlus size={14} />
          {t('addNote')}
        </Button>
      </HStack>

      {/* Список заметок */}
      {notes.length === 0 && (
        <Text fontSize="sm" color="fg.muted">
          {t('noNotes')}
        </Text>
      )}
      {notes.map((note) => (
        <Card.Root key={note.id} w="100%" variant="subtle">
          <Card.Body py={3}>
            <HStack justify="space-between" align="start">
              <VStack align="start" gap={1} flex={1}>
                <Text fontSize="sm" whiteSpace="pre-line">
                  {note.content}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {new Date(note.createdAt).toLocaleString()}
                </Text>
              </VStack>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                aria-label={t('deleteNote')}
                onClick={() => setDeleteTarget(note.id)}
              >
                <LuTrash2 size={12} />
              </Button>
            </HStack>
          </Card.Body>
        </Card.Root>
      ))}

      {/* Диалог подтверждения удаления */}
      <Dialog.Root
        open={!!deleteTarget}
        onOpenChange={(e) => {
          if (!e.open) {
            setDeleteTarget(null)
          }
        }}
        initialFocusEl={() => cancelRef.current}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{t('deleteNoteTitle')}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>{t('deleteNoteConfirm')}</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button ref={cancelRef} variant="outline" onClick={() => setDeleteTarget(null)}>
                  {t('cancel')}
                </Button>
                <Button colorPalette="red" onClick={handleDeleteConfirm} ml={3}>
                  {t('delete')}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </VStack>
  )
}
