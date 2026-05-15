'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Simple schema for persistence demo
 */
const DemoSchema = z.object({
  title: z
    .string()
    .min(2)
    .meta({
      ui: { title: 'Title', placeholder: 'Enter a title' },
    }),
  description: z.string().meta({
    ui: { title: 'Description', placeholder: 'Enter description...' },
  }),
  priority: z.string().meta({
    ui: { title: 'Priority' },
  }),
  category: z.string().meta({
    ui: { title: 'Category', placeholder: 'Select category' },
  }),
})

type DemoFormData = z.infer<typeof DemoSchema>

const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const categoryOptions = [
  { label: 'Work', value: 'work' },
  { label: 'Personal', value: 'personal' },
  { label: 'Shopping', value: 'shopping' },
  { label: 'Health', value: 'health' },
]

const initialValues: DemoFormData = {
  title: '',
  description: '',
  priority: '',
  category: '',
}

export default function PersistenceDemoPage() {
  const [submittedData, setSubmittedData] = useState<DemoFormData | null>(null)

  const handleSubmit = (data: DemoFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Persistence Demo"
      description="This form automatically saves your progress to localStorage. Try filling in some fields, then refresh the page - you will be asked if you want to restore your data."
    >
      <Form
        initialValue={initialValues}
        schema={DemoSchema}
        onSubmit={handleSubmit}
        persistence={{
          key: 'persistence-demo-form',
          debounceMs: 500,
          dialogTitle: 'Restore saved data?',
          dialogDescription: 'You have unsaved changes from a previous session. Would you like to restore them?',
          restoreButtonText: 'Restore',
          discardButtonText: 'Start fresh',
        }}
      >
        <VStack gap={4} align="stretch">
          <Form.Field.String name="title" />
          <Form.Field.Textarea name="description" rows={3} />
          <Form.Field.RadioGroup name="priority" options={priorityOptions} orientation="horizontal" />
          <Form.Field.Select name="category" options={categoryOptions} />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview
        data={submittedData}
        title="Form submitted successfully! localStorage data has been cleared."
      />

      <Box
        p={4}
        bg="blue.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="blue.200"
        _dark={{ bg: 'blue.900/20', borderColor: 'blue.700' }}
      >
        <Heading size="sm" mb={2} color="blue.700" _dark={{ color: 'blue.300' }}>
          How it works:
        </Heading>
        <VStack align="stretch" gap={2} fontSize="sm">
          <Text>1. Fill in some fields in the form above</Text>
          <Text>2. Refresh the page (F5 or Ctrl+R)</Text>
          <Text>3. A dialog will appear asking to restore your data</Text>
          <Text>4. Click "Restore" to continue where you left off</Text>
          <Text>5. Click "Start fresh" to discard saved data</Text>
          <Text>6. On successful submit, saved data is automatically cleared</Text>
        </VStack>
      </Box>
    </DemoPageLayout>
  )
}
