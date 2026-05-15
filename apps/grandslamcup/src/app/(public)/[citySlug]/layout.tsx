/**
 * Layout для страниц города — валидация slug, CityProvider.
 */

import { getCities, getCityBySlug } from '@/lib/city'
import { notFound } from 'next/navigation'

import { CityProvider } from './_components/city-provider'

type Params = Promise<{ citySlug: string }>

export async function generateStaticParams() {
  const cities = await getCities()
  return cities.map((city) => ({ citySlug: city.slug }))
}

export default async function CityLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)

  if (!city) {
    notFound()
  }

  return (
    <CityProvider
      value={{ cityId: city.id, citySlug: city.slug, cityName: city.name, telegramLink: city.telegramLink }}
    >
      {children}
    </CityProvider>
  )
}
