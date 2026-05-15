'use client'

import { ChakraProvider, defaultSystem, Heading, Image, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const Schema = z
  .object({
    name: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Full Name' } }),
    signature: z.string().min(1, 'Signature is required'),
  })
  .strip()

export default function SignatureDemoPage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Stack gap={8} p={8} maxW="3xl" mx="auto">
        <Heading size="2xl">Signature Field Demo</Heading>
        <Text color="fg.muted">Draw with mouse/finger or type your name in cursive.</Text>

        <Form initialValue={{ name: '', signature: '' }} schema={Schema} onSubmit={(data) => setResult(data.signature)}>
          <Form.Field.String name="name" />
          <Form.Field.Signature name="signature" label="Your Signature" placeholder="Sign here" />
          <Form.Button.Submit>Sign Document</Form.Button.Submit>
        </Form>

        {result && result.startsWith('data:') && (
          <Stack gap={2}>
            <Heading size="md">Captured Signature</Heading>
            <Image
              src={result}
              alt="Signature"
              border="1px solid"
              borderColor="border"
              borderRadius="md"
              maxW="400px"
            />
          </Stack>
        )}
      </Stack>
    </ChakraProvider>
  )
}
