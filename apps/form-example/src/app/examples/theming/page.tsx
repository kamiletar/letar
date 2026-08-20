'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, ChakraProvider, Code, createSystem, defaultConfig, defineConfig, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// Кастомная тема с другими цветами
const purpleConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#faf5ff' },
          100: { value: '#f3e8ff' },
          200: { value: '#e9d5ff' },
          300: { value: '#d8b4fe' },
          400: { value: '#c084fc' },
          500: { value: '#a855f7' },
          600: { value: '#9333ea' },
          700: { value: '#7e22ce' },
          800: { value: '#6b21a8' },
          900: { value: '#581c87' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'brand.solid': { value: { _light: '{colors.brand.600}', _dark: '{colors.brand.400}' } },
        'brand.fg': { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.300}' } },
        'brand.muted': { value: { _light: '{colors.brand.100}', _dark: '{colors.brand.900}' } },
      },
    },
  },
})

const purpleSystem = createSystem(defaultConfig, purpleConfig)

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'Name', placeholder: 'Enter your name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
  plan: z.enum(['starter', 'growth', 'scale']).meta({ ui: { title: 'Plan' } }),
  agree: z.boolean().meta({ ui: { title: 'Accept terms' } }),
})

const planOptions = [
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'scale', label: 'Scale' },
]

export default function ThemingPage() {
  return (
    <Stack gap={6}>
      <div>
        <PageH1 size="lg">Custom Theming</PageH1>
        <Text color="fg.muted">
          Forms adapt to your Chakra UI theme. This example uses a purple color palette via{' '}
          <Code>createSystem(defineConfig(...))</Code>.
        </Text>
      </div>

      <Box borderWidth="1px" borderRadius="xl" p={6}>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          Default emerald theme (from layout):
        </Text>
        <Form
          schema={Schema}
          initialValue={{ name: '', email: '', plan: 'starter', agree: false }}
          onSubmit={() => {
            // демо: отправка не требуется
          }}
        >
          <Stack gap={4}>
            <Form.Field.String name="name" />
            <Form.Field.String name="email" />
            <Form.Field.RadioGroup name="plan" options={planOptions} />
            <Form.Field.Checkbox name="agree" />
            <Form.DebugValues showInProduction />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>
      </Box>

      <Box borderWidth="1px" borderRadius="xl" p={6}>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          Custom purple theme:
        </Text>
        <ChakraProvider value={purpleSystem}>
          <Form
            schema={Schema}
            initialValue={{ name: '', email: '', plan: 'growth', agree: false }}
            onSubmit={() => {
              // демо: отправка не требуется
            }}
          >
            <Stack gap={4}>
              <Form.Field.String name="name" />
              <Form.Field.String name="email" />
              <Form.Field.RadioGroup name="plan" options={planOptions} />
              <Form.Field.Checkbox name="agree" />
              <Form.Button.Submit>Submit</Form.Button.Submit>
            </Stack>
          </Form>
        </ChakraProvider>
      </Box>
    </Stack>
  )
}
