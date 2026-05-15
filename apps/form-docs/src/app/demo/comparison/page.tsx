'use client'

import { Box, ChakraProvider, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { FormComparison } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'Name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
  role: z.string().meta({ ui: { title: 'Role' } }),
  bio: z.string().meta({ ui: { title: 'Bio' } }),
})

const original = { name: 'John Doe', email: 'john@old.com', role: 'user', bio: 'Developer' }
const current = { name: 'John Doe', email: 'john@new.com', role: 'admin', bio: 'Developer' }

export default function ComparisonDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Form Comparison</Heading>
          <Text color="fg.muted" mt={2}>
            Diff view showing what changed between two versions of data.
          </Text>
        </Box>

        <Stack gap={6}>
          <Box>
            <Heading size="sm" mb={3}>
              All Fields
            </Heading>
            <FormComparison original={original} current={current} schema={Schema} />
          </Box>

          <Box>
            <Heading size="sm" mb={3}>
              Only Changed
            </Heading>
            <FormComparison original={original} current={current} schema={Schema} onlyChanged />
          </Box>

          <Box>
            <Heading size="sm" mb={3}>
              With Excluded Fields
            </Heading>
            <FormComparison original={original} current={current} schema={Schema} exclude={['bio']} />
          </Box>
        </Stack>
      </VStack>
    </ChakraProvider>
  )
}
