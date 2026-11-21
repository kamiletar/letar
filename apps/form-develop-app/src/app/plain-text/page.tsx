'use client'

import { Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { createForm } from '@letar/forms'
import { FieldPlainText, type PlainTextEditorHandle, type PlainTextHistoryState } from '@letar/forms/plain-text'
import { useRef, useState } from 'react'
import { z } from 'zod/v4'

const DemoForm = createForm({ extraFields: { PlainText: FieldPlainText } })
const Schema = z.object({ text: z.string().min(1, 'Введите текст').max(100000) }).strip()
const initialValue = { text: 'Первая строка\n\nВторая строфа' }

export default function PlainTextDemoPage() {
  const editor = useRef<PlainTextEditorHandle>(null)
  const [history, setHistory] = useState<PlainTextHistoryState>({
    canUndo: false,
    canRedo: false,
    undoDepth: 0,
    redoDepth: 0,
  })
  const [saved, setSaved] = useState('')
  return (
    <Container maxW="3xl" py={6}>
      <Stack gap={4}>
        <Heading asChild size="xl">
          <h1>PlainText: обычный текст и история</h1>
        </Heading>
        <Text>
          Пустая строка разделяет строфы. Вставка принимает обычный текст без HTML. Сохранение не очищает отмену.
        </Text>
        <DemoForm schema={Schema} initialValue={initialValue} onSubmit={(value) => setSaved(value.text)}>
          <HStack gap={2} mb={3} wrap="wrap">
            <Button
              type="button"
              minH="44px"
              disabled={!history.canUndo}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => editor.current?.undo()}
            >
              Отменить
            </Button>
            <Button
              type="button"
              minH="44px"
              disabled={!history.canRedo}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => editor.current?.redo()}
            >
              Повторить
            </Button>
            <Button
              type="button"
              minH="44px"
              aria-label="Вставить длинное тире"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.current?.insertText('—')
                editor.current?.focus()
              }}
            >
              —
            </Button>
          </HStack>
          <DemoForm.Field.PlainText
            name="text"
            label="Текст"
            minHeight="320px"
            editorRef={editor}
            onHistoryChange={setHistory}
          />
          <DemoForm.Errors />
          <DemoForm.Button.Submit>Сохранить</DemoForm.Button.Submit>
        </DemoForm>
        {saved && (
          <Text asChild whiteSpace="pre-wrap">
            <output aria-label="Сохранённый текст">{saved}</output>
          </Text>
        )}
      </Stack>
    </Container>
  )
}
