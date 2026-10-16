'use client'

import { Container, Heading, Text } from '@chakra-ui/react'
import { PrintButton } from '../../_components/print-button'
import { ResultReport } from '../../_components/result-report'
import { ALL_SCALE_CODES } from '../../_data/personality-types'
import type { ScaleConfidence } from '../../_lib/scoring-core'

/** Искусственные данные для проверки PDF; общий dev/layout закрывает маршрут в production. */
export default function ReportPreviewPage() {
  const scores = Object.fromEntries(ALL_SCALE_CODES.map((code, i) => [code, (i * 7) % 101]))
  const counts = Object.fromEntries(ALL_SCALE_CODES.map((code) => [code, 8]))
  counts.HYI = 0
  scores.INA = 0
  const confidence = Object.fromEntries(ALL_SCALE_CODES.map((code) => [code, 'low' as ScaleConfidence]))
  return (
    <Container py={8}>
      <Heading>PDF: демонстрационный профиль</Heading>
      <Text mb={5}>INA: честный ноль. HYI: нет данных. Остальные значения искусственные.</Text>
      <PrintButton reportId="preview-report" />
      <ResultReport
        id="preview-report"
        source="cumulative"
        subject="Демонстрационный профиль / Sample profile"
        scores={scores}
        relevantCounts={counts}
        confidence={confidence}
      />
    </Container>
  )
}
