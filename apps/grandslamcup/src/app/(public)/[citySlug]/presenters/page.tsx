/**
 * Список ведущих — пользователи, назначенные ведущими на матчи.
 * Группировка по пользователю с историей матчей.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { Badge, Box, Circle, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuCalendar, LuMic } from 'react-icons/lu'

type Params = Promise<{ citySlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Город не найден' }
  }
  return {
    title: `Ведущие — ${city.name}`,
    description: `Ведущие матчей Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/presenters` },
  }
}

export default async function PresentersPage({ params }: { params: Params }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  // Загружаем матчи с назначенными ведущими для этого города
  const matches = await prisma.match.findMany({
    where: {
      presenterUserId: { not: null },
      OR: [{ homeTeam: { team: { cityId: city.id } } }, { awayTeam: { team: { cityId: city.id } } }],
    },
    orderBy: { scheduledAt: 'desc' },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      presenterUser: { select: { id: true, name: true, image: true } },
      ...MATCH_TEAMS_NAME,
    },
  })

  // Группируем по ведущему
  const presenterMap = new Map<string, { name: string; image: string | null; matches: typeof matches }>()
  for (const m of matches) {
    if (!m.presenterUser) {
      continue
    }
    const key = m.presenterUser.id
    if (!presenterMap.has(key)) {
      presenterMap.set(key, { name: m.presenterUser.name ?? 'Без имени', image: m.presenterUser.image, matches: [] })
    }
    presenterMap.get(key)!.matches.push(m)
  }

  const presenters = [...presenterMap.entries()]
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.matches.length - a.matches.length)

  return (
    <VStack gap={8} align="stretch">
      <Flex justify="space-between" align="center">
        <SectionHeading>Ведущие</SectionHeading>
        <Text fontSize="sm" color="fg.muted">
          {presenters.length} ведущих
        </Text>
      </Flex>

      {presenters.length > 0 ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {presenters.map((p) => (
            <Box
              key={p.id}
              borderRadius="xl"
              borderWidth="1px"
              borderColor="border"
              bg="bg.panel"
              overflow="hidden"
              p={5}
            >
              <Flex gap={3} align="center" mb={4}>
                <Circle size={12} bg="purple.subtle" color="purple.solid">
                  <LuMic size={24} />
                </Circle>
                <VStack gap={0} align="start">
                  <Text fontWeight="bold" fontSize="lg">
                    {p.name}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {p.matches.length} {p.matches.length === 1 ? 'матч' : p.matches.length < 5 ? 'матча' : 'матчей'}
                  </Text>
                </VStack>
              </Flex>

              {/* История матчей */}
              <VStack gap={2} align="stretch">
                {p.matches.slice(0, 5).map((m) => (
                  <Link key={m.id} href={`/${citySlug}/matches/${m.id}`}>
                    <Flex
                      gap={2}
                      align="center"
                      fontSize="sm"
                      py={1}
                      px={2}
                      borderRadius="md"
                      _hover={{ bg: 'bg.subtle' }}
                    >
                      <LuCalendar size={14} />
                      <Text fontWeight="medium">
                        {m.homeTeam.team.name} — {m.awayTeam.team.name}
                      </Text>
                      {m.scheduledAt && (
                        <Text color="fg.muted" fontSize="xs" ml="auto">
                          {new Date(m.scheduledAt).toLocaleDateString('ru-RU')}
                        </Text>
                      )}
                      <Badge size="sm" colorPalette={m.status === 'FINISHED' ? 'gray' : 'blue'}>
                        {m.status === 'FINISHED' ? 'Завершён' : 'Запланирован'}
                      </Badge>
                    </Flex>
                  </Link>
                ))}
                {p.matches.length > 5 && (
                  <Text fontSize="xs" color="fg.muted" textAlign="center">
                    и ещё {p.matches.length - 5}...
                  </Text>
                )}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <VStack py={16} textAlign="center" gap={4}>
          <Circle size={20} bg="purple.50" _dark={{ bg: 'purple.950' }}>
            <LuMic size={40} color="var(--chakra-colors-purple-solid)" />
          </Circle>
          <Heading size="md" color="fg.muted">
            Ведущие пока не назначены
          </Heading>
          <Text fontSize="sm" color="fg.subtle">
            Ведущие появятся после назначения на матчи
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
