'use client'

import { PageH1 } from '@/components/page-h1'
import { Heading, Image, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const ConsentSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Full Name' } }),
    email: z
      .string()
      .email()
      .meta({ ui: { title: 'Email' } }),
    signature: z.string().min(1, 'Please sign to confirm'),
  })
  .strip()

export default function SignatureExamplePage() {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="2xl">
      <Stack gap={2}>
        <PageH1 size="xl">Signature Field</PageH1>
        <Text color="fg.muted">Consent form with digital signature. Draw or type your name.</Text>
      </Stack>

      <Form
        initialValue={{ name: '', email: '', signature: '' }}
        schema={ConsentSchema}
        onSubmit={(data) => setSignatureUrl(data.signature)}
      >
        <Form.Field.String name="name" />
        <Form.Field.String name="email" />
        <Form.Field.Signature
          name="signature"
          label="I agree to the terms"
          placeholder="Sign to confirm"
          clearLabel="Clear signature"
        />
        <Form.Button.Submit>Submit Consent</Form.Button.Submit>
      </Form>

      {signatureUrl && signatureUrl.startsWith('data:') && (
        <Stack gap={2}>
          <Heading size="sm">Captured Signature</Heading>
          <Image src={signatureUrl} alt="Signature" borderWidth="1px" borderRadius="md" maxW="300px" />
        </Stack>
      )}
    </Stack>
  )
}
