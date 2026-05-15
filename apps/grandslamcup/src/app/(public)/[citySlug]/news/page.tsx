/**
 * Новостная лента города — публичная страница
 */

import { NewsContent } from '@/app/_components/news-content'
import { getCities, getCityBySlug } from '@/lib/city'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Params = Promise<{ citySlug: string }>

export async function generateStaticParams() {
  const cities = await getCities()
  return cities.map((city) => ({ citySlug: city.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Новости' }
  }
  return {
    title: `Новости — ${city.name}`,
    description: `Обзоры матчей, новости и события Кубка Большого Слэма в городе ${city.name}`,
    alternates: { canonical: `/${citySlug}/news` },
  }
}

export default async function CityNewsPage({ params }: { params: Params }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  return <NewsContent citySlug={citySlug} cityId={city.id} cityName={city.name} />
}
