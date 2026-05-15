'use client'

import { Box, Card, Container, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// Schema for multi-step form
const RegistrationSchema = z.object({
  // Step 1: Personal info
  firstName: z.string().min(2, 'Minimum 2 characters'),
  lastName: z.string().min(2, 'Minimum 2 characters'),
  birthDate: z.string().optional(),

  // Step 2: Contact info
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),

  // Step 3: Account settings
  username: z.string().min(3, 'Minimum 3 characters'),
  notifications: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
})

type RegistrationData = z.infer<typeof RegistrationSchema>

const initialValues: RegistrationData = {
  firstName: '',
  lastName: '',
  birthDate: '',
  email: '',
  phone: '',
  username: '',
  notifications: true,
  theme: 'system',
}

export default function StepsDemoPage() {
  const handleSubmit = (data: RegistrationData) => {
    // eslint-disable-next-line no-console -- демо-приложение
    console.log('Form submitted:', data)
    alert('Registration complete!\n\n' + JSON.stringify(data, null, 2))
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={8} align="stretch">
        <Heading size="xl">Form.Steps Demo</Heading>
        <Text color="fg.muted">Multi-step form with validation on each step</Text>

        <Card.Root>
          <Card.Body>
            <Form initialValue={initialValues} schema={RegistrationSchema} onSubmit={handleSubmit}>
              <Form.Steps validateOnNext linear colorPalette="brand" animated>
                <Form.Steps.Indicator showDescriptions />

                <Box my={6}>
                  <Form.Steps.Step title="Personal" description="Your details">
                    <Stack gap={4}>
                      <Heading size="md">Personal Information</Heading>
                      <Form.Field.String name="firstName" label="First Name" required />
                      <Form.Field.String name="lastName" label="Last Name" required />
                      <Form.Field.Date name="birthDate" label="Birth Date" />
                    </Stack>
                  </Form.Steps.Step>

                  <Form.Steps.Step title="Contact" description="How to reach you">
                    <Stack gap={4}>
                      <Heading size="md">Contact Information</Heading>
                      <Form.Field.String name="email" label="Email" required />
                      <Form.Field.String name="phone" label="Phone" />
                    </Stack>
                  </Form.Steps.Step>

                  <Form.Steps.Step title="Account" description="Settings">
                    <Stack gap={4}>
                      <Heading size="md">Account Settings</Heading>
                      <Form.Field.String name="username" label="Username" required />
                      <Form.Field.Switch name="notifications" label="Enable notifications" />
                      <Form.Field.RadioGroup
                        name="theme"
                        label="Theme"
                        options={[
                          { value: 'light', label: 'Light' },
                          { value: 'dark', label: 'Dark' },
                          { value: 'system', label: 'System' },
                        ]}
                      />
                    </Stack>
                  </Form.Steps.Step>

                  <Form.Steps.CompletedContent>
                    <Stack gap={4} py={4}>
                      <Heading size="md" color="green.500">
                        All steps complete!
                      </Heading>
                      <Text>Review your information and click Submit to finish registration.</Text>
                    </Stack>
                  </Form.Steps.CompletedContent>
                </Box>

                <Form.Steps.Navigation prevLabel="Back" nextLabel="Continue" submitLabel="Create Account" />
              </Form.Steps>
            </Form>
          </Card.Body>
        </Card.Root>

        {/* Non-linear example with animation */}
        <Heading size="lg" mt={8}>
          Non-linear Steps (with animation)
        </Heading>
        <Text color="fg.muted">Click on any step to navigate directly. Animation duration: 0.5s</Text>

        <Card.Root>
          <Card.Body>
            <Form
              initialValue={{ step1Field: '', step2Field: '', step3Field: '' }}
              // eslint-disable-next-line no-console -- демо-приложение
              onSubmit={(data) => console.log('Non-linear form:', data)}
            >
              <Form.Steps colorPalette="teal" animated animationDuration={0.5}>
                <Form.Steps.Indicator />

                <Box my={6}>
                  <Form.Steps.Step title="Step 1">
                    <Form.Field.String name="step1Field" label="Step 1 Field" />
                  </Form.Steps.Step>

                  <Form.Steps.Step title="Step 2">
                    <Form.Field.String name="step2Field" label="Step 2 Field" />
                  </Form.Steps.Step>

                  <Form.Steps.Step title="Step 3">
                    <Form.Field.String name="step3Field" label="Step 3 Field" />
                  </Form.Steps.Step>
                </Box>

                <Form.Steps.Navigation />
              </Form.Steps>
            </Form>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
