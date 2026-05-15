'use client'

import { Box, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { FormComparison } from '@letar/forms'
import { z } from 'zod/v4'

const UserSchema = z.object({
  name: z.string().meta({ ui: { title: 'Имя' } }),
  email: z.string().meta({ ui: { title: 'Email' } }),
  role: z.string().meta({ ui: { title: 'Роль' } }),
  department: z.string().meta({ ui: { title: 'Отдел' } }),
})

const before = { name: 'Иван Петров', email: 'ivan@old.ru', role: 'Менеджер', department: 'Продажи' }
const after = { name: 'Иван Петров', email: 'ivan@new.ru', role: 'Руководитель', department: 'Продажи' }

export default function ComparisonExamplePage() {
  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <Heading size="lg">Сравнение данных</Heading>
        <Text color="fg.muted" mt={2}>
          FormComparison показывает diff: что изменилось между двумя версиями данных.
        </Text>
      </Box>

      <Stack gap={6}>
        <Box>
          <Heading size="sm" mb={3}>
            Все поля
          </Heading>
          <FormComparison original={before} current={after} schema={UserSchema} />
        </Box>

        <Box>
          <Heading size="sm" mb={3}>
            Только изменённые
          </Heading>
          <FormComparison original={before} current={after} schema={UserSchema} onlyChanged />
        </Box>
      </Stack>
    </VStack>
  )
}
