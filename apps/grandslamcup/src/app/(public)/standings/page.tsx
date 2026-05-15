/**
 * Турнирная таблица (глобальная — все города)
 */

import { StandingsContent } from '@/app/_components/standings/standings-content'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Таблица',
  description: 'Турнирная таблица Кубка Большого Слэма',
  alternates: { canonical: '/standings' },
}

type SearchParams = Promise<{ season?: string; view?: string }>

export default async function StandingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { season: seasonSlug, view } = await searchParams
  return <StandingsContent seasonSlug={seasonSlug} view={view === 'cross' ? 'cross' : 'table'} />
}
