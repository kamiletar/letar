/**
 * Турнирная таблица — фильтрация по городу
 */

import { StandingsContent } from '@/app/_components/standings/standings-content'
import { getCityBySlug } from '@/lib/city'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Params = Promise<{ citySlug: string }>
type SearchParams = Promise<{ season?: string; view?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  return {
    title: city ? `Таблица — ${city.name}` : 'Таблица',
    description: city ? `Турнирная таблица Кубка Большого Слэма в ${city.name}` : undefined,
    alternates: { canonical: `/${citySlug}/standings` },
  }
}

export default async function CityStandingsPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { citySlug } = await params
  const { season: seasonSlug, view } = await searchParams
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  return (
    <StandingsContent
      citySlug={citySlug}
      cityId={city.id}
      seasonSlug={seasonSlug}
      view={view === 'cross' ? 'cross' : 'table'}
    />
  )
}
