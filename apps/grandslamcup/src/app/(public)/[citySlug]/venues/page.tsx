/**
 * Страница стадионов — список с поиском + карта внизу (город-фильтр)
 */

import { SearchInput } from '@/app/_components/search-input'
import { SectionHeading } from '@/app/_components/section-heading'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { Flex, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { VenueCard } from './_components/venue-card'
import { YandexMap, type MapMarker } from './_components/yandex-map'

type Params = Promise<{ citySlug: string }>
type SearchParams = Promise<{ q?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Город не найден' }
  }
  return {
    title: `Стадионы — ${city.name}`,
    description: `Площадки поэтических баттлов Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/venues` },
  }
}

export default async function VenuesPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { citySlug } = await params
  const { q } = await searchParams
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const venues = await prisma.venue.findMany({
    where: {
      cityId: city.id,
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    include: {
      city: { select: { name: true } },
      teams: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  // Маркеры для карты (только с координатами)
  const markers: MapMarker[] = venues
    .filter((v) => v.latitude !== null && v.longitude !== null)
    .map((v) => ({
      id: v.id,
      coordinates: [v.latitude!, v.longitude!],
      title: v.name,
      description: v.address ?? undefined,
      href: `/${citySlug}/venues/${v.slug}`,
    }))

  const defaultCenter: [number, number] =
    markers.length > 0
      ? [
          markers.reduce((sum, m) => sum + m.coordinates[0], 0) / markers.length,
          markers.reduce((sum, m) => sum + m.coordinates[1], 0) / markers.length,
        ]
      : [59.9343, 30.3351]

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <SectionHeading>Стадионы</SectionHeading>
        <Flex align="center" gap={3}>
          <Suspense>
            <SearchInput placeholder="Поиск стадиона..." basePath={`/${citySlug}/venues`} />
          </Suspense>
          <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
            {venues.length}
          </Text>
        </Flex>
      </Flex>

      {/* Карточки */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
        {venues.map((venue) => (
          <VenueCard
            key={venue.id}
            slug={venue.slug}
            name={venue.name}
            cityName={venue.city.name}
            address={venue.address}
            photo={venue.photo}
            teamNames={venue.teams.map((t) => t.name)}
            citySlug={citySlug}
          />
        ))}
      </SimpleGrid>

      {/* Карта — внизу */}
      {markers.length > 0 && (
        <YandexMap center={defaultCenter} zoom={markers.length === 1 ? 15 : 11} markers={markers} height="400px" />
      )}
    </VStack>
  )
}
