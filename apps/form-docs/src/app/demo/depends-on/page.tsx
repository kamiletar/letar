'use client'

import { Box, ChakraProvider, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { Form, FormDependsOn } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  entityType: z.string().meta({ ui: { title: 'Entity Type' } }),
  firstName: z
    .string()
    .optional()
    .meta({ ui: { title: 'First Name' } }),
  lastName: z
    .string()
    .optional()
    .meta({ ui: { title: 'Last Name' } }),
  companyName: z
    .string()
    .optional()
    .meta({ ui: { title: 'Company Name' } }),
  inn: z
    .string()
    .optional()
    .meta({ ui: { title: 'INN' } }),
})

export default function DependsOnDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Cascading Fields (DependsOn)</Heading>
          <Text color="fg.muted" mt={2}>
            Different form sections rendered based on a field value.
          </Text>
        </Box>

        <Form
          schema={Schema}
          initialValue={{ entityType: '', firstName: '', lastName: '', companyName: '', inn: '' }}
          onSubmit={async () => {
            /* noop */
          }}
        >
          <Stack gap={4}>
            <Form.Field.Select
              name="entityType"
              label="Entity Type"
              options={[
                { value: 'person', label: 'Individual' },
                { value: 'company', label: 'Company' },
              ]}
            />

            <FormDependsOn
              field="entityType"
              cases={{
                person: (
                  <Stack gap={4}>
                    <Form.Field.String name="firstName" label="First Name" />
                    <Form.Field.String name="lastName" label="Last Name" />
                  </Stack>
                ),
                company: (
                  <Stack gap={4}>
                    <Form.Field.String name="companyName" label="Company Name" />
                    <Form.Field.String name="inn" label="INN" />
                  </Stack>
                ),
              }}
              fallback={<Text color="fg.muted">Select an entity type above</Text>}
            />

            <Form.DebugValues />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>
      </VStack>
    </ChakraProvider>
  )
}
