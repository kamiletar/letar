'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for Slider field
 */
const SliderSchema = z.object({
  // Basic slider
  volume: z
    .number()
    .min(0)
    .max(100)
    .meta({
      ui: { title: 'Volume', description: 'Adjust the volume level' },
    }),

  // Slider with step
  brightness: z
    .number()
    .min(0)
    .max(100)
    .meta({
      ui: { title: 'Brightness' },
    }),

  // Slider with marks
  progress: z
    .number()
    .min(0)
    .max(100)
    .meta({
      ui: { title: 'Progress' },
    }),

  // Temperature slider
  temperature: z
    .number()
    .min(-20)
    .max(40)
    .meta({
      ui: { title: 'Temperature', description: 'Set target temperature' },
    }),

  // Price range
  price: z
    .number()
    .min(0)
    .max(1000)
    .meta({
      ui: { title: 'Max Price' },
    }),
})

type SliderFormData = z.infer<typeof SliderSchema>

const initialValues: SliderFormData = {
  volume: 50,
  brightness: 75,
  progress: 25,
  temperature: 22,
  price: 500,
}

const progressMarks = [
  { value: 0, label: '0%' },
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100%' },
]

const temperatureMarks = [
  { value: -20, label: '-20°' },
  { value: 0, label: '0°' },
  { value: 20, label: '20°' },
  { value: 40, label: '40°' },
]

export default function SliderDemoPage() {
  const [submittedData, setSubmittedData] = useState<SliderFormData | null>(null)

  const handleSubmit = (data: SliderFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout title="Slider Demo" description="Form.Field.Slider - Slider input field for numeric ranges">
      <Form initialValue={initialValues} schema={SliderSchema} onSubmit={handleSubmit}>
        <VStack gap={8} align="stretch">
          {/* Basic slider with showValue */}
          <Box>
            <Form.Field.Slider name="volume" showValue colorPalette="blue" />
          </Box>

          {/* Slider with step */}
          <Box>
            <Form.Field.Slider name="brightness" showValue step={5} colorPalette="yellow" />
          </Box>

          {/* Slider with labeled marks */}
          <Box>
            <Form.Field.Slider name="progress" marks={progressMarks} colorPalette="green" />
          </Box>

          {/* Temperature slider with negative values */}
          <Box>
            <Form.Field.Slider
              name="temperature"
              min={-20}
              max={40}
              step={1}
              marks={temperatureMarks}
              showValue
              colorPalette="red"
            />
          </Box>

          {/* Price slider with origin center */}
          <Box>
            <Form.Field.Slider name="price" min={0} max={1000} step={50} showValue marks={[0, 250, 500, 750, 1000]} />
          </Box>

          {/* Different sizes */}
          <Box>
            <Text fontWeight="medium" mb={4}>
              Size variants:
            </Text>
            <VStack gap={4} align="stretch">
              <Form.Field.Slider name="volume" label="Small (sm)" size="sm" />
              <Form.Field.Slider name="volume" label="Medium (md)" size="md" />
              <Form.Field.Slider name="volume" label="Large (lg)" size="lg" />
            </VStack>
          </Box>

          {/* Different variants */}
          <Box>
            <Text fontWeight="medium" mb={4}>
              Variant styles:
            </Text>
            <VStack gap={4} align="stretch">
              <Form.Field.Slider name="volume" label="Outline" variant="outline" colorPalette="purple" />
              <Form.Field.Slider name="volume" label="Solid" variant="solid" colorPalette="purple" />
            </VStack>
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
