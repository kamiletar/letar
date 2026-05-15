/**
 * Страница стадионов — список + карта
 */

import { prisma } from '@/lib/db'
import { Heading, SimpleGrid, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

import { VenueCard } from './_components/venue-card'
import { type MapMarker, YandexMap } from './_components/yandex-map'

export const metadata: Metadata = {
  title: 'Стадионы',
  description: 'Площадки поэтических баттлов Кубка Большого Слэма',
  alternates: { canonical: '/venues' },
}

export default async function VenuesPage() {
  const venues = await prisma.venue.findMany({
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
      href: `/venues/${v.slug}`,
    }))

  // Центр карты — Санкт-Петербург по умолчанию
  const defaultCenter: [number, number] =
    markers.length > 0
      ? [
          markers.reduce((sum, m) => sum + m.coordinates[0], 0) / markers.length,
          markers.reduce((sum, m) => sum + m.coordinates[1], 0) / markers.length,
        ]
      : [59.9343, 30.3351] // Санкт-Петербург

  return (
    <VStack gap={6} align="stretch">
      <Heading as="h1" size="xl">
        Стадионы
      </Heading>

      {/* Карта */}
      {markers.length > 0 && (
        <YandexMap center={defaultCenter} zoom={markers.length === 1 ? 15 : 11} markers={markers} height="350px" />
      )}

      {/* Карточки */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
        {venues.map((venue) => (
          <VenueCard
            key={venue.id}
            slug={venue.slug}
            name={venue.name}
            cityName={venue.city.name}
            address={venue.address}
            teamNames={venue.teams.map((t) => t.name)}
          />
        ))}
      </SimpleGrid>
    </VStack>
  )
}
