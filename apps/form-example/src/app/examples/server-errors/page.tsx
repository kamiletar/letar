'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, Code, HStack, Text, VStack } from '@chakra-ui/react'
import { mapServerErrors } from '@letar/forms'
import { useState } from 'react'

const ERRORS: Record<string, unknown> = {
  'Prisma P2002': { code: 'P2002', message: 'Unique', meta: { target: ['email'] } },
  'ZenStack policy': { reason: 'rejected-by-policy' },
  'Zod flatten': { formErrors: ['Пароли не совпадают'], fieldErrors: { email: ['Некорректный'] } },
  ActionResult: { success: false, error: 'Email уже занят' },
}

export default function ServerErrorsExamplePage() {
  const [selected, setSelected] = useState('Prisma P2002')
  const error = ERRORS[selected]
  const mapped = mapServerErrors(error, {
    fieldMap: { email: { field: 'email', message: 'Этот email уже зарегистрирован' } },
  })

  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <PageH1 size="lg">Server Error Mapping</PageH1>
        <Text color="fg.muted" mt={2}>
          mapServerErrors() автоматически определяет формат и маппит на поля формы.
        </Text>
      </Box>

      <HStack gap={2} flexWrap="wrap">
        {Object.keys(ERRORS).map((key) => (
          <Box
            key={key}
            as="button"
            px={3}
            py={1.5}
            fontSize="sm"
            borderRadius="md"
            bg={selected === key ? 'blue.600' : 'gray.subtle'}
            color={selected === key ? 'white' : 'fg.default'}
            onClick={() => setSelected(key)}
          >
            {key}
          </Box>
        ))}
      </HStack>

      <Box>
        <Text fontSize="xs" fontWeight="bold" color="red.500" mb={1}>
          Вход:
        </Text>
        <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={3} borderRadius="md">
          {JSON.stringify(error, null, 2)}
        </Code>
      </Box>

      <Box>
        <Text fontSize="xs" fontWeight="bold" color="green.500" mb={1}>
          Результат:
        </Text>
        <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={3} borderRadius="md">
          {JSON.stringify(mapped, null, 2)}
        </Code>
      </Box>
    </VStack>
  )
}
