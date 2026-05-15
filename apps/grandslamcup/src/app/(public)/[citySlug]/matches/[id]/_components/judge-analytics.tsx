/**
 * Статистика судейства — аналитика после матча.
 * Показывает per-judge stats и самые спорные выступления.
 * Server Component.
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { SectionHeading } from '@/app/_components/section-heading'
import { Badge, Box, Grid, HStack, Text, VStack } from '@chakra-ui/react'

import { computeJudgeAnalytics } from '../_lib/compute-judge-analytics'

interface JudgeAnalyticsProps {
  matchId: string
}

export async function JudgeAnalytics({ matchId }: JudgeAnalyticsProps) {
  const analytics = await computeJudgeAnalytics(matchId)
  if (!analytics || analytics.judges.length === 0) {
    return null
  }

  // Группировка по таймам
  const half1 = analytics.judges.filter((j) => j.half === 1)
  const half2 = analytics.judges.filter((j) => j.half === 2)

  return (
    <VStack gap={4} align="stretch">
      <SectionHeading>Статистика судейства</SectionHeading>

      {half1.length > 0 && <JudgeTable judges={half1} label="1 тайм" />}
      {half2.length > 0 && <JudgeTable judges={half2} label="2 тайм" />}

      {/* Спорные выступления */}
      {analytics.controversial.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2} color="fg.muted">
            Спорные выступления
          </Text>
          <VStack gap={1} align="stretch">
            {analytics.controversial.map((c, i) => (
              <HStack key={i} gap={2} px={3} py={1.5} bg="bg.subtle" borderRadius="md" fontSize="sm">
                <Text fontWeight="medium">{c.playerName}</Text>
                <Badge size="sm" variant="subtle">
                  {c.dimension === 'TEXT' ? 'Текст' : 'Подача'}
                </Badge>
                <Text color="fg.muted">
                  {c.minScore}—{c.maxScore}
                </Text>
                <Badge colorPalette="orange" size="sm">
                  разброс {c.spread}
                </Badge>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}

/** Таблица статистики судей одного тайма */
function JudgeTable({
  judges,
  label,
}: {
  judges: Array<{
    name: string
    judgeNumber: number
    voteCount: number
    avgScore: number
    minScore: number
    maxScore: number
    stdDev: number
    deviationPct: number
    isOutlier: boolean
  }>
  label: string
}) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="bold" mb={2} color="fg.muted">
        {label}
      </Text>
      <DataTableWrapper>
        <Grid templateColumns="1fr 60px 50px 50px 60px 70px" gap={0} fontSize="sm" minW="400px">
          {['Судья', 'Ср. балл', 'Мин', 'Макс', 'σ', 'Откл.'].map((h) => (
            <Box
              key={h}
              px={3}
              py={2}
              fontWeight="bold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wide"
              bg={{ base: 'gray.100', _dark: 'brand.950' }}
              color={{ base: 'fg.muted', _dark: 'gray.300' }}
              borderBottomWidth="2px"
              borderBottomColor="brand.solid"
            >
              {h}
            </Box>
          ))}
          {judges.map((j, i) => (
            <Box key={`${j.judgeNumber}`} display="contents">
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                <HStack gap={1}>
                  <Text fontWeight="medium">
                    #{j.judgeNumber} {j.name}
                  </Text>
                  {j.isOutlier && (
                    <Badge colorPalette="orange" size="sm" variant="subtle">
                      !
                    </Badge>
                  )}
                </HStack>
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontWeight="bold"
                fontFamily="mono"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {j.avgScore}
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontFamily="mono"
                color="fg.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {j.minScore}
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontFamily="mono"
                color="fg.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {j.maxScore}
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontFamily="mono"
                color={j.stdDev < 0.3 || j.stdDev > 1.5 ? 'orange.fg' : 'fg.muted'}
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {j.stdDev}
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontFamily="mono"
                color={Math.abs(j.deviationPct) > 30 ? 'red.fg' : 'fg.muted'}
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {j.deviationPct > 0 ? '+' : ''}
                {j.deviationPct}%
              </Box>
            </Box>
          ))}
        </Grid>
      </DataTableWrapper>
    </Box>
  )
}
