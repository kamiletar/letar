'use client'

import { Box, Button, Container, Heading, HStack, VStack } from '@chakra-ui/react'
import { useState } from 'react'

import { HexagramChart } from '../../_components/hexagram-chart'
import type { PersonalityTypeCode } from '../../_data/personality-types'

/** Демо-профили для визуальной проверки гексаграммы (этап 5.2) */
const DEMO_PROFILES: Record<string, Partial<Record<PersonalityTypeCode, number>>> = {
  Сбалансированный: { HUM: 65, KAN: 55, FAI: 60, MAC: 45, NAR: 50, ANT: 40, SAD: 20, MAS: 15 },
  Светлый: { HUM: 90, KAN: 85, FAI: 80, MAC: 15, NAR: 20, ANT: 10, SAD: 5, MAS: 10 },
  'Тёмный + аура': { HUM: 25, KAN: 30, FAI: 15, MAC: 85, NAR: 75, ANT: 70, SAD: 80, MAS: 45 },
  'Конструктивный Архитектор': { HUM: 50, KAN: 75, FAI: 45, MAC: 80, NAR: 40, ANT: 30, SAD: 10, MAS: 5 },
  'Полная гексаграмма': { HUM: 100, KAN: 100, FAI: 100, MAC: 100, NAR: 100, ANT: 100, SAD: 100, MAS: 100 },
  Нулевой: { HUM: 0, KAN: 0, FAI: 0, MAC: 0, NAR: 0, ANT: 0, SAD: 0, MAS: 0 },
}

/**
 * Dev-страница визуальной проверки HexagramChart — только для разработки.
 * Переключение профилей проверяет и прогрессивную анимацию перестроения.
 */
export default function HexagramDevPage() {
  const [profileKey, setProfileKey] = useState<string>('Сбалансированный')

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={6}>
        <Heading size="lg">HexagramChart — dev-превью</Heading>
        <HStack gap={2} flexWrap="wrap" justify="center">
          {Object.keys(DEMO_PROFILES).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={key === profileKey ? 'solid' : 'outline'}
              onClick={() => setProfileKey(key)}
            >
              {key}
            </Button>
          ))}
        </HStack>
        <Box w="100%" p={6} borderRadius="lg" borderWidth="1px" borderColor="border">
          <HexagramChart scores={DEMO_PROFILES[profileKey]!} title={`Профиль: ${profileKey}`} showNarrative />
        </Box>
      </VStack>
    </Container>
  )
}
