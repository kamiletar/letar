'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
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

export default function UndoRedoExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <Heading size="lg">Undo / Redo</Heading>
        <Text color="fg.muted" mt={2}>
          Ctrl+Z / Ctrl+Y для отмены и повтора изменений в форме. useFormHistory подписывается на form.store и
          записывает снапшоты с debounce.
        </Text>
      </Box>

      <Form
        schema={ArticleSchema}
        initialValue={{ title: '', slug: '', content: '', published: false }}
        onSubmit={async () => {}}
      >
        <Form.Field.String name="title" />
        <Form.Field.String name="slug" />
        <Form.Field.Textarea name="content" />
        <Form.Field.Switch name="published" />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>

      <Box p={4} bg="bg.muted" borderRadius="md" fontSize="sm">
        <Text fontWeight="bold" mb={2}>
          Как подключить:
        </Text>
        <Text>1. const history = useFormHistory(form)</Text>
        <Text>2. {'<HistoryControls history={history} />'}</Text>
        <Text>3. Keyboard shortcuts работают автоматически</Text>
      </Box>
    </VStack>
  )
}
