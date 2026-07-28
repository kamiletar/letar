'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'

import { DarkReassuranceNote, SafetyNetBlock } from '../../_components/safety-net-block'

/**
 * Dev-страница визуальной проверки safety-net (этап 5.6.4) — только для разработки.
 * Показывает оба блока в текущей локали (кризисный + мягкая формулировка).
 */
export default function SafetyNetDevPage() {
  const locale = useLocale()
  const isRu = locale === 'ru'

  return (
    <Container maxW="2xl" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="lg">Safety-net — dev-превью</Heading>

        <Box>
          <Text fontWeight="bold" mb={2}>
            SafetyNetBlock (DPR/BAR/BOR ≥ 60%)
          </Text>
          <SafetyNetBlock isRu={isRu} />
        </Box>

        <Box>
          <Text fontWeight="bold" mb={2}>
            DarkReassuranceNote (тёмные шкалы ≥ 60%)
          </Text>
          <DarkReassuranceNote isRu={isRu} />
        </Box>
      </VStack>
    </Container>
  )
}
