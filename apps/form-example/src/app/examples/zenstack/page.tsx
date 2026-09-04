'use client'

import { PageH1 } from '@/components/page-h1'
import { ProductCreateFormSchema } from '@/generated/form-schemas'
import { EventCreateFormSchema } from '@/generated/form-schemas/Event.form'
import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'

export default function ZenstackPage() {
  return (
    <Stack gap={10}>
      <div>
        <PageH1 size="lg">ZenStack Plugin</PageH1>
        <Text color="fg.muted">
          Schemas generated from <Code>schema.zmodel</Code> with{' '}
          <Code>@letar/zenstack-form-plugin</Code>. Both forms below are built entirely from generated code — not a
          single line of hand-written Zod.
        </Text>
      </div>

      <Stack gap={4}>
        <Heading size="md">Native attributes</Heading>
        <Text color="fg.muted">
          <Code>sku</Code> and <Code>website</Code> validate via native ZModel attributes (
          <Code>@startsWith</Code>/<Code>@trim</Code>/<Code>@upper</Code>/<Code>@url</Code>).
        </Text>
        <Form.FromSchema
          schema={ProductCreateFormSchema}
          initialValue={{ name: '', price: 0, status: 'DRAFT', tags: [], sku: 'SKU-0000' }}
          onSubmit={async (data) => alert(`Product created!\n${JSON.stringify(data, null, 2)}`)}
          submitLabel="Create Product"
          debug
        />
      </Stack>

      <Stack gap={4}>
        <Heading size="md">Cross-field validation (@@validate)</Heading>
        <Text color="fg.muted">
          The <Code>Event</Code> model declares{' '}
          <Code>@@validate(endsAt &gt; startsAt, "End date must be after start date", ["endsAt"])</Code>{' '}
          — try setting an end date before the start date, the error attaches to the <Code>endsAt</Code> field.
        </Text>
        <Form.FromSchema
          schema={EventCreateFormSchema}
          initialValue={{ name: '', startsAt: new Date(), endsAt: new Date() }}
          onSubmit={async (data) => alert(`Event created!\n${JSON.stringify(data, null, 2)}`)}
          submitLabel="Create Event"
          debug
        />
      </Stack>
    </Stack>
  )
}
