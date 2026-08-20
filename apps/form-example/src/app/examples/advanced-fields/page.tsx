'use client'

import { PageH1 } from '@/components/page-h1'
import { Heading, Separator, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  // Rating варианты
  satisfaction: z
    .number()
    .min(1)
    .max(5)
    .meta({ ui: { title: 'Rating (default)' } }),
  quality: z
    .number()
    .min(1)
    .max(10)
    .meta({ ui: { title: 'Rating (10 stars, half values)' } }),

  // Slider варианты
  temperature: z
    .number()
    .min(-20)
    .max(50)
    .meta({ ui: { title: 'Temperature (-20° to 50°)' } }),
  brightness: z
    .number()
    .min(0)
    .max(100)
    .meta({ ui: { title: 'Brightness (step: 10)' } }),

  // Tags варианты
  skills: z.array(z.string()).meta({ ui: { title: 'Skills (max 5)' } }),
  languages: z.array(z.string()).meta({ ui: { title: 'Languages' } }),

  // FileUpload
  avatar: z
    .any()
    .optional()
    .meta({ ui: { title: 'Avatar (image only)' } }),
  documents: z
    .any()
    .optional()
    .meta({ ui: { title: 'Documents (multiple)' } }),
})

export default function AdvancedFieldsPage() {
  return (
    <Stack gap={6}>
      <div>
        <PageH1 size="lg">Advanced Fields</PageH1>
        <Text color="fg.muted">Extended configurations for Rating, Slider, Tags, and FileUpload.</Text>
      </div>

      <Form
        schema={Schema}
        initialValue={{
          satisfaction: 3,
          quality: 7,
          temperature: 22,
          brightness: 50,
          skills: ['React'],
          languages: [],
          avatar: undefined,
          documents: undefined,
        }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
      >
        <Stack gap={4}>
          <Heading size="sm">Rating Variants</Heading>
          <Form.Field.Rating name="satisfaction" />
          <Form.Field.Rating name="quality" count={10} allowHalf />

          <Separator />
          <Heading size="sm">Slider Variants</Heading>
          <Form.Field.Slider name="temperature" />
          <Form.Field.Slider name="brightness" step={10} showValue />

          <Separator />
          <Heading size="sm">Tags</Heading>
          <Form.Field.Tags name="skills" maxTags={5} />
          <Form.Field.Tags name="languages" />

          <Separator />
          <Heading size="sm">File Upload</Heading>
          <Form.Field.FileUpload name="avatar" accept="image/*" />
          <Form.Field.FileUpload name="documents" maxFiles={5} />

          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
