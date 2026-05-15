'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for Autocomplete field
 */
const AutocompleteSchema = z.object({
  // Basic autocomplete with static suggestions
  city: z
    .string()
    .min(1)
    .meta({
      ui: { title: 'City', placeholder: 'Start typing a city name...' },
    }),

  // Autocomplete for programming languages
  language: z.string().meta({
    ui: { title: 'Programming Language', placeholder: 'Type to search...' },
  }),

  // Autocomplete with custom value (always allowed)
  customField: z.string().meta({
    ui: { title: 'Custom Value', description: 'Type your own value or select from suggestions' },
  }),
})

type AutocompleteFormData = z.infer<typeof AutocompleteSchema>

const cityOptions = [
  'Moscow',
  'Saint Petersburg',
  'Novosibirsk',
  'Yekaterinburg',
  'Kazan',
  'Nizhny Novgorod',
  'Chelyabinsk',
  'Samara',
  'Omsk',
  'Rostov-on-Don',
  'Ufa',
  'Krasnoyarsk',
  'Voronezh',
  'Perm',
  'Volgograd',
]

const languageOptions = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C#',
  'C++',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'Scala',
  'Haskell',
  'Elixir',
]

const customOptions = ['Option A', 'Option B', 'Option C', 'Custom Value 1', 'Custom Value 2']

const initialValues: AutocompleteFormData = {
  city: '',
  language: '',
  customField: '',
}

export default function AutocompleteDemoPage() {
  const [submittedData, setSubmittedData] = useState<AutocompleteFormData | null>(null)

  const handleSubmit = (data: AutocompleteFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Autocomplete Demo"
      description="Form.Field.Autocomplete - text input with suggestions (always allows custom values)"
    >
      <Form initialValue={initialValues} schema={AutocompleteSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Basic autocomplete */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              City Selection
            </Text>
            <Form.Field.Autocomplete name="city" suggestions={cityOptions} />
          </Box>

          {/* Autocomplete with min chars */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              Programming Language (min 2 chars)
            </Text>
            <Form.Field.Autocomplete
              name="language"
              suggestions={languageOptions}
              minChars={2}
              emptyMessage="No matching languages"
            />
          </Box>

          {/* Custom value demonstration */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              Custom Value Field
            </Text>
            <Form.Field.Autocomplete
              name="customField"
              suggestions={customOptions}
              placeholder="Type anything or select..."
              helperText="You can type any value, not just from the list"
            />
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
