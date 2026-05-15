/**
 * Типы для страницы профиля инструктора
 *
 * @module instructor-profile.types
 */

import type { Prisma } from '@letar/driving-school-db/prisma'

/** Тип для инструктора с включёнными связями */
export type InstructorWithRelations = Prisma.InstructorProfileGetPayload<{
  include: {
    user: { select: { id: true; name: true; image: true; phone: true } }
    lessonTypes: { include: { pricingOptions: true } }
    vehicles: true
    reviews: {
      include: { author: { select: { id: true; name: true; image: true } } }
    }
  }
}>

/** Формирует строку с рабочими зонами */
export function formatWorkingAreas(workingAreas: unknown): string | null {
  if (!workingAreas || !Array.isArray(workingAreas) || workingAreas.length === 0) {
    return null
  }
  return (workingAreas as Array<{ cityName: string; districts: string[] }>)
    .map((area) => {
      const districts =
        area.districts.length === 1 && area.districts[0] === '*' ? 'все районы' : area.districts.join(', ')
      return `${area.cityName} (${districts})`
    })
    .join('; ')
}
