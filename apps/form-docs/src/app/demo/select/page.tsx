'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  framework: z.string().meta({ ui: { title: 'Select' } }),
  plan: z.enum(['free', 'pro', 'enterprise']).meta({ ui: { title: 'RadioGroup' } }),
  agree: z.boolean().meta({ ui: { title: 'I agree to terms' } }),
  notifications: z.boolean().meta({ ui: { title: 'Enable notifications' } }),
  category: z.string().meta({ ui: { title: 'Select with onCreate' } }),
})

const frameworkOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
]

/** Имитация окна создания записи в приложении: задержка вместо диалога */
function fakeCreateDialog(): Promise<{ label: string; value: string }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ label: 'New category', value: `new-${Date.now()}` }), 400)
  })
}

const categoryOptions = [
  { value: 'roof', label: 'Roofing' },
  { value: 'walls', label: 'Walls' },
]

const planOptions = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export default function SelectDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ framework: '', plan: 'free', agree: false, notifications: true, category: '' }}
        onSubmit={(data) => setSubmitted(data)}
      >
        <Stack gap={4}>
          <Heading size="sm">Selection Fields</Heading>
          <Form.Field.Select name="framework" options={frameworkOptions} />
          <Form.Field.Select name="category" options={categoryOptions} onCreate={fakeCreateDialog} />
          <Form.Field.RadioGroup name="plan" options={planOptions} />
          <Form.Field.Checkbox name="agree" />
          <Form.Field.Switch name="notifications" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
          <SubmittedDataPreview data={submitted} />
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
