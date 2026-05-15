'use client'

import { Box, Heading, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for masked fields
 */
const MaskedSchema = z.object({
  // Phone fields
  phoneRu: z
    .string()
    .min(1)
    .meta({
      ui: { title: 'Russian Phone', description: 'Format: +7 (999) 999-99-99' },
    }),

  phoneUs: z
    .string()
    .min(1)
    .meta({
      ui: { title: 'US Phone', description: 'Format: +1 (999) 999-9999' },
    }),

  phoneUk: z
    .string()
    .min(1)
    .meta({
      ui: { title: 'UK Phone', description: 'Format: +44 9999 999999' },
    }),

  // Masked input fields
  passport: z
    .string()
    .min(1)
    .meta({
      ui: {
        title: 'Passport (RU)',
        description: 'Format: 99 99 999999',
        mask: '99 99 999999',
      },
    }),

  inn: z
    .string()
    .min(1)
    .meta({
      ui: {
        title: 'INN',
        description: 'Tax ID (12 digits)',
        mask: '999999999999',
      },
    }),

  snils: z
    .string()
    .min(1)
    .meta({
      ui: {
        title: 'SNILS',
        description: 'Format: 999-999-999 99',
        mask: '999-999-999 99',
      },
    }),

  creditCard: z
    .string()
    .min(1)
    .meta({
      ui: { title: 'Credit Card', description: 'Format: 9999 9999 9999 9999' },
    }),

  expiryDate: z
    .string()
    .min(1)
    .meta({
      ui: { title: 'Expiry Date', description: 'Format: MM/YY' },
    }),

  cvv: z
    .string()
    .min(1)
    .meta({
      ui: { title: 'CVV', description: '3 or 4 digits' },
    }),
})

type MaskedFormData = z.infer<typeof MaskedSchema>

const initialValues: MaskedFormData = {
  phoneRu: '',
  phoneUs: '',
  phoneUk: '',
  passport: '',
  inn: '',
  snils: '',
  creditCard: '',
  expiryDate: '',
  cvv: '',
}

export default function MaskedDemoPage() {
  const [submittedData, setSubmittedData] = useState<MaskedFormData | null>(null)

  const handleSubmit = (data: MaskedFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout title="Masked Fields Demo" description="Form.Field.Phone and Form.Field.MaskedInput" maxW="800px">
      <Form initialValue={initialValues} schema={MaskedSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Phone Section */}
          <Box>
            <Heading size="md" mb={4}>
              Phone Fields
            </Heading>
            <VStack gap={4} align="stretch">
              <Form.Field.Phone name="phoneRu" country="RU" showFlag />

              <Form.Field.Phone name="phoneUs" country="US" showFlag />

              <Form.Field.Phone name="phoneUk" country="UK" showFlag />
            </VStack>
          </Box>

          {/* Documents Section */}
          <Box>
            <Heading size="md" mb={4}>
              Documents (Mask from Zod Schema)
            </Heading>
            <VStack gap={4} align="stretch">
              {/* Mask specified in props (also in Zod meta for documentation) */}
              <Form.Field.MaskedInput name="passport" mask="99 99 999999" />
              <Form.Field.MaskedInput name="inn" mask="999999999999" />
              <Form.Field.MaskedInput name="snils" mask="999-999-999 99" />
            </VStack>
          </Box>

          {/* Payment Section */}
          <Box>
            <Heading size="md" mb={4}>
              Payment (Mask from Props)
            </Heading>
            <VStack gap={4} align="stretch">
              <Form.Field.MaskedInput name="creditCard" mask="9999 9999 9999 9999" />
              <Form.Field.MaskedInput name="expiryDate" mask="99/99" />
              <Form.Field.MaskedInput name="cvv" mask="999" />
            </VStack>
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
