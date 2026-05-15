'use client'

import { Box, ChakraProvider, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'Name', placeholder: 'Enter name' } }),
  age: z.number().meta({ ui: { title: 'Age' } }),
  tags: z.array(z.string()).meta({ ui: { title: 'Tags' } }),
  address: z.object({
    city: z.string().meta({ ui: { title: 'City' } }),
    zip: z.string().meta({ ui: { title: 'ZIP' } }),
  }),
})

export default function DebugValuesDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Debug Values</Heading>
          <Text color="fg.muted" mt={2}>
            Live JSON inspector of form values. Edit fields and see values update in real time.
          </Text>
        </Box>

        <Form
          schema={Schema}
          initialValue={{ name: 'John', age: 25, tags: ['dev'], address: { city: 'Moscow', zip: '101000' } }}
          onSubmit={async () => {
            /* noop */
          }}
        >
          <Stack gap={4}>
            <Form.Field.String name="name" />
            <Form.Field.Number name="age" />
            <Form.Group name="address">
              <Form.Field.String name="city" />
              <Form.Field.String name="zip" />
            </Form.Group>
            <Form.DebugValues title="Live Values" collapsed={3} />
            <Form.Button.Submit>Save</Form.Button.Submit>
          </Stack>
        </Form>
      </VStack>
    </ChakraProvider>
  )
}
