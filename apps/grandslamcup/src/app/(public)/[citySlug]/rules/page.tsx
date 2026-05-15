/**
 * Страница правил города — рендерит MDX-контент в зависимости от citySlug.
 * Layout уже валидирует город через getCityBySlug().
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getCities, getCityBySlug } from '@/lib/city'

type Params = Promise<{ citySlug: string }>

/** Маппинг slug → динамический импорт MDX */
const contentMap: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  moskva: () => import('./_content/moskva.mdx'),
  spb: () => import('./_content/spb.mdx'),
}

export async function generateStaticParams() {
  const cities = await getCities()
  return cities.filter((city) => city.slug in contentMap).map((city) => ({ citySlug: city.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return {}
  }

  return {
    title: `Правила — ${city.name}`,
    description: `Правила и регламент Кубка Большого Слэма. ${city.name}.`,
    alternates: { canonical: `/${citySlug}/rules` },
  }
}

export default async function CityRulesPage({ params }: { params: Params }) {
  const { citySlug } = await params
  const loader = contentMap[citySlug]

  if (!loader) {
    notFound()
  }

  const { default: Content } = await loader()
  return <Content />
}
