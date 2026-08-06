'use client'

import { Badge, Button, Code, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod/v4'

const STORAGE_KEY = 'form-example-persistence'

const Schema = z.object({
  title: z.string().meta({ ui: { title: 'Title', placeholder: 'My draft article' } }),
  category: z.enum(['tech', 'design', 'business']).meta({ ui: { title: 'Category' } }),
  content: z.string().meta({ ui: { title: 'Content', placeholder: 'Write your article...' } }),
  published: z.boolean().meta({ ui: { title: 'Published' } }),
})

type FormData = z.infer<typeof Schema>

const defaultValues: FormData = { title: '', category: 'tech', content: '', published: false }

const categoryOptions = [
  { value: 'tech', label: 'Technology' },
  { value: 'design', label: 'Design' },
  { value: 'business', label: 'Business' },
]

export default function PersistencePage() {
  const [initialValue, setInitialValue] = useState<FormData>(defaultValues)
  const [hasSaved, setHasSaved] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setInitialValue(JSON.parse(saved))
        setHasSaved(true)
      }
    } catch {
      // некорректные данные в localStorage — используем значения по умолчанию
    }
  }, [])

  const handleClear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setInitialValue(defaultValues)
    setHasSaved(false)
    setKey((k) => k + 1)
  }, [])

  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">Form Persistence</Heading>
        <Text color="fg.muted">
          Form data is saved to <Code>localStorage</Code>{' '}
          on submit. Click "Save Draft" to persist, then refresh the page — your data is restored!
        </Text>
      </div>

      <HStack>
        <Badge colorPalette={hasSaved ? 'green' : 'gray'} size="lg">
          {hasSaved ? 'Draft saved' : 'No saved draft'}
        </Badge>
        {hasSaved && (
          <Button size="sm" variant="outline" onClick={handleClear}>
            Clear Draft
          </Button>
        )}
      </HStack>

      <Form
        key={key}
        schema={Schema}
        initialValue={initialValue}
        onSubmit={async (data) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
          setHasSaved(true)
          alert('Draft saved! Refresh the page to verify persistence.')
        }}
      >
        <Stack gap={4}>
          <Form.Field.String name="title" />
          <Form.Field.Select name="category" options={categoryOptions} />
          <Form.Field.Textarea name="content" />
          <Form.Field.Switch name="published" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Save Draft</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
