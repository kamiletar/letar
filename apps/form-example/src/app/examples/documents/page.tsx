'use client'

import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

export default function DocumentsExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="2xl">
      <Stack gap={2}>
        <Heading size="xl">Russian Documents</Heading>
        <Text color="fg.muted">
          Company registration form with INN, KPP, OGRN, bank details, SNILS. All fields have input masks and checksum
          validation.
        </Text>
      </Stack>

      <Form
        initialValue={{ inn: '', kpp: '', ogrn: '', bik: '', account: '', snils: '' }}
        onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
      >
        <Heading size="md">Company Details</Heading>
        <Form.Document.INN name="inn" label="INN" required />
        <Form.Document.KPP name="kpp" label="KPP" />
        <Form.Document.OGRN name="ogrn" label="OGRN" />

        <Heading size="md" mt={4}>
          Bank Details
        </Heading>
        <Form.Document.BIK name="bik" label="BIK" />
        <Form.Document.BankAccount name="account" label="Bank Account" />

        <Heading size="md" mt={4}>
          Personal
        </Heading>
        <Form.Document.SNILS name="snils" label="SNILS" />

        <Form.Button.Submit>Register Company</Form.Button.Submit>
      </Form>

      {result && (
        <Code whiteSpace="pre" p={4}>
          {result}
        </Code>
      )}
    </Stack>
  )
}
