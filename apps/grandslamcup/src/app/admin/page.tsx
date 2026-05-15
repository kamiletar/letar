import { prisma } from '@/lib/db'
import { Box, Grid, Heading, Text, VStack } from '@chakra-ui/react'

/** Карточка статистики */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Box bg="bg.panel" p={5} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
      <Text fontSize="sm" color="fg.muted" mb={1}>
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
    </Box>
  )
}

export default async function AdminDashboardPage() {
  // Параллельные запросы для статистики
  const [citiesCount, venuesCount, seasonsCount, teamsCount, playersCount, matchesCount] = await Promise.all([
    prisma.city.count(),
    prisma.venue.count(),
    prisma.season.count(),
    prisma.team.count(),
    prisma.player.count(),
    prisma.match.count(),
  ])

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">Дашборд</Heading>

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }} gap={4}>
        <StatCard label="Города" value={citiesCount} />
        <StatCard label="Площадки" value={venuesCount} />
        <StatCard label="Сезоны" value={seasonsCount} />
        <StatCard label="Команды" value={teamsCount} />
        <StatCard label="Поэты" value={playersCount} />
        <StatCard label="Матчи" value={matchesCount} />
      </Grid>
    </VStack>
  )
}
