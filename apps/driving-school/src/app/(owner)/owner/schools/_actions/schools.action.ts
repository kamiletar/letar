'use server'

/**
 * Server Actions для страницы школ владельца
 *
 * ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
 * Используем prisma напрямую для запросов с include
 */

import { requireOwner } from '@/lib/action-helpers'
import { prisma } from '@/lib/db'

// === Типы ===

export interface OrganizationWithStats {
  id: string
  name: string
  logo: string | null
  cities: string[]
  isPublic: boolean
  averageRating: number | null
  reviewCount: number
  createdAt: Date
  owner: { id: string; name: string | null; email: string } | null
  students: number
  instructors: number
}

export type GetOrganizationsResult =
  | { success: true; data: OrganizationWithStats[] }
  | { success: false; error: string }

// === Actions ===

/**
 * Получает список всех организаций со статистикой
 */
export async function getOrganizationsAction(): Promise<GetOrganizationsResult> {
  const authResult = await requireOwner()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    // Используем prisma напрямую

    // Параллельно: организации + подсчёт по ролям (вместо загрузки ВСЕХ members)
    const [organizations, memberCounts] = await Promise.all([
      prisma.organization.findMany({
        include: {
          // Загружаем только owner (для отображения), не всех members
          members: {
            where: { role: 'owner' },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // groupBy по org+role для подсчёта (1 запрос вместо загрузки всех members)
      prisma.member.groupBy({
        by: ['organizationId', 'role'],
        _count: true,
      }),
    ])

    // Индексируем подсчёты: orgId → { role → count }
    const countsByOrg = new Map<string, Map<string, number>>()
    for (const entry of memberCounts) {
      let roleMap = countsByOrg.get(entry.organizationId)
      if (!roleMap) {
        roleMap = new Map()
        countsByOrg.set(entry.organizationId, roleMap)
      }
      roleMap.set(entry.role, entry._count)
    }

    // Преобразуем данные
    const result: OrganizationWithStats[] = organizations.map((org) => {
      const owner = org.members[0]?.user ?? null
      const roleMap = countsByOrg.get(org.id)
      const students = roleMap?.get('member') ?? 0
      const instructors = (roleMap?.get('instructor') ?? 0) + (roleMap?.get('theory_instructor') ?? 0)

      // Парсим города из metadata
      let cities: string[] = []
      if (org.metadata) {
        try {
          const parsed = JSON.parse(org.metadata as string)
          cities = parsed.cities || []
        } catch {
          // Игнорируем ошибки парсинга
        }
      }

      return {
        id: org.id,
        name: org.name,
        logo: org.logo,
        cities,
        isPublic: org.isPublic,
        averageRating: org.averageRating,
        reviewCount: org.reviewCount,
        createdAt: org.createdAt,
        owner,
        students,
        instructors,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Ошибка получения списка организаций:', error)
    return { success: false, error: 'Ошибка загрузки данных' }
  }
}
