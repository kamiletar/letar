/**
 * Редирект на сетку активного сезона.
 *
 * Приоритет: SWISS сезон с матчами → сезон с DE bracket слотами.
 */

import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

type Params = Promise<{ citySlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  return {
    title: city ? `Сетка плей-офф — ${city.name}` : 'Сетка плей-офф',
    description: city ? `Турнирная сетка Кубка Большого Слэма в ${city.name}` : undefined,
    alternates: { canonical: `/${citySlug}/bracket` },
  }
}

export default async function BracketRedirectPage({ params }: { params: Params }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  // Сначала ищем SWISS сезон с матчами (приоритет — Swiss bracket)
  const swissSeason = await prisma.season.findFirst({
    where: {
      cityId: city.id,
      format: 'SWISS',
    },
    orderBy: { startDate: 'desc' },
    select: { slug: true },
  })

  if (swissSeason) {
    redirect(`/${citySlug}/bracket/${swissSeason.slug}`)
  }

  // Затем — сезон с DE bracket слотами
  const deSeason = await prisma.season.findFirst({
    where: {
      cityId: city.id,
      bracketSlots: { some: {} },
    },
    orderBy: { startDate: 'desc' },
    select: { slug: true },
  })

  if (deSeason) {
    redirect(`/${citySlug}/bracket/${deSeason.slug}`)
  }

  // Нет сетки
  return (
    <VStack py={12} gap={2}>
      <Heading as="h1" size="lg">
        Турнирная сетка
      </Heading>
      <Text color="fg.muted">Сетка ещё не сформирована</Text>
    </VStack>
  )
}
