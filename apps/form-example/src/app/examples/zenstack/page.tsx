'use client'

import { PageH1 } from '@/components/page-h1'
import { ProductCreateFormSchema } from '@/generated/form-schemas'
import { Code, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'

export default function ZenstackPage() {
  return (
    <Stack gap={6}>
      <div>
        <PageH1 size="lg">ZenStack Plugin</PageH1>
        <Text color="fg.muted">
          Schemas generated from <Code>schema.zmodel</Code> with{' '}
          <Code>@letar/zenstack-form-plugin</Code>. The form below is built entirely from generated code.{' '}
          <Code>sku</Code> and <Code>website</Code> validate via native ZModel attributes (
          <Code>@startsWith</Code>/<Code>@trim</Code>/<Code>@upper</Code>/<Code>@url</Code>) — not a single line of
          hand-written Zod.
        </Text>
      </div>

      <Form.FromSchema
        schema={ProductCreateFormSchema}
        initialValue={{ name: '', price: 0, status: 'DRAFT', tags: [], sku: 'SKU-0000' }}
        onSubmit={async (data) => alert(`Product created!\n${JSON.stringify(data, null, 2)}`)}
        submitLabel="Create Product"
        debug
      />
    </Stack>
  )
}
