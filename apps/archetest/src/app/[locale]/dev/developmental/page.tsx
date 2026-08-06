'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'

import { DevelopmentalProfileCard } from '../../_components/developmental-profile-card'
import { ProfileDetails } from '../../_components/profile-details'
import { StatesBlock } from '../../_components/states-block'
import { ALL_SCALE_CODES, STATE_CODES } from '../../_data/personality-types'

/**
 * Dev-страница визуальной проверки developmental-фрейма (этап 5.6.1) — только для разработки.
 * Показывает карточку «Суперсила → Ловушка → Практики» для всех шкал ядра (как юзер, без клиники),
 * блок «Состояния» с примерными баллами BAR/DPR и ipsative-ранжирование с интервалами (5.6).
 */
export default function DevelopmentalDevPage() {
  // Примерные баллы: состояния выражены, чтобы блок «Состояния» отрисовался
  const sampleScores = Object.fromEntries(
    ALL_SCALE_CODES.map((code) => [code, STATE_CODES.includes(code) ? 65 : 50]),
  ) as Record<(typeof ALL_SCALE_CODES)[number], number>

  const traitCodes = ALL_SCALE_CODES.filter((code) => !STATE_CODES.includes(code))

  // Профиль для ipsative-превью: топ-2 статистически неразличимы (перекрытие интервалов
  // при n=40), третья черта — в отдельной группе (тай-нота должна быть между 1 и 2, но не 2 и 3)
  const ipsativeScores = Object.fromEntries(
    ALL_SCALE_CODES.map((code) => [code, STATE_CODES.includes(code) ? 65 : 15]),
  ) as Record<(typeof ALL_SCALE_CODES)[number], number>
  ipsativeScores.MAC = 72
  ipsativeScores.SZD = 66
  ipsativeScores.OBC = 30
  const ipsativeCounts = Object.fromEntries(ALL_SCALE_CODES.map((code) => [code, 40])) as Record<
    (typeof ALL_SCALE_CODES)[number],
    number
  >

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="lg">Developmental-фрейм — dev-превью (5.6.1)</Heading>

        <Box>
          <Text fontWeight="bold" mb={2}>
            Ipsative-ранжирование с 95%-интервалами (5.6): MAC и SZD неразличимы, OBC — отдельная группа
          </Text>
          <ProfileDetails scores={ipsativeScores} relevantCounts={ipsativeCounts} />
        </Box>

        <Box>
          <Text fontWeight="bold" mb={2}>
            Блок «Состояния» (BAR/DPR как состояния, не черты)
          </Text>
          <StatesBlock scores={sampleScores} threshold={40} />
        </Box>

        <Box>
          <Text fontWeight="bold" mb={2}>
            Карточки черт (Суперсила → Ловушка → Практики), взгляд юзера — без клиники
          </Text>
          <VStack gap={4} align="stretch">
            {traitCodes.map((code, i) => (
              <DevelopmentalProfileCard
                key={code}
                code={code}
                rank={i + 1}
                score={sampleScores[code]}
                showClinicalOverride={false}
              />
            ))}
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
