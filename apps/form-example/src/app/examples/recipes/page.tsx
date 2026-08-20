'use client'

import { PageH1 } from '@/components/page-h1'
import { Card, Heading, Separator, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// ─── Login ──────────────────────────────────────────────
const LoginSchema = z.object({
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'user@example.com' } }),
  password: z
    .string()
    .min(6)
    .meta({ ui: { title: 'Password' } }),
  remember: z.boolean().meta({ ui: { title: 'Remember me' } }),
})

// ─── Registration ───────────────────────────────────────
const RegisterSchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Full Name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
  password: z
    .string()
    .min(8)
    .meta({ ui: { title: 'Password' } }),
  terms: z.literal(true, { error: 'You must accept the terms' }).meta({
    ui: { title: 'I accept the Terms of Service' },
  }),
})

// ─── Contact ────────────────────────────────────────────
const ContactSchema = z.object({
  name: z.string().meta({ ui: { title: 'Your Name', placeholder: 'John Doe' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'john@example.com' } }),
  subject: z.enum(['support', 'sales', 'feedback']).meta({ ui: { title: 'Subject' } }),
  message: z
    .string()
    .min(10)
    .meta({ ui: { title: 'Message', placeholder: 'How can we help?' } }),
})

const subjectOptions = [
  { value: 'support', label: 'Technical Support' },
  { value: 'sales', label: 'Sales Inquiry' },
  { value: 'feedback', label: 'Feedback' },
]

// ─── Settings ───────────────────────────────────────────
const SettingsSchema = z.object({
  displayName: z.string().meta({ ui: { title: 'Display Name' } }),
  language: z.enum(['en', 'ru', 'de']).meta({ ui: { title: 'Language' } }),
  emailNotifications: z.boolean().meta({ ui: { title: 'Email notifications' } }),
  pushNotifications: z.boolean().meta({ ui: { title: 'Push notifications' } }),
  theme: z.enum(['light', 'dark', 'system']).meta({ ui: { title: 'Theme' } }),
})

const langOptions = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Russian' },
  { value: 'de', label: 'German' },
]

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export default function RecipesPage() {
  return (
    <Stack gap={8}>
      <div>
        <PageH1 size="lg">Form Recipes</PageH1>
        <Text color="fg.muted">Ready-to-use form patterns for common use cases.</Text>
      </div>

      {/* Login */}
      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Login Form
          </Heading>
          <Form
            schema={LoginSchema}
            initialValue={{ email: '', password: '', remember: false }}
            onSubmit={async (data) => {
              await new Promise((r) => setTimeout(r, 1500))
              alert(`Login: ${data.email}`)
            }}
          >
            <Stack gap={3}>
              <Form.Field.String name="email" />
              <Form.Field.Password name="password" />
              <Form.Field.Checkbox name="remember" />
              <Form.DebugValues showInProduction />
              <Form.Button.Submit loadingText="Signing in...">Sign In</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>

      <Separator />

      {/* Registration */}
      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Registration Form
          </Heading>
          <Form
            schema={RegisterSchema}
            initialValue={{ name: '', email: '', password: '', terms: false as unknown as true }}
            onSubmit={async (data) => {
              await new Promise((r) => setTimeout(r, 1500))
              alert(`Registered: ${data.name}`)
            }}
          >
            <Stack gap={3}>
              <Form.Field.String name="name" />
              <Form.Field.String name="email" />
              <Form.Field.Password name="password" />
              <Form.Field.Checkbox name="terms" />
              <Form.Errors />
              <Form.Button.Submit loadingText="Creating...">Create Account</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>

      <Separator />

      {/* Contact */}
      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Contact Form
          </Heading>
          <Form
            schema={ContactSchema}
            initialValue={{ name: '', email: '', subject: 'support', message: '' }}
            onSubmit={async (data) => {
              await new Promise((r) => setTimeout(r, 1500))
              alert(`Message sent: ${data.subject}`)
            }}
          >
            <Stack gap={3}>
              <Form.Field.String name="name" />
              <Form.Field.String name="email" />
              <Form.Field.Select name="subject" options={subjectOptions} />
              <Form.Field.Textarea name="message" />
              <Form.Button.Submit loadingText="Sending...">Send Message</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>

      <Separator />

      {/* Settings */}
      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Settings Form
          </Heading>
          <Form
            schema={SettingsSchema}
            initialValue={{
              displayName: 'John Doe',
              language: 'en',
              emailNotifications: true,
              pushNotifications: false,
              theme: 'system',
            }}
            onSubmit={async (data) => {
              await new Promise((r) => setTimeout(r, 1500))
              alert(`Settings saved: ${JSON.stringify(data)}`)
            }}
          >
            <Stack gap={3}>
              <Form.Field.String name="displayName" />
              <Form.Field.Select name="language" options={langOptions} />
              <Form.Field.Switch name="emailNotifications" />
              <Form.Field.Switch name="pushNotifications" />
              <Form.Field.RadioGroup name="theme" options={themeOptions} orientation="horizontal" />
              <Form.DebugValues showInProduction />
              <Form.Button.Submit loadingText="Saving...">Save Settings</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}
