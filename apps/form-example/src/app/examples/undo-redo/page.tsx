'use client'

/**
 * Реальное подключение useFormHistory + HistoryControls — раньше страница только описывала
 * шаги подключения текстом, ничего не рендерила. FormHistoryPanel читает form через
 * useDeclarativeForm() (доступен только внутри <Form>), поэтому вынесен отдельным компонентом.
 */

import { PageH1 } from '@/components/page-h1'
import { Box, Text, VStack } from '@chakra-ui/react'
import { Form, HistoryControls, useDeclarativeForm, useFormHistory } from '@letar/forms'
import { z } from 'zod/v4'

const ArticleSchema = z.object({
  title: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Заголовок' } }),
  slug: z.string().meta({ ui: { title: 'Slug' } }),
  content: z
    .string()
    .max(5000)
    .meta({ ui: { title: 'Содержание' } }),
  published: z.boolean().meta({ ui: { title: 'Опубликовать' } }),
})

function FormHistoryPanel() {
  const { form } = useDeclarativeForm()
  const history = useFormHistory(form)

  return (
    <Box p={4} bg="bg.muted" borderRadius="md">
      <HistoryControls history={history} />
      <Text fontSize="xs" color="fg.muted" mt={2}>
        Ctrl+Z / Ctrl+Y работают в любом месте страницы — useFormHistory вешает глобальный keydown-листенер.
      </Text>
    </Box>
  )
}

export default function UndoRedoExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <PageH1 size="lg">Undo / Redo</PageH1>
        <Text color="fg.muted" mt={2}>
          Ctrl+Z / Ctrl+Y для отмены и повтора изменений в форме. <code>useFormHistory</code>{' '}
          подписывается на form.store и записывает снапшоты с debounce.
        </Text>
      </Box>

      <Form
        schema={ArticleSchema}
        initialValue={{ title: '', slug: '', content: '', published: false }}
        onSubmit={() => {
          // демо: отправка не требуется
        }}
      >
        <FormHistoryPanel />
        <Form.Field.String name="title" />
        <Form.Field.String name="slug" />
        <Form.Field.Textarea name="content" />
        <Form.Field.Switch name="published" />
        <Form.DebugValues showInProduction />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>
    </VStack>
  )
}
