'use client'

import { revertNoteAction } from '@/app/_actions/notes.action'
import { Button, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface RevertButtonProps {
  noteId: string
  versionId: string
}

/** Откат на версию: создаёт новую версию со старым текстом и возвращает в редактор */
export function RevertButton({ noteId, versionId }: RevertButtonProps) {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  function revert() {
    startTransition(async () => {
      const result = await revertNoteAction({ noteId, versionId })
      if (result.success) {
        router.push(`/notes/${noteId}`)
        router.refresh()
      } else {
        setError(true)
      }
    })
  }

  return (
    <>
      <Button size="sm" colorPalette="teal" onClick={revert} loading={pending}>
        Откатить на версию «Было»
      </Button>
      {error && <Text color="red.fg" fontSize="sm">Не удалось откатить, попробуйте ещё раз</Text>}
    </>
  )
}
