'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout } from '../_components'

/**
 * Demo schema for RichText field
 */
const RichTextSchema = z.object({
  // Basic rich text
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .meta({
      ui: { title: 'Article Content', description: 'Write your article content here' },
    }),

  // Simple comment
  comment: z.string().meta({
    ui: { title: 'Comment', placeholder: 'Leave a comment...' },
  }),

  // JSON output format
  jsonContent: z.string().meta({
    ui: { title: 'JSON Content', description: 'Stored as JSON for advanced processing' },
  }),
})

type RichTextFormData = z.infer<typeof RichTextSchema>

const initialValues: RichTextFormData = {
  content: '<p>This is some <strong>bold</strong> and <em>italic</em> text.</p>',
  comment: '',
  jsonContent: '',
}

export default function RichTextDemoPage() {
  const [submittedData, setSubmittedData] = useState<RichTextFormData | null>(null)

  const handleSubmit = (data: RichTextFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Rich Text Demo"
      description="Form.Field.RichText - WYSIWYG rich text editor based on Tiptap"
      maxW="800px"
    >
      <Form initialValue={initialValues} schema={RichTextSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Full-featured editor */}
          <Box>
            <Form.Field.RichText name="content" minHeight="200px" />
          </Box>

          {/* Simple comment editor with limited toolbar */}
          <Box>
            <Form.Field.RichText
              name="comment"
              minHeight="100px"
              toolbarButtons={['bold', 'italic', 'underline', 'link']}
            />
          </Box>

          {/* JSON output format */}
          <Box>
            <Form.Field.RichText name="jsonContent" minHeight="150px" maxHeight="300px" outputFormat="json" />
          </Box>

          {/* Read-only example */}
          <Box>
            <Form.Field.RichText
              name="content"
              label="Read-only preview"
              readOnly
              showToolbar={false}
              minHeight="100px"
            />
          </Box>

          <Form.Button.Submit>Submit Content</Form.Button.Submit>
        </VStack>
      </Form>

      {submittedData && (
        <Box
          p={4}
          bg="green.50"
          borderWidth="1px"
          borderColor="green.200"
          borderRadius="md"
          data-testid="submitted-data"
          _dark={{ bg: 'green.900/20', borderColor: 'green.700' }}
        >
          <Heading size="sm" mb={2}>
            Submitted Data:
          </Heading>
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontWeight="medium">HTML Content:</Text>
              <Code p={2} display="block" fontSize="sm" whiteSpace="pre-wrap">
                {submittedData.content}
              </Code>
            </Box>
            <Box>
              <Text fontWeight="medium">Comment:</Text>
              <Code p={2} display="block" fontSize="sm" whiteSpace="pre-wrap">
                {submittedData.comment || '(empty)'}
              </Code>
            </Box>
            <Box>
              <Text fontWeight="medium">JSON Content:</Text>
              <Code p={2} display="block" fontSize="sm" maxH="200px" overflow="auto" whiteSpace="pre-wrap">
                {submittedData.jsonContent ? JSON.stringify(JSON.parse(submittedData.jsonContent), null, 2) : '(empty)'}
              </Code>
            </Box>
          </VStack>
        </Box>
      )}
    </DemoPageLayout>
  )
}
