'use client'

import { ChakraProvider, defaultSystem, Heading, Separator, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'String', placeholder: 'Text input' } }),
  bio: z.string().meta({ ui: { title: 'Textarea', placeholder: 'Multi-line...' } }),
  age: z.number().meta({ ui: { title: 'Number' } }),
  framework: z.string().meta({ ui: { title: 'Select' } }),
  agree: z.boolean().meta({ ui: { title: 'Checkbox' } }),
  birthday: z.string().meta({ ui: { title: 'Date' } }),
  phone: z.string().meta({ ui: { title: 'Phone' } }),
})

const frameworkOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
]

export default function FieldsAllDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ name: '', bio: '', age: 0, framework: '', agree: false, birthday: '', phone: '' }}
        onSubmit={async () => {}}
      >
        <Stack gap={4}>
          <Heading size="sm">Text</Heading>
          <Form.Field.String name="name" />
          <Form.Field.Textarea name="bio" />
          <Separator />
          <Heading size="sm">Number</Heading>
          <Form.Field.Number name="age" />
          <Separator />
          <Heading size="sm">Selection</Heading>
          <Form.Field.Select name="framework" options={frameworkOptions} />
          <Form.Field.Checkbox name="agree" />
          <Separator />
          <Heading size="sm">Date &amp; Specialized</Heading>
          <Form.Field.Date name="birthday" />
          <Form.Field.Phone name="phone" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
