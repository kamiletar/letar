/**
 * Детальная страница стадиона — hero с фото, домашние команды, матчи, карта.
 */

import { MatchCard } from '@/app/_components/match-card'
import { SectionHeading } from '@/app/_components/section-heading'
import { parseSocialLinks, SocialLinks } from '@/app/_components/social-links'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { Box, Circle, Flex, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuExternalLink, LuMapPin, LuUsers } from 'react-icons/lu'

import { YandexMap } from '../_components/yandex-map'

type Params = Promise<{ citySlug: string; slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug, slug } = await params
  const city = await getCityBySlug(citySlug)
  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: { name: true, city: { select: { name: true } } },
  })
  if (!venue || !city) {
    return { title: 'Стадион не найден' }
  }
  return {
    title: `${venue.name} — ${city.name}`,
    description: `Поэтический стадион ${venue.name}, ${venue.city.name}`,
    alternates: { canonical: `/${citySlug}/venues/${slug}` },
  }
}

export default async function VenueDetailPage({ params }: { params: Params }) {
  const { citySlug, slug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const venue = await prisma.venue.findUnique({
    where: { slug, cityId: city.id },
    include: {
      city: { select: { name: true } },
      teams: { select: { name: true, slug: true } },
      matches: {
        where: { status: 'FINISHED' },
        include: {
          homeTeam: { include: { team: { select: { name: true } } } },
          awayTeam: { include: { team: { select: { name: true } } } },
          venue: { select: { name: true } },
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
  /** Ссылка на Яндекс.Карты по адресу */
  const yandexMapsUrl = venue.address
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(`${venue.address}, ${venue.city.name}`)}`
    : null

  return (
    <VStack gap={8} align="stretch">
      {/* Hero-блок с фото */}
      <Box borderRadius="2xl" overflow="hidden" position="relative">
        {/* Фото или gradient placeholder */}
        <Box position="relative" w="full" h={{ base: '200px', md: '300px' }}>
          {venue.photo
            ? (
              <Image
                src={venue.photo.startsWith('http') ? venue.photo : `/api/files/${venue.photo}`}
                alt={venue.name}
                fill
                sizes="100vw"
                style={{ objectFit: 'cover' }}
                priority
              />
            )
            : (
              <Flex
                align="center"
                justify="center"
                h="full"
                bg="brand.950"
                bgGradient="to-br"
                gradientFrom="brand.950"
                gradientTo="brand.900"
              >
                <Circle size={20} bg="brand.800" color="whiteAlpha.400">
                  <LuMapPin size={40} />
                </Circle>
              </Flex>
            )}
          {/* Gradient overlay для текста */}
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            h="60%"
            bgGradient="to-t"
            gradientFrom="blackAlpha.800"
            gradientTo="transparent"
          />
          {/* Название поверх фото */}
          <VStack position="absolute" bottom={0} left={0} right={0} p={{ base: 5, md: 8 }} align="start" gap={1}>
            <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color="white">
              {venue.name}
            </Heading>
            <Text color="whiteAlpha.700" fontSize="sm">
              {venue.city.name}
            </Text>
          </VStack>
        </Box>
      </Box>

      {/* Адрес + ссылки */}
      <Flex gap={4} align="center" flexWrap="wrap">
        {venue.address
          && (yandexMapsUrl
            ? (
              <Link href={yandexMapsUrl} target="_blank" rel="noopener noreferrer">
                <HStack
                  gap={1.5}
                  color="fg.muted"
                  fontSize="sm"
                  _hover={{ color: 'brand.solid' }}
                  transition="color 0.15s"
                >
                  <LuMapPin size={16} />
                  <Text>{venue.address}</Text>
                  <LuExternalLink size={12} />
                </HStack>
              </Link>
            )
            : (
              <HStack gap={1.5} color="fg.muted" fontSize="sm">
                <LuMapPin size={16} />
                <Text>{venue.address}</Text>
              </HStack>
            ))}
        <SocialLinks socialLinks={parseSocialLinks(venue.socialLinks)} variant="full" />
      </Flex>

      {/* Описание */}
      {venue.description && (
        <Text color="fg.muted" whiteSpace="pre-wrap">
          {venue.description}
        </Text>
      )}

      {/* Домашние команды */}
      <Box>
        <SectionHeading size="md" mb={3}>
          Домашние команды
        </SectionHeading>
        {venue.teams.length === 0
          ? (
            <Text color="fg.subtle" fontSize="sm">
              Нет домашних команд
            </Text>
          )
          : (
            <HStack gap={3} flexWrap="wrap">
              {venue.teams.map((team) => (
                <Link key={team.slug} href={`/${citySlug}/teams/${team.slug}`}>
                  <HStack
                    gap={2}
                    px={4}
                    py={2}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border"
                    bg="bg.panel"
                    _hover={{ borderColor: 'brand.solid', shadow: 'sm' }}
                    transitionProperty="border-color, box-shadow"
                    transitionDuration="0.15s"
                  >
                    <LuUsers size={16} />
                    <Text fontWeight="medium" fontSize="sm">
                      {team.name}
                    </Text>
                  </HStack>
                </Link>
              ))}
            </HStack>
          )}
      </Box>

      {/* Последние матчи */}
      {venue.matches.length > 0 && (
        <Box>
          <SectionHeading size="md" mb={3}>
            Последние матчи
          </SectionHeading>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {venue.matches.map((m) => (
              <MatchCard
                key={m.id}
                id={m.id}
                homeTeamName={m.homeTeam.team.name}
                awayTeamName={m.awayTeam.team.name}
                homeScore={m.homeScore}
                awayScore={m.awayScore}
                status={m.status}
                scheduledAt={m.scheduledAt}
                venueName={null}
                citySlug={citySlug}
              />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Карта — внизу */}
      {hasCoords && (
        <Box>
          <SectionHeading size="md" mb={3}>
            На карте
          </SectionHeading>
          <Box borderRadius="xl" overflow="hidden">
            <YandexMap
              center={[venue.latitude!, venue.longitude!]}
              zoom={16}
              markers={[
                {
                  id: venue.id,
                  coordinates: [venue.latitude!, venue.longitude!],
                  title: venue.name,
                  description: venue.address ?? undefined,
                },
              ]}
              height="350px"
            />
          </Box>
        </Box>
      )}
    </VStack>
  )
}
