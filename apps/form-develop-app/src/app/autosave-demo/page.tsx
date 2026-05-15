'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { AutosaveIndicator, Form, useFormAutosave } from '@letar/forms'
import { DemoPageLayout } from '../_components'

/** Имитация серверного endpoint */
function AutosaveForm() {
  return (
    <Form
      debug
      initialValue={{ title: '', description: '', category: '' }}
      onSubmit={(data) => alert(JSON.stringify(data, null, 2))}
    >
      {/* Autosave подключается внутри Form через render prop */}
      <AutosaveFormInner />
    </Form>
  )
}

function AutosaveFormInner() {
  // В реальном приложении: endpoint: '/api/drafts'
  // Здесь для демо — endpoint который возвращает 200
  const autosave = useFormAutosave(null, {
    endpoint: '/api/autosave-mock',
    draftId: 'demo-draft-1',
    interval: 3000,
    debounce: 1000,
  })

  return (
    <VStack gap={4} align="stretch">
      <Form.Field.String name="title" label="Заголовок" />
      <Form.Field.Textarea name="description" label="Описание" />
      <Form.Field.String name="category" label="Категория" />
      <AutosaveIndicator
        status={autosave.status}
        lastSavedAt={autosave.lastSavedAt}
        error={autosave.error}
      />
      <Form.Button.Submit>Отправить</Form.Button.Submit>
    </VStack>
  )
}

export default function AutosaveDemoPage() {
  return (
    <DemoPageLayout
      title="Autosave to Server"
      description="Серверное автосохранение с debounce, fallback на localStorage, восстановление черновиков"
    >
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="md" mb={3}>Автосохранение каждые 3 секунды</Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Данные отправляются на сервер через POST. При отсутствии сети — сохраняются в localStorage. Индикатор
            показывает статус: &quot;Сохраняю...&quot; → &quot;Сохранено (время)&quot;.
          </Text>
          <AutosaveForm />
        </Box>

        <Box p={4} bg="bg.subtle" borderRadius="md">
          <Heading size="sm" mb={2}>API:</Heading>
          <Code display="block" whiteSpace="pre" fontSize="xs" p={3}>
            {`const autosave = useFormAutosave(form, {
  endpoint: '/api/drafts',
  draftId: 'application-123',
  interval: 5000,   // каждые 5 сек
  debounce: 1000,   // не чаще 1 раз в сек
})

// Статус: autosave.status — 'idle' | 'saving' | 'saved' | 'error'
// Принудительно: autosave.saveNow()
// Восстановить: autosave.loadDraft()`}
          </Code>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
