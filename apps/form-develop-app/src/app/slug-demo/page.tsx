'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout } from '../_components'

/**
 * Demo schema for Slug field
 */
const SlugSchema = z.object({
  // Create form: slug starts empty, mirrors "name" until edited by hand
  name: z.string().meta({
    ui: { title: 'Name', placeholder: 'e.g. "Тестовый дом на Мандала"' },
  }),
  slug: z.string().meta({
    ui: { title: 'URL slug' },
  }),

  // Edit form: slug already has a published value — sync starts off by default
  editName: z.string().meta({
    ui: { title: 'Name (edit form)' },
  }),
  editSlug: z.string().meta({
    ui: { title: 'URL slug (edit form)' },
  }),
})

type SlugFormData = z.infer<typeof SlugSchema>

const initialValues: SlugFormData = {
  name: '',
  slug: '',
  editName: 'Тестовый дом на Мандала',
  editSlug: 'testovyy-dom-na-mandala',
}

export default function SlugDemoPage() {
  const [submittedData, setSubmittedData] = useState<SlugFormData | null>(null)

  const handleSubmit = (data: SlugFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Slug Demo"
      description="Form.Field.Slug - URL slug that mirrors a sibling field until edited by hand"
      maxW="700px"
    >
      <Form initialValue={initialValues} schema={SlugSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          <Box>
            <Text fontWeight="medium" mb={2}>
              Create form — slug starts empty, mirrors the name on every keystroke
            </Text>
            <VStack gap={3} align="stretch">
              <Form.Field.String name="name" />
              <Form.Field.Slug name="slug" source="name" />
            </VStack>
          </Box>

          <Box>
            <Text fontWeight="medium" mb={2}>
              Edit form — slug already published, sync starts off (edit name and watch the slug stay put; click the "↺"
              icon to re-derive it)
            </Text>
            <VStack gap={3} align="stretch">
              <Form.Field.String name="editName" />
              <Form.Field.Slug name="editSlug" source="editName" />
            </VStack>
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
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
          <Code p={2} display="block" fontSize="sm" whiteSpace="pre-wrap">
            {JSON.stringify(submittedData, null, 2)}
          </Code>
        </Box>
      )}
    </DemoPageLayout>
  )
}
