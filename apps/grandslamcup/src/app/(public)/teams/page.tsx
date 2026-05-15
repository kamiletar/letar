/**
 * Список команд (глобальный, без фильтра по городу).
 * Визуальный стиль: карточки с hover-lift, инициал-аватар, badge лиги.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { prisma } from '@/lib/db'
import { Badge, Box, Circle, Flex, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { LuMapPin, LuUsers } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Команды',
  description: 'Команды Кубка Большого Слэма',
  alternates: { canonical: '/teams' },
}

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: {
      city: { select: { name: true } },
      homeVenue: { select: { name: true } },
      teamSeasons: {
        include: {
          league: { select: { name: true } },
          season: { select: { name: true, status: true } },
        },
        orderBy: { season: { startDate: 'desc' } },
        take: 1,
      },
    },
  })

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center">
        <SectionHeading>Команды</SectionHeading>
        <Text fontSize="sm" color="fg.muted">
          {teams.length} команд
        </Text>
      </Flex>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
        {teams.map((team) => {
          const currentSeason = team.teamSeasons[0]
          const initial = team.name.charAt(0).toUpperCase()

          return (
            <Link key={team.id} href={`/teams/${team.slug}`}>
              <Box
                p={5}
                borderRadius="xl"
                borderWidth="1px"
                borderColor="border"
                bg="bg.panel"
                _hover={{
                  shadow: 'lg',
                  borderColor: 'border.emphasized',
                  transform: 'translateY(-2px)',
                }}
                transition="all 0.2s ease"
                h="full"
                position="relative"
                overflow="hidden"
              >
                {/* Декоративная полоска сверху */}
                <Box position="absolute" top={0} left={0} right={0} h="3px" bg="brand.solid" opacity={0.6} />

                <VStack gap={3} align="start">
                  <HStack gap={3} align="center">
                    {team.logo ? (
                      <Box w={10} h={10} borderRadius="lg" overflow="hidden" flexShrink={0} position="relative">
                        <Image
                          src={`/api/files/${team.logo}`}
                          alt={team.name}
                          fill
                          sizes="40px"
                          style={{ objectFit: 'cover' }}
                        />
                      </Box>
                    ) : (
                      <Circle
                        size={10}
                        bg="brand.subtle"
                        color="brand.solid"
                        fontWeight="bold"
                        fontSize="lg"
                        flexShrink={0}
                      >
                        {initial}
                      </Circle>
                    )}
                    <VStack gap={0} align="start">
                      <Heading size="md" lineClamp={1}>
                        {team.name}
                      </Heading>
                      {team.city && (
                        <Text fontSize="xs" color="fg.muted">
                          {team.city.name}
                        </Text>
                      )}
                    </VStack>
                  </HStack>

                  {team.homeVenue && (
                    <HStack gap={1.5} color="fg.muted" fontSize="sm">
                      <LuMapPin size={14} />
                      <Text lineClamp={1}>{team.homeVenue.name}</Text>
                    </HStack>
                  )}

                  {currentSeason && (
                    <Flex gap={2} align="center" wrap="wrap">
                      <Badge colorPalette="blue" size="sm" variant="subtle">
                        {currentSeason.league.name}
                      </Badge>
                    </Flex>
                  )}
                </VStack>
              </Box>
            </Link>
          )
        })}
      </SimpleGrid>

      {teams.length === 0 && (
        <VStack py={16} textAlign="center" gap={4} className="fade-in-up">
          <Circle size={20} bg="brand.50" _dark={{ bg: 'brand.950' }}>
            <LuUsers size={40} color="var(--chakra-colors-brand-solid)" />
          </Circle>
          <Heading size="md" color="fg.muted">
            Команды пока не добавлены
          </Heading>
          <Text fontSize="sm" color="fg.subtle">
            Регистрация команд скоро откроется
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
