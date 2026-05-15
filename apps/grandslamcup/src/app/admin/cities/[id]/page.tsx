import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { CityForm } from '../_components/city-form'

export default async function EditCityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const city = await prisma.city.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, telegramChatId: true },
  })

  if (!city) {
    notFound()
  }

  return <CityForm city={city} />
}
