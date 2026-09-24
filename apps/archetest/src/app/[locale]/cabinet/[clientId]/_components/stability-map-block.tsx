'use client'

import { Badge, Box, Card, Heading, HStack, Text, VStack, Wrap } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import {
  computeMoodSplit,
  computeStabilityMap,
  STABILITY_MIN_SESSIONS,
  type StabilitySession,
} from '../../../_lib/stability-map'

/**
 * Карта стабильности профиля (Фаза 3, пул 2026-09-24, волна 7.2) — только кабинет.
 * «Устойчиво» / «меняется» решают интервалы, а не разброс баллов (см. _lib/stability-map):
 * иначе шум порции из 2–3 вопросов на шкалу выглядел бы сменой состояния.
 * Ниже — разведочная разбивка «в грусти / в ресурсе» по mood check-in.
 */
export function StabilityMapBlock({ sessions }: { sessions: readonly StabilitySession[] }) {
  const t = useTranslations('cabinet.stability')
  const map = useMemo(() => computeStabilityMap(sessions), [sessions])
  const mood = useMemo(() => computeMoodSplit(sessions), [sessions])

  if (map.eligibleSessions < STABILITY_MIN_SESSIONS) {
    return null
  }

  const stable = map.scales.filter((r) => r.status === 'stable')
  const shifting = map.scales.filter((r) => r.status === 'shifting')
  const insufficient = map.scales.filter((r) => r.status === 'insufficient').length

  return (
    <Card.Root w="100%" variant="outline">
      <Card.Body>
        <HStack mb={1} gap={2}>
          <Heading size="md">{t('title')}</Heading>
          <Badge colorPalette="purple" variant="subtle">
            {t('beta')}
          </Badge>
        </HStack>
        <Text fontSize="xs" color="fg.muted" mb={4}>
          {t('intro', { sessions: map.eligibleSessions })}
        </Text>

        <VStack align="stretch" gap={4}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              {t('shifting')}
            </Text>
            {shifting.length > 0
              ? (
                <Wrap gap={2}>
                  {shifting.map((r) => (
                    <Badge key={r.code} colorPalette="orange" variant="subtle" fontFamily="mono">
                      {r.code} {r.min}–{r.max}%
                    </Badge>
                  ))}
                </Wrap>
              )
              : <Text fontSize="xs" color="fg.muted">{t('noShifting')}</Text>}
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              {t('stable')}
            </Text>
            <Wrap gap={2}>
              {stable.map((r) => (
                <Badge key={r.code} variant="outline" fontFamily="mono">
                  {r.code}
                </Badge>
              ))}
            </Wrap>
          </Box>

          {insufficient > 0 && <Text fontSize="xs" color="fg.subtle">{t('insufficient', { count: insufficient })}
          </Text>}

          <Box borderTopWidth="1px" borderColor="border" pt={3}>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              {t('moodTitle')}
            </Text>
            {!mood.available
              ? (
                <Text fontSize="xs" color="fg.muted">
                  {t('moodUnavailable', { low: mood.lowCount, high: mood.highCount })}
                </Text>
              )
              : mood.scales.length === 0
              ? <Text fontSize="xs" color="fg.muted">{t('moodNoDiff')}</Text>
              : (
                <VStack align="stretch" gap={1}>
                  <Text fontSize="xs" color="fg.muted">
                    {t('moodHint', { low: mood.lowCount, high: mood.highCount })}
                  </Text>
                  {mood.scales.map((r) => (
                    <Text key={r.code} fontSize="sm" fontFamily="mono">
                      {t('moodRow', { code: r.code, low: r.low, high: r.high })}
                    </Text>
                  ))}
                </VStack>
              )}
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
