'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const AdvancedSchema = z.object({
  address: z
    .object({
      value: z.string(),
      data: z.record(z.string(), z.unknown()).optional(),
    })
    .optional()
    .meta({ ui: { title: 'Address (DaData)', description: 'Start typing to see suggestions (requires API key)' } }),
  addressSimple: z
    .string()
    .optional()
    .meta({ ui: { title: 'Address (Simple Mode)', description: 'Without API - just a text input with manual entry' } }),
  duration: z
    .number()
    .min(15, 'Minimum 15 minutes')
    .max(480, 'Maximum 8 hours')
    .meta({ ui: { title: 'Duration (HH:MM format)', description: 'Enter duration in hours and minutes' } }),
  durationMinutes: z
    .number()
    .min(5)
    .max(120)
    .meta({ ui: { title: 'Duration (Minutes only)', description: 'Enter duration in minutes' } }),
  appointmentAt: z
    .string()
    .min(1, 'Select date and time')
    .meta({ ui: { title: 'Appointment', description: 'Select date and time for your appointment' } }),
  eventStart: z
    .string()
    .optional()
    .meta({ ui: { title: 'Event Start (with min date)', description: 'Cannot select dates in the past' } }),
})

type AdvancedFormData = z.infer<typeof AdvancedSchema>

const initialData: AdvancedFormData = {
  address: undefined,
  addressSimple: 'г Москва, ул Тверская, д 1',
  duration: 60,
  durationMinutes: 30,
  appointmentAt: '',
  eventStart: '',
}

export default function AdvancedDemoPage() {
  const [submittedData, setSubmittedData] = useState<AdvancedFormData | null>(null)

  const handleSubmit = (data: AdvancedFormData) => {
    setSubmittedData(data)
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="xl" mb={2}>
            Advanced Fields Demo
          </Heading>
          <Text color="fg.muted">Address, Duration, DateTimePicker components</Text>
        </Box>

        <Form initialValue={initialData} schema={AdvancedSchema} onSubmit={handleSubmit}>
          <VStack gap={6} align="stretch">
            {/* Address Fields */}
            <Box>
              <Heading size="md" mb={4}>
                Address Fields
              </Heading>
              <VStack gap={4} align="stretch">
                <Form.Field.Address name="address" />
                <Form.Field.Address name="addressSimple" />
              </VStack>
            </Box>

            {/* Duration Fields */}
            <Box>
              <Heading size="md" mb={4}>
                Duration Fields
              </Heading>
              <VStack gap={4} align="stretch">
                <Form.Field.Duration name="duration" format="HH:MM" />
                <Form.Field.Duration name="durationMinutes" format="minutes" />
              </VStack>
            </Box>

            {/* DateTimePicker Fields */}
            <Box>
              <Heading size="md" mb={4}>
                DateTimePicker Fields
              </Heading>
              <VStack gap={4} align="stretch">
                <Form.Field.DateTimePicker name="appointmentAt" />
                <Form.Field.DateTimePicker name="eventStart" minDateTime={new Date()} />
              </VStack>
            </Box>

            <Form.Button.Submit>Submit</Form.Button.Submit>
          </VStack>
        </Form>

        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Submitted Data:
            </Heading>
            <Text as="pre" fontSize="sm" whiteSpace="pre-wrap" data-testid="submitted-data">
              {JSON.stringify(submittedData, null, 2)}
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
