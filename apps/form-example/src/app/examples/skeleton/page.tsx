'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { FormSkeleton } from '@letar/forms'
import { z } from 'zod/v4'

const ProductSchema = z.object({
  name: z.string().meta({ ui: { title: 'Название' } }),
  description: z.string().meta({ ui: { title: 'Описание' } }),
  price: z.number().meta({ ui: { title: 'Цена' } }),
  category: z.string().meta({ ui: { title: 'Категория' } }),
  isActive: z.boolean().meta({ ui: { title: 'Активен' } }),
})

export default function SkeletonExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="800px" mx="auto" py={8}>
      <Box>
        <PageH1 size="lg">Form Skeleton</PageH1>
        <Text color="fg.muted" mt={2}>
          Loading state пока загружаются данные формы.
        </Text>
      </Box>

      <HStack gap={8} align="start">
        <Box flex={1} p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="sm" mb={4}>
            Из Zod-схемы (5 полей)
          </Heading>
          <FormSkeleton fields={ProductSchema} />
        </Box>

        <Box flex={1} p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="sm" mb={4}>
            Число полей: 3
          </Heading>
          <FormSkeleton fields={3} showSubmit />
        </Box>
      </HStack>
    </VStack>
  )
}
