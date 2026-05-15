import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/roles'
import { VenueForm } from '../_components/venue-form'

/** Новая площадка — предвыбор города для организатора */
export default async function NewVenuePage() {
  const user = await requireAdmin()

  // Города организатора
  const organizerCities = await prisma.cityOrganizer.findMany({
    where: { userId: user.id },
    select: { cityId: true },
  })

  const isFullAdmin = user.roles.includes('ADMIN')
  // Предвыбор если организатор одного города
  const defaultCityId = !isFullAdmin && organizerCities.length === 1 ? organizerCities[0].cityId : undefined

  return <VenueForm defaultCityId={defaultCityId} />
}
