/**
 * Список счетоводов — пользователи, назначенные счетоводами на матчи.
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
import { LuCalendar, LuClipboardList } from 'react-icons/lu'

type Params = Promise<{ citySlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Город не найден' }
  }
  return {
    title: `Счетоводы — ${city.name}`,
    description: `Счетоводы матчей Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/scorers` },
  }
}

export default async function ScorersPage({ params }: { params: Params }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  // Загружаем матчи с назначенными счетоводами для этого города
  const matches = await prisma.match.findMany({
    where: {
      scorerUserId: { not: null },
      OR: [{ homeTeam: { team: { cityId: city.id } } }, { awayTeam: { team: { cityId: city.id } } }],
    },
    orderBy: { scheduledAt: 'desc' },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      scorerUser: { select: { id: true, name: true, image: true } },
      ...MATCH_TEAMS_NAME,
    },
  })

  // Группируем по счетоводу
  const scorerMap = new Map<string, { name: string; image: string | null; matches: typeof matches }>()
  for (const m of matches) {
    if (!m.scorerUser) {
      continue
    }
    const key = m.scorerUser.id
    if (!scorerMap.has(key)) {
      scorerMap.set(key, { name: m.scorerUser.name ?? 'Без имени', image: m.scorerUser.image, matches: [] })
    }
    scorerMap.get(key)!.matches.push(m)
  }

  const scorers = [...scorerMap.entries()]
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.matches.length - a.matches.length)

  return (
    <VStack gap={8} align="stretch">
      <Flex justify="space-between" align="center">
        <SectionHeading>Счетоводы</SectionHeading>
        <Text fontSize="sm" color="fg.muted">
          {scorers.length} счетоводов
        </Text>
      </Flex>

      {scorers.length > 0 ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {scorers.map((s) => (
            <Box
              key={s.id}
              borderRadius="xl"
              borderWidth="1px"
              borderColor="border"
              bg="bg.panel"
              overflow="hidden"
              p={5}
            >
              <Flex gap={3} align="center" mb={4}>
                <Circle size={12} bg="blue.subtle" color="blue.solid">
                  <LuClipboardList size={24} />
                </Circle>
                <VStack gap={0} align="start">
                  <Text fontWeight="bold" fontSize="lg">
                    {s.name}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {s.matches.length} {s.matches.length === 1 ? 'матч' : s.matches.length < 5 ? 'матча' : 'матчей'}
                  </Text>
                </VStack>
              </Flex>

              {/* История матчей */}
              <VStack gap={2} align="stretch">
                {s.matches.slice(0, 5).map((m) => (
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
                {s.matches.length > 5 && (
                  <Text fontSize="xs" color="fg.muted" textAlign="center">
                    и ещё {s.matches.length - 5}...
                  </Text>
                )}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <VStack py={16} textAlign="center" gap={4}>
          <Circle size={20} bg="blue.50" _dark={{ bg: 'blue.950' }}>
            <LuClipboardList size={40} color="var(--chakra-colors-blue-solid)" />
          </Circle>
          <Heading size="md" color="fg.muted">
            Счетоводы пока не назначены
          </Heading>
          <Text fontSize="sm" color="fg.subtle">
            Счетоводы появятся после назначения на матчи
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
