'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for Tags field
 */
const TagsSchema = z.object({
  // Basic tags
  tags: z.array(z.string()).meta({
    ui: { title: 'Tags', description: 'Add keywords for this article' },
  }),

  // Tags with max limit
  categories: z
    .array(z.string())
    .max(5)
    .meta({
      ui: { title: 'Categories', description: 'Select up to 5 categories' },
    }),

  // Editable tags
  skills: z.array(z.string()).meta({
    ui: { title: 'Skills' },
  }),

  // Tags with custom delimiter
  emails: z.array(z.string().email()).meta({
    ui: { title: 'Email Addresses', description: 'Separate with comma or semicolon' },
  }),
})

type TagsFormData = z.infer<typeof TagsSchema>

const initialValues: TagsFormData = {
  tags: ['react', 'typescript'],
  categories: [],
  skills: ['JavaScript', 'React', 'Node.js'],
  emails: [],
}

export default function TagsDemoPage() {
  const [submittedData, setSubmittedData] = useState<TagsFormData | null>(null)

  const handleSubmit = (data: TagsFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout title="Tags Demo" description="Form.Field.Tags - add and remove string tags">
      <Form initialValue={initialValues} schema={TagsSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Basic tags */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              Basic Tags
            </Text>
            <Form.Field.Tags name="tags" placeholder="Add tag..." />
          </Box>

          {/* Tags with max limit */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              Limited Tags (max 5)
            </Text>
            <Form.Field.Tags
              name="categories"
              placeholder="Add category..."
              maxTags={5}
              helperText="Add up to 5 categories"
            />
          </Box>

          {/* Editable and clearable tags */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              Editable Tags
            </Text>
            <Form.Field.Tags name="skills" placeholder="Add skill..." editable clearable colorPalette="purple" />
          </Box>

          {/* Tags with custom delimiter */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              Custom Delimiter (comma/semicolon)
            </Text>
            <Form.Field.Tags
              name="emails"
              placeholder="Enter email addresses..."
              delimiter={/[;,]/}
              addOnPaste
              addOnBlur
              minTagLength={3}
            />
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
