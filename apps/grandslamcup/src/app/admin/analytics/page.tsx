/**
 * Аналитика судейства — статистика по судьям за сезон
 *
 * Средний балл, щедрость, частота повторений, разброс оценок.
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { prisma } from '@/lib/db'
import { Badge, Box, Grid, Heading, Text, VStack } from '@chakra-ui/react'

export default async function AnalyticsPage() {
  // Все голоса судей с именами
  const votes = await prisma.judgeVote.findMany({
    include: {
      judgeSession: { select: { name: true, matchId: true, fingerprint: true } },
    },
  })

  // Все сессии для подсчёта повторов
  const sessions = await prisma.judgeSession.findMany({
    select: { name: true, matchId: true, fingerprint: true, half: true },
  })

  // Группируем по имени судьи
  const byJudge = new Map<string, { scores: number[]; matches: Set<string>; fingerprints: Set<string> }>()

  for (const vote of votes) {
    const name = vote.judgeSession.name.toLowerCase().trim()
    const entry = byJudge.get(name) ?? { scores: [], matches: new Set(), fingerprints: new Set() }
    entry.scores.push(vote.score)
    entry.matches.add(vote.judgeSession.matchId)
    if (vote.judgeSession.fingerprint) {
      entry.fingerprints.add(vote.judgeSession.fingerprint)
    }
    byJudge.set(name, entry)
  }

  // Подсчёт повторов fingerprint
  const fingerprintMatches = new Map<string, Set<string>>()
  for (const session of sessions) {
    if (session.fingerprint) {
      const matches = fingerprintMatches.get(session.fingerprint) ?? new Set()
      matches.add(session.matchId)
      fingerprintMatches.set(session.fingerprint, matches)
    }
  }
  const duplicateFingerprints = [...fingerprintMatches.entries()]
    .filter(([, matches]) => matches.size > 1)
    .map(([fp, matches]) => {
      // Найти имена для этого fingerprint
      const names = sessions.filter((s) => s.fingerprint === fp).map((s) => s.name)
      return { fingerprint: fp.slice(0, 8), names: [...new Set(names)], matchCount: matches.size }
    })

  // Статистика по судьям
  const judgeStats = [...byJudge.entries()]
    .map(([name, data]) => {
      const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length
      const variance = data.scores.reduce((s, v) => s + (v - avg) ** 2, 0) / data.scores.length
      const stdDev = Math.sqrt(variance)
      return {
        name,
        avgScore: Math.round(avg * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        votesCount: data.scores.length,
        matchesCount: data.matches.size,
      }
    })
    .sort((a, b) => b.matchesCount - a.matchesCount)

  // Общая статистика
  const allScores = votes.map((v) => v.score)
  const overallAvg = allScores.length > 0
    ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 100) / 100
    : 0

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">Аналитика судейства</Heading>

      {/* Общая статистика */}
      <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
        <Box display="flex" gap={6} flexWrap="wrap">
          <StatBox label="Всего голосов" value={allScores.length} />
          <StatBox label="Средний балл" value={overallAvg} />
          <StatBox label="Уникальных судей" value={byJudge.size} />
          <StatBox label="Подозрительных устройств" value={duplicateFingerprints.length} />
        </Box>
      </Box>

      {/* Подозрительные fingerprint'ы */}
      {duplicateFingerprints.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Повторные устройства
          </Heading>
          <VStack gap={2} align="stretch">
            {duplicateFingerprints.map((d) => (
              <Box
                key={d.fingerprint}
                bg="red.subtle"
                borderRadius="lg"
                p={3}
                borderWidth="1px"
                borderColor="red.muted"
              >
                <Text fontSize="sm" fontWeight="semibold">
                  Устройство ...{d.fingerprint} — {d.matchCount} матчей
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Имена: {d.names.join(', ')}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Таблица судей */}
      <Box>
        <Heading size="md" mb={3}>
          Статистика судей ({judgeStats.length})
        </Heading>
        <DataTableWrapper>
          <Grid
            templateColumns={{ base: '1fr 50px 50px 44px 44px', md: '1fr 64px 64px 56px 56px' }}
            gap={0}
            fontSize="sm"
          >
            {['Судья', 'Средн.', 'Разброс', 'Голос.', 'Матч.'].map((h) => (
              <Box key={h} px={3} py={2} fontWeight="bold" bg="bg.subtle" borderBottomWidth="1px">
                {h}
              </Box>
            ))}
            {judgeStats.map((j) => (
              <Box key={j.name} display="contents">
                <Box px={3} py={2} borderBottomWidth="1px" textTransform="capitalize">
                  {j.name}
                </Box>
                <Box px={3} py={2} borderBottomWidth="1px" textAlign="center">
                  <Badge colorPalette={j.avgScore >= 4 ? 'green' : j.avgScore >= 3 ? 'yellow' : 'red'} size="sm">
                    {j.avgScore}
                  </Badge>
                </Box>
                <Box px={3} py={2} borderBottomWidth="1px" textAlign="center" fontSize="xs">
                  {j.stdDev}
                </Box>
                <Box px={3} py={2} borderBottomWidth="1px" textAlign="center">
                  {j.votesCount}
                </Box>
                <Box px={3} py={2} borderBottomWidth="1px" textAlign="center">
                  {j.matchesCount}
                </Box>
              </Box>
            ))}
          </Grid>
        </DataTableWrapper>
      </Box>
    </VStack>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <VStack gap={0}>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="semibold">
        {value}
      </Text>
    </VStack>
  )
}
