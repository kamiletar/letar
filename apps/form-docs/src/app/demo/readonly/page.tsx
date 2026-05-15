'use client'

import { Box, ChakraProvider, defaultSystem, Heading, Text, VStack } from '@chakra-ui/react'
import { FormReadOnlyView } from '@letar/forms'
import { z } from 'zod/v4'

const UserSchema = z.object({
  name: z.string().meta({ ui: { title: 'Name' } }),
  email: z.string().meta({ ui: { title: 'Email' } }),
  role: z.string().meta({ ui: { title: 'Role' } }),
  isActive: z.boolean().meta({ ui: { title: 'Active' } }),
})

const sampleData = {
  name: 'John Smith',
  email: 'john@example.com',
  role: 'Administrator',
  isActive: true,
}

export default function ReadOnlyDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">ReadOnly View</Heading>
          <Text color="fg.muted" mt={2}>
            FormReadOnlyView renders form data as read-only text. Labels come from Zod .meta().
          </Text>
        </Box>

        <Box p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb={4}>Default</Heading>
          <FormReadOnlyView data={sampleData} schema={UserSchema} />
        </Box>

        <Box p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb={4}>Compact</Heading>
          <FormReadOnlyView data={sampleData} schema={UserSchema} compact />
        </Box>
      </VStack>
    </ChakraProvider>
  )
}
