/**
 * Детальная страница стадиона
 */

import { prisma } from '@/lib/db'
import { formatDateNumeric } from '@/lib/format-date'
import { Badge, Box, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { YandexMap } from '../_components/yandex-map'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: { name: true, city: { select: { name: true } } },
  })
  if (!venue) {
    return { title: 'Стадион не найден' }
  }
  return {
    title: venue.name,
    description: `Поэтический стадион ${venue.name}, ${venue.city.name}`,
    alternates: { canonical: `/venues/${slug}` },
  }
}

export default async function VenueDetailPage({ params }: { params: Params }) {
  const { slug } = await params

  const venue = await prisma.venue.findUnique({
    where: { slug },
    include: {
      city: { select: { name: true } },
      teams: { select: { name: true, slug: true } },
      matches: {
        where: { status: 'FINISHED' },
        include: {
          homeTeam: { include: { team: { select: { name: true } } } },
          awayTeam: { include: { team: { select: { name: true } } } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!venue) {
    notFound()
  }

  const hasCoords = venue.latitude !== null && venue.longitude !== null

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <Box>
        <Heading as="h1" size="xl">
          {venue.name}
        </Heading>
        <Text color="fg.muted" mt={1}>
          {venue.city.name}
          {venue.address && ` · ${venue.address}`}
        </Text>
      </Box>

      {/* Описание */}
      {venue.description && (
        <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
          <Text whiteSpace="pre-wrap">{venue.description}</Text>
        </Box>
      )}

      {/* Ссылки */}
      {venue.telegramLink && (
        <Flex gap={2}>
          <Badge colorPalette="blue" size="sm">
            <a href={venue.telegramLink} target="_blank" rel="noopener noreferrer">
              Telegram
            </a>
          </Badge>
        </Flex>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
        {/* Карта */}
        {hasCoords && (
          <YandexMap
            center={[venue.latitude!, venue.longitude!]}
            zoom={16}
            markers={[
              {
                id: venue.id,
                coordinates: [venue.latitude!, venue.longitude!],
                title: venue.name,
              },
            ]}
            height="300px"
          />
        )}

        {/* Домашние команды */}
        <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
          <Heading size="md" mb={3}>
            Домашние команды
          </Heading>
          {venue.teams.length === 0
            ? <Text color="fg.muted">Нет домашних команд</Text>
            : (
              <VStack gap={2} align="stretch">
                {venue.teams.map((team) => (
                  <Link key={team.slug} href={`/teams/${team.slug}`}>
                    <Text fontWeight="medium" _hover={{ textDecoration: 'underline', color: 'brand.fg' }}>
                      {team.name}
                    </Text>
                  </Link>
                ))}
              </VStack>
            )}
        </Box>
      </SimpleGrid>

      {/* Последние матчи на этом стадионе */}
      {venue.matches.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Последние матчи
          </Heading>
          <VStack gap={2} align="stretch">
            {venue.matches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <Flex
                  bg="bg.panel"
                  borderRadius="lg"
                  p={3}
                  borderWidth="1px"
                  borderColor="border.muted"
                  justify="space-between"
                  align="center"
                  _hover={{ borderColor: 'border.emphasized' }}
                  transitionProperty="border-color"
                  transitionDuration="0.15s"
                >
                  <Flex gap={2} align="center">
                    <Text fontWeight="medium">{match.homeTeam.team.name}</Text>
                    <Text fontWeight="bold" fontVariantNumeric="tabular-nums">
                      {match.homeScore} : {match.awayScore}
                    </Text>
                    <Text fontWeight="medium">{match.awayTeam.team.name}</Text>
                  </Flex>
                  {match.scheduledAt && (
                    <Text fontSize="sm" color="fg.muted">
                      {formatDateNumeric(match.scheduledAt)}
                    </Text>
                  )}
                </Flex>
              </Link>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}
