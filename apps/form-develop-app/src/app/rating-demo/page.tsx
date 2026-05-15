'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for Rating field
 */
const RatingSchema = z.object({
  // Basic 5-star rating
  productRating: z
    .number()
    .min(1, 'Please provide a rating')
    .max(5)
    .meta({
      ui: { title: 'Product Rating', description: 'Rate this product' },
    }),

  // Service quality rating
  serviceQuality: z
    .number()
    .min(0)
    .max(5)
    .meta({
      ui: { title: 'Service Quality' },
    }),

  // 10-star rating
  movieScore: z
    .number()
    .min(0)
    .max(10)
    .meta({
      ui: { title: 'Movie Score', description: 'Rate out of 10' },
    }),

  // Half-value rating
  difficulty: z
    .number()
    .min(0)
    .max(5)
    .meta({
      ui: { title: 'Difficulty Level' },
    }),
})

type RatingFormData = z.infer<typeof RatingSchema>

const initialValues: RatingFormData = {
  productRating: 0,
  serviceQuality: 3,
  movieScore: 7,
  difficulty: 2.5,
}

export default function RatingDemoPage() {
  const [submittedData, setSubmittedData] = useState<RatingFormData | null>(null)

  const handleSubmit = (data: RatingFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout title="Rating Demo" description="Form.Field.Rating - Star rating input field">
      <Form initialValue={initialValues} schema={RatingSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Basic 5-star rating (required) */}
          <Box>
            <Form.Field.Rating name="productRating" colorPalette="yellow" />
          </Box>

          {/* Service quality with different color */}
          <Box>
            <Form.Field.Rating name="serviceQuality" colorPalette="orange" />
          </Box>

          {/* 10-star movie rating */}
          <Box>
            <Form.Field.Rating name="movieScore" count={10} colorPalette="blue" size="sm" />
          </Box>

          {/* Half-value rating */}
          <Box>
            <Form.Field.Rating name="difficulty" allowHalf colorPalette="red" />
          </Box>

          {/* Size variants */}
          <Box>
            <Text fontWeight="medium" mb={4}>
              Size variants:
            </Text>
            <VStack gap={4} align="start">
              <Form.Field.Rating name="productRating" label="Extra Small (xs)" size="xs" />
              <Form.Field.Rating name="productRating" label="Small (sm)" size="sm" />
              <Form.Field.Rating name="productRating" label="Medium (md)" size="md" />
              <Form.Field.Rating name="productRating" label="Large (lg)" size="lg" />
            </VStack>
          </Box>

          {/* Color variants */}
          <Box>
            <Text fontWeight="medium" mb={4}>
              Color palettes:
            </Text>
            <VStack gap={2} align="start">
              <Form.Field.Rating name="productRating" label="Yellow" colorPalette="yellow" size="sm" />
              <Form.Field.Rating name="productRating" label="Orange" colorPalette="orange" size="sm" />
              <Form.Field.Rating name="productRating" label="Red" colorPalette="red" size="sm" />
              <Form.Field.Rating name="productRating" label="Pink" colorPalette="pink" size="sm" />
              <Form.Field.Rating name="productRating" label="Purple" colorPalette="purple" size="sm" />
              <Form.Field.Rating name="productRating" label="Blue" colorPalette="blue" size="sm" />
            </VStack>
          </Box>

          <Form.Button.Submit>Submit Ratings</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
