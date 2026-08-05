'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'String', placeholder: 'Single-line text' } }),
  bio: z.string().meta({ ui: { title: 'Textarea', placeholder: 'Multi-line text...' } }),
  password: z.string().meta({ ui: { title: 'Password' } }),
})

export default function StringDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Form schema={Schema} initialValue={{ name: '', bio: '', password: '' }} onSubmit={(data) => setSubmitted(data)}>
        <Stack gap={4}>
          <Heading size="sm">String Fields</Heading>
          <Form.Field.String name="name" />
          <Form.Field.Textarea name="bio" />
          <Form.Field.Password name="password" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
          <SubmittedDataPreview data={submitted} />
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
