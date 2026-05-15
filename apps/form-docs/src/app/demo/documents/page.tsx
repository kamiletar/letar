'use client'

import { ChakraProvider, Code, defaultSystem, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

export default function DocumentsDemoPage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Stack gap={8} p={8} maxW="3xl" mx="auto">
        <Heading size="2xl">Russian Documents Demo</Heading>
        <Text color="fg.muted">Fields with input masks and checksum validation for Russian documents.</Text>

        <Form
          initialValue={{ inn: '', kpp: '', ogrn: '', bik: '', snils: '', passport: '' }}
          onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
        >
          <Form.Document.INN name="inn" label="INN" />
          <Form.Document.KPP name="kpp" label="KPP" />
          <Form.Document.OGRN name="ogrn" label="OGRN" />
          <Form.Document.BIK name="bik" label="BIK" />
          <Form.Document.SNILS name="snils" label="SNILS" />
          <Form.Document.Passport name="passport" label="Passport" />
          <Form.Button.Submit>Verify</Form.Button.Submit>
        </Form>

        {result && (
          <Code whiteSpace="pre" p={4}>
            {result}
          </Code>
        )}
      </Stack>
    </ChakraProvider>
  )
}
