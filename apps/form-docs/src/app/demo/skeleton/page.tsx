'use client'

import { Box, ChakraProvider, defaultSystem, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { FormSkeleton } from '@letar/forms'
import { z } from 'zod/v4'

const ProductSchema = z.object({
  name: z.string().meta({ ui: { title: 'Name' } }),
  description: z.string().meta({ ui: { title: 'Description' } }),
  price: z.number().meta({ ui: { title: 'Price' } }),
  category: z.string().meta({ ui: { title: 'Category' } }),
  isActive: z.boolean().meta({ ui: { title: 'Active' } }),
})

export default function SkeletonDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="800px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Form Skeleton</Heading>
          <Text color="fg.muted" mt={2}>
            Loading state while form data is being fetched.
          </Text>
        </Box>

        <HStack gap={8} align="start">
          <Box flex={1} p={6} borderWidth="1px" borderRadius="lg">
            <Heading size="sm" mb={4}>From Zod Schema (5 fields)</Heading>
            <FormSkeleton fields={ProductSchema} />
          </Box>

          <Box flex={1} p={6} borderWidth="1px" borderRadius="lg">
            <Heading size="sm" mb={4}>Field Count: 3</Heading>
            <FormSkeleton fields={3} showSubmit />
          </Box>
        </HStack>
      </VStack>
    </ChakraProvider>
  )
}
