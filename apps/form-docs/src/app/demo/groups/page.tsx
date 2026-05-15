'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'

import { z } from 'zod/v4'

const Schema = z.object({
  address: z.object({
    city: z.string().meta({ ui: { title: 'City', placeholder: 'New York' } }),
    street: z.string().meta({ ui: { title: 'Street', placeholder: '123 Main St' } }),
    zip: z.string().meta({ ui: { title: 'ZIP', placeholder: '10001' } }),
  }),
  phones: z.array(
    z.object({
      number: z.string().meta({ ui: { title: 'Phone Number' } }),
    })
  ),
})

export default function GroupsDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ address: { city: '', street: '', zip: '' }, phones: [{ number: '' }] }}
        onSubmit={async () => {}}
      >
        <Stack gap={4}>
          <Heading size="sm">Nested Group</Heading>
          <Form.Group name="address">
            <Stack gap={3}>
              <Form.Field.String name="city" />
              <Form.Field.String name="street" />
              <Form.Field.String name="zip" />
            </Stack>
          </Form.Group>

          <Heading size="sm">Dynamic Array</Heading>
          <Form.Group.List name="phones">
            <Form.Field.Phone name="number" />
            <Form.Group.List.Button.Add>Add Phone</Form.Group.List.Button.Add>
          </Form.Group.List>

          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
