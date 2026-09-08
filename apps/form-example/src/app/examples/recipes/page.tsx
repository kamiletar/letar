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

// ─── Profile Edit ───────────────────────────────────────
const ProfileEditSchema = z.object({
  name: z.string().min(2).meta({ ui: { title: 'Full Name' } }),
  bio: z
    .string()
    .max(280)
    .optional()
    .meta({ ui: { title: 'Bio', placeholder: 'Tell us about yourself' } }),
  website: z.url().optional().meta({ ui: { title: 'Website' } }),
  publicProfile: z.boolean().meta({ ui: { title: 'Make profile public' } }),
})

// ─── Checkout ───────────────────────────────────────────
const CheckoutSchema = z.object({
  fullName: z.string().min(2).meta({ ui: { title: 'Full Name' } }),
  address: z.string().min(5).meta({ ui: { title: 'Shipping Address' } }),
  city: z.string().min(2).meta({ ui: { title: 'City' } }),
  zip: z.string().min(3).meta({ ui: { title: 'ZIP Code' } }),
  card: z.object({
    number: z.string(),
    expiry: z.string(),
    cvc: z.string(),
  }).meta({ ui: { title: 'Payment Card' } }),
})

// ─── Feedback ───────────────────────────────────────────
const FeedbackSchema = z.object({
  rating: z.number().optional().meta({ ui: { title: 'How do you rate our service?' } }),
  comment: z
    .string()
    .optional()
    .meta({ ui: { title: 'Comments', placeholder: 'What could we improve?' } }),
  wouldRecommend: z.boolean().meta({ ui: { title: 'I would recommend this to a friend' } }),
})

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

      <Separator />

      {/* Profile Edit */}
      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Profile Edit Form
          </Heading>
          <Form
            schema={ProfileEditSchema}
            initialValue={{ name: 'John Doe', bio: '', website: '', publicProfile: true }}
            onSubmit={async (data) => {
              await new Promise((r) => setTimeout(r, 1500))
              alert(`Profile saved: ${data.name}`)
            }}
          >
            <Stack gap={3}>
              <Form.Field.String name="name" />
              <Form.Field.Textarea name="bio" />
              <Form.Field.String name="website" />
              <Form.Field.Switch name="publicProfile" />
              <Form.DebugValues showInProduction />
              <Form.Button.Submit loadingText="Saving...">Save Profile</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>

      <Separator />

      {/* Checkout */}
      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Checkout Form
          </Heading>
          <Form
            schema={CheckoutSchema}
            initialValue={{
              fullName: '',
              address: '',
              city: '',
              zip: '',
              card: { number: '', expiry: '', cvc: '' },
            }}
            onSubmit={async (data) => {
              await new Promise((r) => setTimeout(r, 1500))
              alert(`Order placed for: ${data.fullName}`)
            }}
          >
            <Stack gap={3}>
              <Form.Field.String name="fullName" />
              <Form.Field.String name="address" />
              <Form.Field.String name="city" />
              <Form.Field.String name="zip" />
              <Form.Field.CreditCard name="card" layout="inline" />
              <Form.Button.Submit loadingText="Placing order...">Pay</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>

      <Separator />

      {/* Feedback */}
      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Feedback Form
          </Heading>
          <Form
            schema={FeedbackSchema}
            initialValue={{ rating: undefined, comment: '', wouldRecommend: true }}
            onSubmit={async (data) => {
              await new Promise((r) => setTimeout(r, 1500))
              alert(`Feedback submitted: rating ${data.rating}`)
            }}
          >
            <Stack gap={3}>
              <Form.Field.Likert
                name="rating"
                anchors={['Terrible', 'Bad', 'OK', 'Good', 'Excellent']}
              />
              <Form.Field.Textarea name="comment" />
              <Form.Field.Checkbox name="wouldRecommend" />
              <Form.DebugValues showInProduction />
              <Form.Button.Submit loadingText="Sending...">Submit Feedback</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}
