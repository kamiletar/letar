'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'

import { z } from 'zod/v4'

const Schema = z.object({
  framework: z.string().meta({ ui: { title: 'Select' } }),
  plan: z.enum(['free', 'pro', 'enterprise']).meta({ ui: { title: 'RadioGroup' } }),
  agree: z.boolean().meta({ ui: { title: 'I agree to terms' } }),
  notifications: z.boolean().meta({ ui: { title: 'Enable notifications' } }),
})

const frameworkOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
]

const planOptions = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export default function SelectDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ framework: '', plan: 'free', agree: false, notifications: true }}
        onSubmit={async () => {}}
      >
        <Stack gap={4}>
          <Heading size="sm">Selection Fields</Heading>
          <Form.Field.Select name="framework" options={frameworkOptions} />
          <Form.Field.RadioGroup name="plan" options={planOptions} />
          <Form.Field.Checkbox name="agree" />
          <Form.Field.Switch name="notifications" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
