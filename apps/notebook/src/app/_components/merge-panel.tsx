'use client'

import { mergeBranchesAction } from '@/app/_actions/notes.action'
import { DiffView } from '@/app/_components/diff-view'
import { diffLines } from '@/lib/versions'
import { Button, HStack, Stack, Text, Textarea } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface HeadView {
  id: string
  title: string
  body: string
  /** Уже отформатированная дата, чтобы сервер и клиент показали одно и то же */
  createdAt: string
}

interface MergePanelProps {
  noteId: string
  main: HeadView
  other: HeadView
}

/** Слияние двух веток: показывает разницу, владелец собирает итоговый текст и сохраняет */
export function MergePanel({ noteId, main, other }: MergePanelProps) {
  const router = useRouter()
  const [body, setBody] = useState(main.body)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()
  const diff = diffLines(main.body, other.body)

  function merge() {
    startTransition(async () => {
      const result = await mergeBranchesAction({
        noteId,
        mainId: main.id,
        otherId: other.id,
        title: main.title,
        body,
      })
      if (result.success) {
        router.refresh()
      } else {
        setError(true)
      }
    })
  }

  return (
    <Stack gap={3} borderWidth="1px" borderColor="orange.muted" borderRadius="md" p={4}>
      <Text fontWeight="medium">Ветка от {other.createdAt} расходится с основной ({main.createdAt})</Text>
      <DiffView lines={diff} />
      <HStack wrap="wrap" gap={2}>
        <Button size="xs" variant="outline" onClick={() => setBody(main.body)}>Взять основную</Button>
        <Button size="xs" variant="outline" onClick={() => setBody(other.body)}>Взять ветку</Button>
        <Button size="xs" variant="outline" onClick={() => setBody(`${main.body}\n\n${other.body}`)}>
          Склеить обе
        </Button>
      </HStack>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} minH="12rem" fontFamily="mono" autoresize />
      <HStack>
        <Button colorPalette="teal" onClick={merge} loading={pending}>Слить в одну версию</Button>
        {error && <Text color="red.fg" fontSize="sm">Не удалось слить, обновите страницу</Text>}
      </HStack>
    </Stack>
  )
}
