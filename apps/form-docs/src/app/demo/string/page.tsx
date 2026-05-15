'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'

import { z } from 'zod/v4'

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'String', placeholder: 'Single-line text' } }),
  bio: z.string().meta({ ui: { title: 'Textarea', placeholder: 'Multi-line text...' } }),
  password: z.string().meta({ ui: { title: 'Password' } }),
})

export default function StringDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Form schema={Schema} initialValue={{ name: '', bio: '', password: '' }} onSubmit={async () => {}}>
        <Stack gap={4}>
          <Heading size="sm">String Fields</Heading>
          <Form.Field.String name="name" />
          <Form.Field.Textarea name="bio" />
          <Form.Field.Password name="password" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
