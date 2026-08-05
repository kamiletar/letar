'use client'

import { Box, ChakraProvider, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  title: z.string().meta({ ui: { title: 'Title', placeholder: 'Article title' } }),
  content: z.string().meta({ ui: { title: 'Content', placeholder: 'Write something...' } }),
  tags: z.string().meta({ ui: { title: 'Tags', placeholder: 'comma, separated' } }),
})

export default function UndoRedoDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Undo / Redo</Heading>
          <Text color="fg.muted" mt={2}>
            Ctrl+Z to undo, Ctrl+Shift+Z to redo. History tracked per field change.
          </Text>
        </Box>

        <Form
          schema={Schema}
          initialValue={{ title: '', content: '', tags: '' }}
          onSubmit={(data) => setSubmitted(data)}
        >
          <Stack gap={4}>
            <Form.Field.String name="title" />
            <Form.Field.Textarea name="content" />
            <Form.Field.String name="tags" />
            <Form.DebugValues showInProduction />
            <Form.Button.Submit>Save</Form.Button.Submit>
          </Stack>
        </Form>

        <SubmittedDataPreview data={submitted} />
      </VStack>
    </ChakraProvider>
  )
}
