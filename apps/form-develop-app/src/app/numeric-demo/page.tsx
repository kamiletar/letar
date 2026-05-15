'use client'

import { Box, Heading, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for numeric fields
 */
const NumericSchema = z.object({
  // NumberInput fields
  quantity: z
    .number()
    .min(1)
    .max(100)
    .meta({
      ui: { title: 'Quantity', description: 'Number of items (1-100)' },
    }),

  temperature: z
    .number()
    .min(-50)
    .max(50)
    .meta({
      ui: { title: 'Temperature', description: 'Temperature in Celsius' },
    }),

  // Currency fields
  priceRub: z
    .number()
    .min(0)
    .meta({
      ui: { title: 'Price (RUB)', description: 'Price in Russian Rubles' },
    }),

  priceUsd: z
    .number()
    .min(0)
    .meta({
      ui: { title: 'Price (USD)', description: 'Price in US Dollars' },
    }),

  priceEur: z
    .number()
    .min(0)
    .meta({
      ui: { title: 'Price (EUR)', description: 'Price in Euros' },
    }),

  // Percentage fields
  discount: z
    .number()
    .min(0)
    .max(100)
    .meta({
      ui: { title: 'Discount', description: 'Discount percentage' },
    }),

  taxRate: z
    .number()
    .min(0)
    .max(100)
    .meta({
      ui: { title: 'Tax Rate', description: 'Tax rate with decimals' },
    }),

  margin: z
    .number()
    .min(0)
    .max(50)
    .meta({
      ui: { title: 'Profit Margin', description: 'Maximum 50%' },
    }),
})

type NumericFormData = z.infer<typeof NumericSchema>

const initialValues: NumericFormData = {
  quantity: 1,
  temperature: 20,
  priceRub: 1500,
  priceUsd: 99.99,
  priceEur: 49.5,
  discount: 10,
  taxRate: 20,
  margin: 25,
}

export default function NumericDemoPage() {
  const [submittedData, setSubmittedData] = useState<NumericFormData | null>(null)

  const handleSubmit = (data: NumericFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Numeric Fields Demo"
      description="Form.Field.NumberInput, Form.Field.Currency, Form.Field.Percentage"
      maxW="800px"
    >
      <Form initialValue={initialValues} schema={NumericSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* NumberInput Section */}
          <Box>
            <Heading size="md" mb={4}>
              NumberInput
            </Heading>
            <VStack gap={4} align="stretch">
              <Form.Field.NumberInput name="quantity" min={1} max={100} step={1} allowMouseWheel />

              <Form.Field.NumberInput
                name="temperature"
                min={-50}
                max={50}
                step={0.5}
                formatOptions={{
                  style: 'unit',
                  unit: 'celsius',
                  unitDisplay: 'short',
                }}
              />
            </VStack>
          </Box>

          {/* Currency Section */}
          <Box>
            <Heading size="md" mb={4}>
              Currency
            </Heading>
            <VStack gap={4} align="stretch">
              <Form.Field.Currency name="priceRub" currency="RUB" />
              <Form.Field.Currency name="priceUsd" currency="USD" />
              <Form.Field.Currency name="priceEur" currency="EUR" />
            </VStack>
          </Box>

          {/* Percentage Section */}
          <Box>
            <Heading size="md" mb={4}>
              Percentage
            </Heading>
            <VStack gap={4} align="stretch">
              <Form.Field.Percentage name="discount" />
              <Form.Field.Percentage name="taxRate" />
              <Form.Field.Percentage name="margin" max={50} />
            </VStack>
          </Box>

          {/* Size Variants */}
          <Box>
            <Heading size="md" mb={4}>
              Size Variants
            </Heading>
            <VStack gap={4} align="stretch">
              <Form.Field.NumberInput name="quantity" label="Extra Small (xs)" size="xs" />
              <Form.Field.NumberInput name="quantity" label="Small (sm)" size="sm" />
              <Form.Field.NumberInput name="quantity" label="Medium (md)" size="md" />
              <Form.Field.NumberInput name="quantity" label="Large (lg)" size="lg" />
            </VStack>
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
