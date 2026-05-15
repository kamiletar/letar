'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for DateRange field
 */
const DateRangeSchema = z.object({
  // Basic date range
  period: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .meta({
      ui: { title: 'Period', description: 'Select a date range' },
    }),

  // Date range with presets
  reportPeriod: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .meta({
      ui: { title: 'Report Period' },
    }),

  // Vertical orientation
  vacationDates: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .meta({
      ui: { title: 'Vacation Dates' },
    }),
})

type DateRangeFormData = z.infer<typeof DateRangeSchema>

const initialValues: DateRangeFormData = {
  period: { start: '', end: '' },
  reportPeriod: { start: '', end: '' },
  vacationDates: { start: '', end: '' },
}

export default function DateRangeDemoPage() {
  const [submittedData, setSubmittedData] = useState<DateRangeFormData | null>(null)

  const handleSubmit = (data: DateRangeFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="DateRange Demo"
      description="Form.Field.DateRange - select a date range with optional presets"
      maxW="700px"
    >
      <Form initialValue={initialValues} schema={DateRangeSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Basic date range */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              Basic DateRange
            </Text>
            <Form.Field.DateRange name="period" startLabel="From" endLabel="To" />
          </Box>

          {/* Date range with presets */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              DateRange with Presets
            </Text>
            <Form.Field.DateRange
              name="reportPeriod"
              label="Report Period"
              startLabel="Start Date"
              endLabel="End Date"
              presets={['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear']}
            />
          </Box>

          {/* Vertical orientation */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              Vertical Orientation
            </Text>
            <Form.Field.DateRange
              name="vacationDates"
              label="Vacation Period"
              startLabel="Check-in"
              endLabel="Check-out"
              orientation="vertical"
              presets={['thisWeek', 'thisMonth']}
            />
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
