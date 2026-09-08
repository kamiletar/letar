'use client'

/**
 * Статичная демонстрация form-mcp: как AI-агент (Claude Code и т.п.) генерирует форму
 * через MCP-инструменты `@letar/form-mcp`. Ничего здесь не ходит в реальный MCP-сервер —
 * form-mcp работает по stdio для агентов в редакторе, у него нет HTTP-эндпоинта для браузера.
 * Все блоки ниже — статичный, но дословный слепок реального вывода инструментов (см.
 * `libs/form-mcp/src/index.ts` — `generateFormCode`/`mapFieldTypeToZod`).
 */

import { PageH1 } from '@/components/page-h1'
import { Badge, Box, Card, Code, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const LIST_FIELDS_CALL = `list_fields({ category: "text" })`

const LIST_FIELDS_RESULT = `[
  { "name": "String", "fullName": "Form.Field.String", "category": "text" },
  { "name": "Textarea", "fullName": "Form.Field.Textarea", "category": "text" }
]`

const GENERATE_FORM_CALL = `generate_form({
  formName: "ContactForm",
  withSchema: true,
  fields: [
    { name: "name", type: "String", label: "Full Name", required: true },
    { name: "email", type: "String", label: "Email", required: true },
    { name: "message", type: "Textarea", label: "Message" }
  ]
})`

const GENERATED_CODE = `import { z } from 'zod/v4'
import { useAppForm } from '@letar/forms'

const ContactFormSchema = z.object({
  name: z.string().min(1, 'Required field'),
  email: z.string().min(1, 'Required field'),
  message: z.string(),
}).strip()

type ContactFormValues = z.infer<typeof ContactFormSchema>

export function ContactForm() {
  const form = useAppForm({
    schema: ContactFormSchema,
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
    onSubmit: async ({ value }) => {
      // TODO: call Server Action
      console.log(value)
    },
  })

  return (
    <Form form={form}>
      <Form.Field.String name="name" label="Full Name" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Field.Textarea name="message" label="Message" />
      <Form.Button.Submit>Save</Form.Button.Submit>
    </Form>
  )
}`

// Тот же набор полей, что в GENERATED_CODE выше — рендерится живьём через актуальный
// декларативный API, чтобы показать, что сгенерированный код действительно работает.
const ContactFormSchema = z.object({
  name: z.string().min(1, 'Required field').meta({ ui: { title: 'Full Name' } }),
  email: z.string().min(1, 'Required field').meta({ ui: { title: 'Email' } }),
  message: z.string().optional().meta({ ui: { title: 'Message' } }),
})

function StepCard({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <Card.Root p={5}>
      <Card.Body>
        <HStack gap={3} mb={3}>
          <Badge colorPalette="brand" borderRadius="full" px={2.5}>
            {number}
          </Badge>
          <Heading size="md">{title}</Heading>
        </HStack>
        {children}
      </Card.Body>
    </Card.Root>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <Code p={3} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
      {children}
    </Code>
  )
}

export default function McpDemoPage() {
  return (
    <Stack gap={8}>
      <div>
        <PageH1 size="lg">MCP Demo</PageH1>
        <Text color="fg.muted">
          How an AI coding agent (Claude Code, Cursor, etc.) generates a @letar/forms form using the{' '}
          <Code>@letar/form-mcp</Code> server — static walkthrough, no live MCP connection from the browser.
        </Text>
      </div>

      <StepCard number={1} title="You describe what you need">
        <Text color="fg.muted">
          &quot;Create a contact form with name, email, and a message field&quot;
        </Text>
      </StepCard>

      <StepCard number={2} title="The agent looks up available fields">
        <Stack gap={2}>
          <Text color="fg.muted" fontSize="sm">
            Tool call:
          </Text>
          <CodeBlock>{LIST_FIELDS_CALL}</CodeBlock>
          <Text color="fg.muted" fontSize="sm">
            Result:
          </Text>
          <CodeBlock>{LIST_FIELDS_RESULT}</CodeBlock>
        </Stack>
      </StepCard>

      <StepCard number={3} title="The agent generates the form">
        <Stack gap={2}>
          <Text color="fg.muted" fontSize="sm">
            Tool call:
          </Text>
          <CodeBlock>{GENERATE_FORM_CALL}</CodeBlock>
          <Text color="fg.muted" fontSize="sm">
            Result — ready-to-use component code:
          </Text>
          <CodeBlock>{GENERATED_CODE}</CodeBlock>
        </Stack>
      </StepCard>

      <Separator />

      <StepCard number={4} title="Live equivalent">
        <Text color="fg.muted" mb={4}>
          Same three fields, rendered with the current declarative <Code>Form</Code>{' '}
          API (the generated code above uses the older <Code>useAppForm</Code> style — both produce the same result).
        </Text>

        <Box maxW="md">
          <Form
            schema={ContactFormSchema}
            initialValue={{ name: '', email: '', message: '' }}
            onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
          >
            <Stack gap={4}>
              <Form.Field.String name="name" />
              <Form.Field.String name="email" />
              <Form.Field.Textarea name="message" />

              <Form.DebugValues showInProduction />
              <Form.Button.Submit>Save</Form.Button.Submit>
            </Stack>
          </Form>
        </Box>
      </StepCard>
    </Stack>
  )
}
