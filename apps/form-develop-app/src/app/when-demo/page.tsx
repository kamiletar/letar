'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for Form.When conditional rendering
 */
const ConditionalSchema = z.object({
  // Customer type selection
  customerType: z.enum(['individual', 'company']).meta({
    ui: { title: 'Customer Type' },
  }),

  // Individual fields
  firstName: z
    .string()
    .optional()
    .meta({
      ui: { title: 'First Name' },
    }),
  lastName: z
    .string()
    .optional()
    .meta({
      ui: { title: 'Last Name' },
    }),

  // Company fields
  companyName: z
    .string()
    .optional()
    .meta({
      ui: { title: 'Company Name' },
    }),
  inn: z
    .string()
    .optional()
    .meta({
      ui: { title: 'INN (Tax ID)' },
    }),

  // Subscription settings
  hasPremium: z.boolean().meta({
    ui: { title: 'Premium Subscription' },
  }),
  premiumTheme: z
    .enum(['dark', 'light', 'system'])
    .optional()
    .meta({
      ui: { title: 'Premium Theme' },
    }),

  // Age-based content
  age: z
    .number()
    .min(0)
    .max(120)
    .meta({
      ui: { title: 'Age' },
    }),
  adultContent: z
    .boolean()
    .optional()
    .meta({
      ui: { title: 'Show adult content' },
    }),

  // Role-based permissions
  role: z.enum(['user', 'moderator', 'admin']).meta({
    ui: { title: 'User Role' },
  }),
  canDeleteUsers: z
    .boolean()
    .optional()
    .meta({
      ui: { title: 'Can delete users' },
    }),
  canEditSettings: z
    .boolean()
    .optional()
    .meta({
      ui: { title: 'Can edit settings' },
    }),

  // Nested group example
  settings: z.object({
    notifications: z.boolean().meta({
      ui: { title: 'Enable notifications' },
    }),
    frequency: z
      .enum(['daily', 'weekly', 'monthly'])
      .optional()
      .meta({
        ui: { title: 'Notification frequency' },
      }),
  }),
})

type ConditionalFormData = z.infer<typeof ConditionalSchema>

const initialValues: ConditionalFormData = {
  customerType: 'individual',
  firstName: '',
  lastName: '',
  companyName: '',
  inn: '',
  hasPremium: false,
  premiumTheme: undefined,
  age: 25,
  adultContent: false,
  role: 'user',
  canDeleteUsers: false,
  canEditSettings: false,
  settings: {
    notifications: false,
    frequency: undefined,
  },
}

export default function WhenDemoPage() {
  const [submittedData, setSubmittedData] = useState<ConditionalFormData | null>(null)

  const handleSubmit = (data: ConditionalFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Form.When Demo"
      description="Conditional field rendering based on other field values"
      maxW="800px"
    >
      <Form initialValue={initialValues} schema={ConditionalSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Example 1: is - exact value match */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold" mb={4}>
              Example 1: is - Exact value match
            </Text>
            <VStack gap={4} align="stretch">
              <Form.Field.SegmentedGroup
                name="customerType"
                options={[
                  { value: 'individual', label: 'Individual' },
                  { value: 'company', label: 'Company' },
                ]}
              />

              <Form.When field="customerType" is="individual">
                <VStack gap={3} align="stretch" p={3} bg="blue.50" borderRadius="md">
                  <Text fontSize="sm" color="blue.600">
                    Individual customer fields:
                  </Text>
                  <Form.Field.String name="firstName" />
                  <Form.Field.String name="lastName" />
                </VStack>
              </Form.When>

              <Form.When field="customerType" is="company">
                <VStack gap={3} align="stretch" p={3} bg="green.50" borderRadius="md">
                  <Text fontSize="sm" color="green.600">
                    Company fields:
                  </Text>
                  <Form.Field.String name="companyName" />
                  <Form.Field.String name="inn" />
                </VStack>
              </Form.When>
            </VStack>
          </Box>

          {/* Example 2: fallback content */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold" mb={4}>
              Example 2: fallback - Alternative content
            </Text>
            <VStack gap={4} align="stretch">
              <Form.Field.Switch name="hasPremium" />

              <Form.When
                field="hasPremium"
                is={true}
                fallback={
                  <Box p={3} bg="gray.100" borderRadius="md" _dark={{ bg: 'gray.800' }}>
                    <Text color="fg.muted">Upgrade to Premium to access theme settings</Text>
                  </Box>
                }
              >
                <Box p={3} bg="purple.50" borderRadius="md">
                  <Form.Field.SegmentedGroup
                    name="premiumTheme"
                    options={[
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                      { value: 'system', label: 'System' },
                    ]}
                  />
                </Box>
              </Form.When>
            </VStack>
          </Box>

          {/* Example 3: condition - custom function */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold" mb={4}>
              Example 3: condition - Custom function
            </Text>
            <VStack gap={4} align="stretch">
              <Form.Field.Number name="age" min={0} max={120} />

              <Form.When field="age" condition={(age: number) => age >= 18}>
                <Box p={3} bg="orange.50" borderRadius="md">
                  <Form.Field.Checkbox name="adultContent" />
                </Box>
              </Form.When>

              <Form.When field="age" condition={(age: number) => age < 18}>
                <Box p={3} bg="red.50" borderRadius="md">
                  <Text color="red.600" fontSize="sm">
                    Adult content settings are not available for users under 18
                  </Text>
                </Box>
              </Form.When>
            </VStack>
          </Box>

          {/* Example 4: in - array of values */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold" mb={4}>
              Example 4: in - Array of values
            </Text>
            <VStack gap={4} align="stretch">
              <Form.Field.SegmentedGroup
                name="role"
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'moderator', label: 'Moderator' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />

              <Form.When field="role" in={['moderator', 'admin']}>
                <Box p={3} bg="yellow.50" borderRadius="md">
                  <Text fontSize="sm" color="yellow.700" mb={2}>
                    Moderator/Admin permissions:
                  </Text>
                  <Form.Field.Checkbox name="canEditSettings" />
                </Box>
              </Form.When>

              <Form.When field="role" is="admin">
                <Box p={3} bg="red.50" borderRadius="md">
                  <Text fontSize="sm" color="red.700" mb={2}>
                    Admin only:
                  </Text>
                  <Form.Field.Checkbox name="canDeleteUsers" />
                </Box>
              </Form.When>
            </VStack>
          </Box>

          {/* Example 5: Nested in Form.Group */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold" mb={4}>
              Example 5: Nested in Form.Group
            </Text>
            <Form.Group name="settings">
              <VStack gap={4} align="stretch">
                <Form.Field.Switch name="notifications" />

                <Form.When field="notifications" is={true}>
                  <Box p={3} bg="teal.50" borderRadius="md">
                    <Form.Field.SegmentedGroup
                      name="frequency"
                      options={[
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' },
                      ]}
                    />
                  </Box>
                </Form.When>
              </VStack>
            </Form.Group>
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
