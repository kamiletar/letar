'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  phone: z.string().meta({ ui: { title: 'Phone' } }),
  pin: z.string().meta({ ui: { title: 'PIN Code' } }),
  color: z.string().meta({ ui: { title: 'Color' } }),
})

export default function SpecializedDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ phone: '', pin: '', color: '#059669' }}
        onSubmit={(data) => setSubmitted(data)}
      >
        <Stack gap={4}>
          <Heading size="sm">Specialized Fields</Heading>
          <Form.Field.Phone name="phone" />
          <Form.Field.PinInput name="pin" />
          <Form.Field.ColorPicker name="color" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
          <SubmittedDataPreview data={submitted} />
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
