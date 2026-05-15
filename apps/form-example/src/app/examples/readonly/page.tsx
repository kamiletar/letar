'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { FormReadOnlyView } from '@letar/forms'
import { z } from 'zod/v4'

const UserSchema = z.object({
  name: z.string().meta({ ui: { title: 'Имя' } }),
  email: z.string().meta({ ui: { title: 'Email' } }),
  role: z.string().meta({ ui: { title: 'Роль' } }),
  isActive: z.boolean().meta({ ui: { title: 'Активен' } }),
  createdAt: z.date().meta({ ui: { title: 'Дата регистрации' } }),
})

const sampleData = {
  name: 'Иван Петров',
  email: 'ivan@example.com',
  role: 'Администратор',
  isActive: true,
  createdAt: new Date('2024-06-15'),
}

export default function ReadOnlyExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <Heading size="lg">Read-Only View</Heading>
        <Text color="fg.muted" mt={2}>FormReadOnlyView отображает данные как текст. Labels из Zod .meta().</Text>
      </Box>

      <Box p={6} borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb={4}>Профиль пользователя</Heading>
        <FormReadOnlyView data={sampleData} schema={UserSchema} />
      </Box>

      <Box p={6} borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb={4}>Компактный режим</Heading>
        <FormReadOnlyView data={sampleData} schema={UserSchema} compact />
      </Box>
    </VStack>
  )
}
