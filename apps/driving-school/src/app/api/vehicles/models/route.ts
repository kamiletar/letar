import { prisma } from '@/lib/db'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/vehicles/models?brand=Toyota&search=cam
 * Возвращает уникальные модели автомобилей для указанной марки
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const brand = searchParams.get('brand') || ''
  const search = searchParams.get('search') || ''

  // Если марка не указана, возвращаем пустой массив
  if (!brand) {
    return NextResponse.json([])
  }

  const vehicles = await prisma.instructorVehicle.findMany({
    where: {
      isActive: true,
      instructorProfile: {
        isPublic: true,
      },
      brand: {
        equals: brand,
        mode: 'insensitive',
      },
      ...(search && {
        model: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    },
    select: {
      model: true,
    },
    distinct: ['model'],
    orderBy: {
      model: 'asc',
    },
    take: 20,
  })

  // Возвращаем массив объектов с id и label для FieldCombobox
  const models = vehicles.map((v) => ({
    id: v.model,
    label: v.model,
  }))

  return NextResponse.json(models)
}
