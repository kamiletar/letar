import { prisma } from '@/lib/db'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/vehicles/brands?search=toy
 * Возвращает уникальные марки автомобилей из InstructorVehicle
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  const vehicles = await prisma.instructorVehicle.findMany({
    where: {
      isActive: true,
      instructorProfile: {
        isPublic: true,
      },
      ...(search && {
        brand: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    },
    select: {
      brand: true,
    },
    distinct: ['brand'],
    orderBy: {
      brand: 'asc',
    },
    take: 20,
  })

  // Возвращаем массив объектов с id и label для FieldCombobox
  const brands = vehicles.map((v) => ({
    id: v.brand,
    label: v.brand,
  }))

  return NextResponse.json(brands)
}
