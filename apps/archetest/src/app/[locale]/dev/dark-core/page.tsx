'use client'

import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

import { ALL_SCALE_CODES, type PersonalityTypeCode, STATE_CODES } from '../../_data/personality-types'
import { computeDarkCore } from '../../_lib/dark-core'
import { computeIpsativeRanking } from '../../_lib/ipsative'
import type { ScaleConfidence } from '../../_lib/scoring-core'
import { DarkCoreBlock } from '../../cabinet/[clientId]/_components/dark-core-block'

/**
 * Dev-страница визуальной проверки блока «Тёмное ядро» (Фаза 3) — только для разработки.
 * Покрывает ВСЕ пять структурных веток: even / flavored / polarized / muted / insufficient
 * (в /dev/experimental четвёртый квадрант не покрыт — здесь эту недоработку не повторяем).
 */
export default function DarkCoreDevPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const base = Object.fromEntries(ALL_SCALE_CODES.map((code) => [code, 35])) as Record<PersonalityTypeCode, number>
  const counts = Object.fromEntries(ALL_SCALE_CODES.map((code) => [code, 40])) as Record<PersonalityTypeCode, number>
  const confidence = Object.fromEntries(ALL_SCALE_CODES.map((code) => [code, 'moderate' as ScaleConfidence])) as Record<
    PersonalityTypeCode,
    ScaleConfidence
  >

  const scenarios: { title: string; scores: Record<PersonalityTypeCode, number>; counts?: typeof counts }[] = [
    {
      title: 'Ровное ядро (все четыре шкалы близко к общему уровню)',
      scores: { ...base, MAC: 45, NAR: 45, ANT: 45, SAD: 45 },
    },
    {
      title: 'Выраженный вкус (макиавеллизм резко выше — регрессионный сценарий 90/30/30/30)',
      scores: { ...base, MAC: 90, NAR: 30, ANT: 30, SAD: 30 },
    },
    {
      title: 'Разнонаправленные вкусы (нарциссизм и психопатия выше ядра)',
      scores: { ...base, MAC: 30, NAR: 70, ANT: 70, SAD: 30 },
    },
    {
      title: 'Приглушённый компонент (нарциссизм ниже ядра — ближе всего к «чистому» D)',
      scores: { ...base, MAC: 55, NAR: 20, ANT: 55, SAD: 55 },
    },
    {
      title: 'Данных недостаточно (измерены только две шкалы тетрады)',
      scores: { ...base, MAC: 60, NAR: 60, ANT: 0, SAD: 0 },
      counts: { ...counts, ANT: 0, SAD: 0 },
    },
  ]

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={8} align="stretch">
        <Heading size="lg">Тёмное ядро — dev-превью (Фаза 3)</Heading>
        <Text fontSize="sm" color="fg.muted">
          Приближение D-фактора из MAC/NAR/ANT/SAD. Ipsative-контекст считается из синтетического профиля (остальные
          шкалы — 35%), поэтому строка «внутри профиля» тоже живая.
        </Text>

        {scenarios.map((scenario) => {
          const scenarioCounts = scenario.counts ?? counts
          const ranking = computeIpsativeRanking(scenario.scores, scenarioCounts, { exclude: STATE_CODES })
          const index = computeDarkCore({
            normalized: scenario.scores,
            relevantCounts: scenarioCounts,
            confidence,
            ranking,
          })
          return (
            <VStack key={scenario.title} gap={2} align="stretch">
              <Text fontWeight="bold" color="fg.muted">
                {scenario.title} → structure: {index.structure}
              </Text>
              <DarkCoreBlock index={index} />
            </VStack>
          )
        })}
      </VStack>
    </Container>
  )
}
